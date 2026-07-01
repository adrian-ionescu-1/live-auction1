// scripts/sim-test1.mjs
//
// End-to-end auction load simulation for the "test1" pool (152 players).
//
// Simulates 15 bidders, each targeting 10 players, bidding in concurrent bursts.
// Drives the auction entirely server-side (start_auction + auction_tick) exactly
// like the live clients do, then verifies the database against server truth:
// winners, amounts, balances, and the per-bidder target cap. Whatever can't be
// sold once every bidder is full (152 - 15*10 = 2 players) is what the admin
// hands out with "End & distribute remaining" in the room — the sim stops there
// (that button needs an admin key, which this script doesn't have).
//
// ⚠️  MUTATES DATA on the Supabase project in .env.local: it resets the auction,
//     retunes the live event (player_limit / duration), sets bidder balances, and
//     may create a few clearly-named test bidders (username prefix "simbot_") to
//     reach 15. Results are LEFT IN PLACE afterwards so they can be exported.
//
// Requires migrations applied (place_bid lock, auction_tick, custom_fields, ...).
//
// Usage (from the project root):
//   node scripts/sim-test1.mjs                 # full run: setup + simulate + verify
//   node scripts/sim-test1.mjs --bidders 15 --target 10
//   node scripts/sim-test1.mjs --duration 3    # seconds per player (keep it short)
//   node scripts/sim-test1.mjs --cleanup-bots  # delete simbot_* users, then exit
//
// Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── env ──────────────────────────────────────────────────────────────────────
function readEnv() {
  let raw = '';
  for (const f of ['.env.local', '.env']) {
    try {
      raw = readFileSync(join(ROOT, f), 'utf8');
      break;
    } catch {
      /* try next */
    }
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = readEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
// Setup (reset / retune the event / set balances / start) needs to WRITE to
// tables that RLS locks down to SECURITY DEFINER RPCs only — the anon key can
// read but its writes silently affect 0 rows. So this test needs the service
// role key (bypasses RLS). Add it to .env.local as SUPABASE_SERVICE_ROLE_KEY.
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const KEY = SERVICE_KEY || ANON_KEY;
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and a key in .env.local');
  process.exit(1);
}
if (!SERVICE_KEY) {
  console.error(
    '\n❌ No SUPABASE_SERVICE_ROLE_KEY in .env.local.\n' +
      '   RLS blocks the anon key from resetting/configuring the auction (writes\n' +
      '   silently affect 0 rows), so the simulation cannot set itself up.\n' +
      '   Add the service_role key (Supabase → Project Settings → API) as\n' +
      '   SUPABASE_SERVICE_ROLE_KEY=... to .env.local, then re-run.\n'
  );
  process.exit(1);
}
const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// ── args / config ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (n) => argv.includes('--' + n);
const flag = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const BIDDERS = Number(flag('bidders', 15));
const TARGET = Number(flag('target', 10));
const DURATION = Number(flag('duration', 3)); // seconds per player (kept short)
const INITIAL_BALANCE = Number(flag('balance', 1_000_000));
const BURST = Number(flag('burst', 8)); // parallel bids per burst
const BURST_MS = Number(flag('interval', 250));
const TICK_MS = 350;
const STALL_MS = Number(flag('stall', 25_000)); // no new sale this long => leftovers unsellable
const TIMEOUT_MS = Number(flag('timeout', 15 * 60 * 1000));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n) => Math.floor(Math.random() * n);

// ── data helpers ─────────────────────────────────────────────────────────────
const getState = async () => (await supabase.from('auction_state').select('*').limit(1).single()).data;
const liveEvent = async () => {
  const st = await getState();
  if (!st?.event_id) return null;
  const { data } = await supabase.from('auction_events').select('*').eq('id', st.event_id).single();
  return data;
};
const loadBidders = async () =>
  (await supabase.from('users').select('*').eq('role', 'USER').order('created_at')).data ?? [];
const loadPlayers = async () =>
  (await supabase.from('players').select('id,name').order('created_at', { ascending: true })).data ?? [];
