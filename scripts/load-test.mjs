// scripts/load-test.mjs
//
// Load test for the auction: simulates many users bidding in simultaneous
// bursts, drives the auction server-side (start + auction_tick), and at the end
// verifies correctness against server truth.
//
// ⚠️  This MUTATES data (places bids, settles players, changes balances).
//     Run it against a TEST Supabase project, or reset afterwards with --reset.
//
// Requires the SQL migrations to be applied (place_bid lock, auction_tick, ...).
//
// Usage (from the project root):
//   node scripts/load-test.mjs                 # auto-start if idle, run to finish
//   node scripts/load-test.mjs --users 8       # cap simulated bidders to 8
//   node scripts/load-test.mjs --players 10    # stop after 10 players settled
//   node scripts/load-test.mjs --burst 8 --interval 400
//   node scripts/load-test.mjs --reset         # reset the auction first, then run
//   node scripts/load-test.mjs --reset-only    # just reset and exit
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
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (n) => argv.includes('--' + n);
const flag = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const CAP_USERS = Number(flag('users', 0)) || 0; // 0 = all USER-role users
const BURST = Number(flag('burst', 6)); // bids fired in parallel per burst
const BURST_MS = Number(flag('interval', 600)); // ms between bursts
const MAX_PLAYERS = Number(flag('players', 0)) || 0; // 0 = run until finished
const INITIAL_BALANCE = Number(flag('balance', 10000));
const TARGET = 10;
const TICK_MS = 400;
const TIMEOUT_MS = Number(flag('timeout', 10 * 60 * 1000)); // 10 min safety

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n) => Math.floor(Math.random() * n);