async function highestBid(playerId) {
  const { data } = await supabase
    .from('bids')
    .select('amount')
    .eq('player_id', playerId)
    .order('amount', { ascending: false })
    .limit(1);
  return data && data[0] ? Number(data[0].amount) : 0;
}
async function placeBid(playerId, userId, amount) {
  const { data, error } = await supabase.rpc('place_bid', {
    p_player_id: playerId,
    p_user_id: userId,
    p_amount: amount,
  });
  if (error) return { success: false, error: error.message };
  return { success: data?.success === true, error: data?.error ?? null };
}
async function tick() {
  try {
    await supabase.rpc('auction_tick');
  } catch {
    /* ignore */
  }
}

// ── setup ────────────────────────────────────────────────────────────────────
async function ensureBidders() {
  let bidders = await loadBidders();
  const need = BIDDERS - bidders.length;
  if (need > 0) {
    console.log(`Trying to create ${need} test bidder(s) (simbot_*) to reach ${BIDDERS}…`);
    const rows = Array.from({ length: need }, (_, i) => ({
      username: `simbot_${Date.now().toString(36)}_${i + 1}`,
      role: 'USER',
      balance: INITIAL_BALANCE,
      banned: false,
    }));
    const { error } = await supabase.from('users').insert(rows);
    if (error) {
      console.warn(
        `⚠️  Could not create bidders (${error.message.split('\n')[0]}). ` +
          `Running with the ${bidders.length} existing USER bidder(s) instead.`
      );
    }
    bidders = await loadBidders();
  }
  // Use the first BIDDERS of them and give everyone a clean, equal balance so the
  // money-conservation check is exact.
  bidders = bidders.slice(0, BIDDERS);
  for (const b of bidders) {
    await supabase.from('users').update({ balance: INITIAL_BALANCE, banned: false }).eq('id', b.id);
  }
  return bidders.map((b) => ({ ...b, balance: INITIAL_BALANCE }));
}

async function configureEvent() {
  const ev = await liveEvent();
  if (!ev) {
    console.error('No live auction event found (auction_state.event_id is null).');
    process.exit(1);
  }
  // Target = TARGET players/member, short phase, anti-snipe off so phases don't
  // stretch. Budget high enough that money is never the limiter (we test the DB).
  await supabase
    .from('auction_events')
    .update({
      player_limit: TARGET,
      player_duration: DURATION,
      extend_threshold: 0,
      extend_amount: 0,
      member_budget: INITIAL_BALANCE,
    })
    .eq('id', ev.id);
  return ev;
}

async function reset(bidders) {
  console.log('Resetting auction (bids, sold markers, balances, state)…');
  await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase
    .from('players')
    .update({ sold_to_user_id: null, sold_amount: null })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  for (const b of bidders) {
    await supabase.from('users').update({ balance: INITIAL_BALANCE }).eq('id', b.id);
  }
  const st = await getState();
  if (st) {
    await supabase
      .from('auction_state')
      .update({
        status: 'idle',
        current_player_id: null,
        current_player_index: -1,
        countdown: 3,
        time_remaining: DURATION,
        phase_ends_at: null,
        current_highest_bid_id: null,
        current_round: 1,
        round_total_players: 0,
        round_current_index: 0,
        sold_players: [],
        unsold_players: [],
        last_outcome: null,
      })
      .eq('id', st.id);
  }
}