// ── data helpers ─────────────────────────────────────────────────────────────
async function getState() {
  const { data } = await supabase.from('auction_state').select('*').limit(1).single();
  return data;
}
async function loadUsers() {
  const { data } = await supabase.from('users').select('*').eq('role', 'USER').order('username');
  return data ?? [];
}
async function loadPlayers() {
  const { data } = await supabase.from('players').select('*').order('created_at', { ascending: true });
  return data ?? [];
}
async function highestBid(playerId) {
  const { data } = await supabase
    .from('bids')
    .select('amount')
    .eq('player_id', playerId)
    .order('amount', { ascending: false })
    .limit(1);
  return data && data[0] ? data[0].amount : 0;
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

// ── reset (mirrors AuctionEngine.resetAuction) ───────────────────────────────
async function reset() {
  console.log('Resetting auction…');
  await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const users = await loadUsers();
  for (const u of users) {
    await supabase.from('users').update({ balance: INITIAL_BALANCE }).eq('id', u.id);
  }
  await supabase
    .from('players')
    .update({ sold_to_user_id: null, sold_amount: null })
    .neq('id', '00000000-0000-0000-0000-000000000000');
  const st = await getState();
  if (st) {
    await supabase
      .from('auction_state')
      .update({
        status: 'idle',
        current_player_id: null,
        current_player_index: -1,
        countdown: 3,
        time_remaining: 30,
        phase_ends_at: null,
        current_highest_bid_id: null,
        current_round: 1,
        round_total_players: 0,
        round_current_index: 0,
        sold_players: [],
        unsold_players: [],
      })
      .eq('id', st.id);
  }
  console.log('Reset done.');
}

// ── verification ─────────────────────────────────────────────────────────────
async function verify() {
  console.log('\n──────── VERIFY ────────');
  const users = await loadUsers();
  const { data: soldPlayers } = await supabase
    .from('players')
    .select('id, name, sold_to_user_id, sold_amount')
    .not('sold_to_user_id', 'is', null);
  const { data: allBids } = await supabase
    .from('bids')
    .select('player_id, user_id, amount, created_at');

  // expected winner per player: highest amount, earliest created_at (settle rule)
  const bestByPlayer = new Map();
  for (const b of allBids ?? []) {
    const cur = bestByPlayer.get(b.player_id);
    if (
      !cur ||
      b.amount > cur.amount ||
      (b.amount === cur.amount && new Date(b.created_at) < new Date(cur.created_at))
    ) {
      bestByPlayer.set(b.player_id, b);
    }
  }

  let problems = 0;

  // 1) each sold player's winner + amount matches the actual best bid
  for (const p of soldPlayers ?? []) {
    const best = bestByPlayer.get(p.id);
    if (!best) {
      console.log(`❌ ${p.name}: marked sold but has no bids`);
      problems++;
      continue;
    }
    if (best.user_id !== p.sold_to_user_id) {
      console.log(`❌ ${p.name}: winner mismatch (sold_to=${p.sold_to_user_id}, best bid=${best.user_id})`);
      problems++;
    }
    if (Number(best.amount) !== Number(p.sold_amount)) {
      console.log(`❌ ${p.name}: amount mismatch (sold_amount=${p.sold_amount}, best=${best.amount})`);
      problems++;
    }
  }

  // 2) money conservation + target cap per user
  for (const u of users) {
    const mine = (soldPlayers ?? []).filter((p) => p.sold_to_user_id === u.id);
    const spent = mine.reduce((s, p) => s + Number(p.sold_amount || 0), 0);
    const expectedBalance = INITIAL_BALANCE - spent;
    if (Number(u.balance) !== expectedBalance) {
      console.log(
        `❌ ${u.username}: balance ${u.balance} != expected ${expectedBalance} (spent ${spent})`
      );
      problems++;
    }
    if (mine.length > TARGET) {
      console.log(`❌ ${u.username}: won ${mine.length} players (> target ${TARGET})`);
      problems++;
    }
    console.log(
      `   ${u.username.padEnd(14)} balance=${String(u.balance).padStart(6)}  won=${mine.length}  spent=${spent}`
    );
  }

  console.log('────────────────────────');
  if (problems === 0) {
    console.log(`✅ PASS — ${(soldPlayers ?? []).length} players sold, no inconsistencies.`);
  } else {
    console.log(`❌ FAIL — ${problems} inconsistency(ies) found.`);
  }
  return problems === 0;
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('⚠️  Load test mutates data. Use a test project or --reset to clean up.\n');

  if (has('reset') || has('reset-only')) {
    await reset();
    if (has('reset-only')) return;
  }

  let users = await loadUsers();
  if (CAP_USERS > 0) users = users.slice(0, CAP_USERS);
  if (users.length < 2) {
    console.error('Need at least 2 USER-role users in the DB to run a meaningful test.');
    process.exit(1);
  }
  console.log(`Simulating ${users.length} bidders. burst=${BURST} every ${BURST_MS}ms.`);

  // Start the auction if idle
  let st = await getState();
  if (st?.status === 'idle') {
    const players = await loadPlayers();
    if (players.length === 0) {
      console.error('No players in DB.');
      process.exit(1);
    }
    console.log(`Starting auction with ${players.length} players…`);
    await supabase.rpc('start_auction', {
      p_first_player_id: players[0].id,
      p_total_players: players.length,
    });
  }

  const startedAt = Date.now();
  let lastTopBidder = null;
  const stats = { attempted: 0, accepted: 0, rejected: 0 };
  let settledSeen = 0;
  let lastPlayerId = null;

  // Driver loop — advance phases (acts like any client).
  let running = true;
  const driver = (async () => {
    while (running) {
      await tick();
      await sleep(TICK_MS);
    }
  })();

  // Bidding loop
  while (running) {
    if (Date.now() - startedAt > TIMEOUT_MS) {
      console.log('Timeout reached, stopping.');
      break;
    }

    st = await getState();
    if (!st) break;

    if (st.status === 'finished') {
      console.log('Auction finished.');
      break;
    }

    // track players settled
    const soldCount = Array.isArray(st.sold_players) ? st.sold_players.length : 0;
    if (st.current_player_id !== lastPlayerId) {
      lastPlayerId = st.current_player_id;
      lastTopBidder = null;
    }
    if (MAX_PLAYERS > 0 && soldCount >= MAX_PLAYERS) {
      console.log(`Reached ${soldCount} sold players (--players ${MAX_PLAYERS}), stopping.`);
      break;
    }

    if (st.status === 'active' && st.current_player_id) {
      const playerId = st.current_player_id;
      const top = await highestBid(playerId);

      // pick distinct bidders for this burst; avoid the current top bidder
      // (anti-spam) so most bids are valid
      const pool = users.filter((u) => u.id !== lastTopBidder);
      const burst = [];
      const used = new Set();
      for (let i = 0; i < BURST && pool.length > 0; i++) {
        const u = pool[rnd(pool.length)];
        if (used.has(u.id)) continue;
        used.add(u.id);
        const inc = 10 + rnd(10) * 10; // +10..+100
        const amount = (top || 100) + inc;
        burst.push({ u, amount });
      }

      const results = await Promise.allSettled(
        burst.map((b) => placeBid(playerId, b.u.id, b.amount))
      );
      let acceptedTop = null;
      let acceptedTopAmt = top;
      for (let i = 0; i < results.length; i++) {
        stats.attempted++;
        const r = results[i];
        const ok = r.status === 'fulfilled' && r.value.success;
        if (ok) {
          stats.accepted++;
          if (burst[i].amount > acceptedTopAmt) {
            acceptedTopAmt = burst[i].amount;
            acceptedTop = burst[i].u.id;
          }
        } else {
          stats.rejected++;
        }
      }
      if (acceptedTop) lastTopBidder = acceptedTop;

      process.stdout.write(
        `\r[${st.status}] round ${st.current_round} • player ${st.round_current_index}/${st.round_total_players} • sold ${soldCount} • top $${acceptedTopAmt} • bids ok/att ${stats.accepted}/${stats.attempted}   `
      );
    } else {
      // countdown / result — just wait
      process.stdout.write(`\r[${st.status}] … sold ${soldCount}                                   `);
    }

    await sleep(BURST_MS);
  }

  running = false;
  await driver;
  console.log('\n');
  console.log(`Bids — attempted: ${stats.attempted}, accepted: ${stats.accepted}, rejected: ${stats.rejected}`);

  await verify();

  if (has('reset-after')) await reset();
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