// ── verification ─────────────────────────────────────────────────────────────
async function verify(bidders, players) {
  console.log('\n──────── VERIFY ────────');
  const users = await loadBidders();
  const byId = new Map(users.map((u) => [u.id, u]));
  const { data: soldPlayers } = await supabase
    .from('players')
    .select('id, name, sold_to_user_id, sold_amount')
    .not('sold_to_user_id', 'is', null);

  // all bids, paginated
  const allBids = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from('bids')
      .select('player_id, user_id, amount, created_at, id')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    allBids.push(...data);
    if (data.length < PAGE) break;
  }

  // expected winner per player: highest amount, earliest created_at
  const bestByPlayer = new Map();
  for (const b of allBids) {
    const cur = bestByPlayer.get(b.player_id);
    if (
      !cur ||
      Number(b.amount) > Number(cur.amount) ||
      (Number(b.amount) === Number(cur.amount) && new Date(b.created_at) < new Date(cur.created_at))
    ) {
      bestByPlayer.set(b.player_id, b);
    }
  }

  let problems = 0;
  const bump = (msg) => {
    console.log(msg);
    problems++;
  };

  // 1) winner + amount match the actual best bid
  for (const p of soldPlayers ?? []) {
    const best = bestByPlayer.get(p.id);
    if (!best) {
      // A player with a sold_amount of 0 could be a free hand-out; we don't run
      // that here, so any sold player must have a bid.
      bump(`❌ ${p.name}: marked sold but has no bids`);
      continue;
    }
    if (best.user_id !== p.sold_to_user_id) bump(`❌ ${p.name}: winner mismatch`);
    if (Number(best.amount) !== Number(p.sold_amount)) bump(`❌ ${p.name}: amount mismatch`);
  }

  // 2) money conservation + target cap, per bidder
  const perUser = [];
  for (const b of bidders) {
    const u = byId.get(b.id);
    if (!u) continue;
    const mine = (soldPlayers ?? []).filter((p) => p.sold_to_user_id === u.id);
    const spent = mine.reduce((s, p) => s + Number(p.sold_amount || 0), 0);
    const expected = INITIAL_BALANCE - spent;
    if (Number(u.balance) !== expected)
      bump(`❌ ${u.username}: balance ${u.balance} != expected ${expected}`);
    if (mine.length > TARGET) bump(`❌ ${u.username}: won ${mine.length} (> target ${TARGET})`);
    perUser.push({ username: u.username, won: mine.length, spent, balance: Number(u.balance) });
  }

  // 3) no player sold twice / to a non-bidder
  const bidderIds = new Set(bidders.map((b) => b.id));
  for (const p of soldPlayers ?? []) {
    if (!bidderIds.has(p.sold_to_user_id)) bump(`❌ ${p.name}: sold to a non-bidder`);
  }

  const soldCount = (soldPlayers ?? []).length;
  perUser.sort((a, b) => b.won - a.won);
  console.log(`\nPlayers in pool: ${players.length}`);
  console.log(`Players sold via bidding: ${soldCount}`);
  console.log(`Leftover (would be hand-distributed by admin): ${players.length - soldCount}`);
  console.log(`Total bids recorded: ${allBids.length}`);
  console.log('\nPer-bidder:');
  for (const r of perUser) {
    console.log(
      `   ${r.username.padEnd(22)} won=${String(r.won).padStart(2)}  spent=${String(
        r.spent
      ).padStart(7)}  balance=${r.balance}`
    );
  }
  console.log('────────────────────────');
  if (problems === 0) {
    console.log(`✅ PASS — DB consistent. ${soldCount} sold, no inconsistencies.`);
  } else {
    console.log(`❌ FAIL — ${problems} inconsistency(ies).`);
  }
  return { problems, soldCount, totalBids: allBids.length, perUser };
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('⚠️  This mutates the Supabase project in .env.local.\n');
  console.log(`Host: ${new global.URL(URL).host}\n`);

  if (has('cleanup-bots')) {
    const { data } = await supabase.from('users').select('id,username').like('username', 'simbot_%');
    for (const u of data ?? []) await supabase.from('users').delete().eq('id', u.id);
    console.log(`Deleted ${data?.length ?? 0} simbot_* users.`);
    return;
  }

  const ev = await configureEvent();
  console.log(
    `Event "${ev.name}": target=${TARGET}/member, ${DURATION}s/player, anti-snipe off, budget=${INITIAL_BALANCE}.`
  );
  const bidders = await ensureBidders();
  const players = await loadPlayers();
  console.log(`${bidders.length} bidders, ${players.length} players.\n`);
  if (players.length === 0) {
    console.error('No players in the pool. Load the test1 list first.');
    process.exit(1);
  }

  await reset(bidders);

  console.log('Starting auction…');
  await supabase.rpc('start_auction', {
    p_first_player_id: players[0].id,
    p_total_players: players.length,
  });

  const startedAt = Date.now();
  let lastProgressAt = Date.now();
  let lastSold = 0;
  let lastTopBidder = null;
  let lastPlayerId = null;
  const stats = { attempted: 0, accepted: 0, rejected: 0, errors: 0 };
  let stopReason = 'unknown';

  // Driver: advance phases like any client would.
  let running = true;
  const driver = (async () => {
    while (running) {
      await tick();
      await sleep(TICK_MS);
    }
  })();

  while (running) {
    if (Date.now() - startedAt > TIMEOUT_MS) {
      stopReason = 'timeout';
      break;
    }
    const st = await getState();
    if (!st) {
      stopReason = 'no-state';
      break;
    }
    const soldCount = Array.isArray(st.sold_players) ? st.sold_players.length : 0;
    if (soldCount > lastSold) {
      lastSold = soldCount;
      lastProgressAt = Date.now();
    }
    if (st.status === 'finished') {
      stopReason = 'finished';
      break;
    }
    // Stall: everyone full, leftovers can't be sold -> this is where the admin
    // would click "End & distribute remaining".
    if (Date.now() - lastProgressAt > STALL_MS && soldCount >= BIDDERS * TARGET) {
      stopReason = 'stall-capacity (leftovers need admin hand-out)';
      break;
    }
    if (Date.now() - lastProgressAt > STALL_MS * 2) {
      stopReason = 'stall-timeout';
      break;
    }

    if (st.current_player_id !== lastPlayerId) {
      lastPlayerId = st.current_player_id;
      lastTopBidder = null;
    }

    if (st.status === 'active' && st.current_player_id) {
      const playerId = st.current_player_id;
      const top = await highestBid(playerId);
      const pool = bidders.filter((u) => u.id !== lastTopBidder);
      const burst = [];
      const used = new Set();
      for (let i = 0; i < BURST && pool.length > 0; i++) {
        const u = pool[rnd(pool.length)];
        if (used.has(u.id)) continue;
        used.add(u.id);
        const inc = 10 + rnd(10) * 10; // +10..+100
        burst.push({ u, amount: (top || 100) + inc });
      }
      const results = await Promise.allSettled(
        burst.map((b) => placeBid(playerId, b.u.id, b.amount))
      );
      let acceptedTop = null;
      let acceptedTopAmt = top;
      for (let i = 0; i < results.length; i++) {
        stats.attempted++;
        const r = results[i];
        if (r.status === 'fulfilled' && r.value.success) {
          stats.accepted++;
          if (burst[i].amount > acceptedTopAmt) {
            acceptedTopAmt = burst[i].amount;
            acceptedTop = burst[i].u.id;
          }
        } else {
          stats.rejected++;
          if (r.status === 'rejected') stats.errors++;
        }
      }
      if (acceptedTop) lastTopBidder = acceptedTop;

      process.stdout.write(
        `\r[r${st.current_round} ${String(st.round_current_index).padStart(3)}/${
          st.round_total_players
        }] sold ${String(soldCount).padStart(3)} • top $${acceptedTopAmt} • bids ok/att ${
          stats.accepted
        }/${stats.attempted}   `
      );
    } else {
      process.stdout.write(`\r[${st.status}] sold ${lastSold}                                  `);
    }
    await sleep(BURST_MS);
  }

  running = false;
  await driver;

  console.log(`\n\nStopped: ${stopReason}`);
  console.log(
    `Elapsed: ${((Date.now() - startedAt) / 1000).toFixed(0)}s • bids attempted ${
      stats.attempted
    }, accepted ${stats.accepted}, rejected ${stats.rejected}, transport-errors ${stats.errors}`
  );

  const report = await verify(bidders, players);
  console.log('\n=== RESULT ===');
  console.log(
    JSON.stringify(
      {
        host: new global.URL(URL).host,
        bidders: bidders.length,
        target: TARGET,
        players: players.length,
        soldViaBidding: report.soldCount,
        leftover: players.length - report.soldCount,
        totalBids: report.totalBids,
        bidsAttempted: stats.attempted,
        bidsAccepted: stats.accepted,
        bidsRejected: stats.rejected,
        transportErrors: stats.errors,
        stopReason,
        dbConsistent: report.problems === 0,
        inconsistencies: report.problems,
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
