-- ============================================================================
-- Named auction events (licitații) + server-side reserve enforcement.
--
-- Replaces the old hardcoded rules (10 players, $110 reserve) with a per-event
-- configuration the admin creates from the dashboard. A single event is "live"
-- at a time; the global auction_state row is bound to it via auction_state.event_id.
--
--   * auction_events         -> a named event: player limit, entry fee, margin,
--                               and the derived reserve_per_player / total_reserve.
--   * auction_event_members  -> which Discord members may bid in the event.
--   * auction_state.event_id -> the single live auction's event binding.
--
--   * admin_create_event()       -> create an event, enrol every 'bidder', bind it live.
--   * admin_add_event_member()   -> add one member to an event (and provision them).
--   * admin_set_live_event()     -> switch which event the auction room runs.
--   * admin_reset_event()        -> reset the live event (balances -> reserve, clear bids).
--   * provision_event_participant() -> create/refresh a member's participant (users) row.
--
--   * place_bid()  -> now reads the target + reserve from the live event AND
--                     enforces the reserve server-side, so a bidder can never
--                     spend the money they need to reach their target.
--   * enter_auction_as_member() -> requires a live event; budget = total_reserve.
--
-- Cleanup: removes leftover key-based participants and every non-admin access key
-- (only the admin still signs in with a key; bidders use Discord).
--
-- Run in the Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
create table if not exists public.auction_events (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  -- How many players each member must take from the auction (the target).
  player_limit       int  not null check (player_limit > 0),
  -- Entry fee paid per player and the safety margin on top of it.
  entry_fee          int  not null default 0 check (entry_fee >= 0),
  margin             int  not null default 0 check (margin >= 0),
  -- Derived, stored for cheap reads: entry_fee + margin, and limit * that.
  reserve_per_player int  not null,
  total_reserve      int  not null,
  status             text not null default 'live', -- 'live' | 'finished'
  created_at         timestamptz not null default now(),
  finished_at        timestamptz
);

create table if not exists public.auction_event_members (
  event_id   uuid not null references public.auction_events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- Bind the single live auction to an event.
alter table public.auction_state
  add column if not exists event_id uuid references public.auction_events (id) on delete set null;

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Reads are open (the admin uses the anon key, no JWT). Writes only via the
-- SECURITY DEFINER RPCs below, never directly from the client.
alter table public.auction_events enable row level security;
drop policy if exists events_select_all on public.auction_events;
create policy events_select_all on public.auction_events for select using (true);

alter table public.auction_event_members enable row level security;
drop policy if exists event_members_select_all on public.auction_event_members;
create policy event_members_select_all on public.auction_event_members for select using (true);

-- ── provision_event_participant ──────────────────────────────────────────────
-- Create (or refresh) the auction participant (public.users row) linked to a
-- Discord member for an event. p_reset_balance = true forces the budget back to
-- the event reserve (used on create / set-live / reset); false keeps an existing
-- balance untouched (used when a member re-enters mid-auction).
create or replace function public.provision_event_participant(
  p_event_id uuid,
  p_profile_id uuid,
  p_reset_balance boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_total_reserve int;
  v_user record;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile is null then
    return null;
  end if;

  select total_reserve into v_total_reserve from public.auction_events where id = p_event_id;
  if v_total_reserve is null then
    return null;
  end if;

  select * into v_user from public.users where profile_id = p_profile_id limit 1;
  if v_user is null then
    -- New participant: budget starts at the event reserve floor.
    insert into public.users (username, balance, role, profile_id, banned)
    values (coalesce(v_profile.username, 'Bidder'), v_total_reserve, 'USER', p_profile_id, v_profile.banned)
    returning * into v_user;
  else
    update public.users
       set balance = case when p_reset_balance then v_total_reserve else balance end,
           banned = v_profile.banned,
           username = coalesce(v_profile.username, username)
     where id = v_user.id
    returning * into v_user;
  end if;

  return v_user.id;
end;
$$;
grant execute on function public.provision_event_participant(uuid, uuid, boolean) to anon, authenticated;

-- ── _reset_live_auction_rows ─────────────────────────────────────────────────
-- Shared helper: take the global auction_state back to idle for a given event
-- and wipe this round's bids + sold markers. Keeps the three admin RPCs DRY.
create or replace function public._reset_live_auction_rows(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction_id uuid;
begin
  select id into v_auction_id from public.auction_state limit 1;

  update public.auction_state
     set event_id = p_event_id,
         status = 'idle',
         current_player_id = null,
         current_player_index = -1,
         countdown = 3,
         time_remaining = 30,
         phase_ends_at = null,
         current_highest_bid_id = null,
         current_round = 1,
         round_total_players = 0,
         round_current_index = 0,
         sold_players = '{}',
         unsold_players = '{}',
         updated_at = now()
   where id = v_auction_id;

  -- `where true` satisfies Supabase's safe-update guard (no bare DELETE allowed).
  delete from public.bids where true;

  update public.players
     set sold_to_user_id = null, sold_amount = null
   where sold_to_user_id is not null;
end;
$$;
grant execute on function public._reset_live_auction_rows(uuid) to anon, authenticated;

-- ── admin_create_event ───────────────────────────────────────────────────────
-- Create a named event, enrol every current 'bidder' as a member + provision
-- their participant at the reserve budget, then bind it as the live auction.
create or replace function public.admin_create_event(
  p_name text,
  p_player_limit int,
  p_entry_fee int,
  p_margin int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_reserve_per int;
  v_total int;
  v_profile record;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('success', false, 'error', 'Event name is required');
  end if;
  if p_player_limit is null or p_player_limit <= 0 then
    return json_build_object('success', false, 'error', 'Player limit must be at least 1');
  end if;

  v_reserve_per := coalesce(p_entry_fee, 0) + coalesce(p_margin, 0);
  v_total := p_player_limit * v_reserve_per;

  insert into public.auction_events
    (name, player_limit, entry_fee, margin, reserve_per_player, total_reserve, status)
  values
    (trim(p_name), p_player_limit, coalesce(p_entry_fee, 0), coalesce(p_margin, 0),
     v_reserve_per, v_total, 'live')
  returning * into v_event;

  -- Enrol every current bidder and provision their participant at the reserve.
  for v_profile in select * from public.profiles where lower(role) = 'bidder' loop
    insert into public.auction_event_members (event_id, profile_id)
    values (v_event.id, v_profile.id)
    on conflict do nothing;
    perform public.provision_event_participant(v_event.id, v_profile.id, true);
  end loop;

  perform public._reset_live_auction_rows(v_event.id);

  return json_build_object('success', true, 'event_id', v_event.id);
end;
$$;
grant execute on function public.admin_create_event(text, int, int, int) to anon, authenticated;

-- ── admin_add_event_member ───────────────────────────────────────────────────
-- Add one member to an event (covers a member who was missed at creation).
-- Grants them the 'bidder' role if needed so they can actually enter.
create or replace function public.admin_add_event_member(p_event_id uuid, p_profile_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.auction_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;

  insert into public.auction_event_members (event_id, profile_id)
  values (p_event_id, p_profile_id)
  on conflict do nothing;

  update public.profiles
     set role = 'bidder', updated_at = now()
   where id = p_profile_id and lower(role) <> 'bidder';

  perform public.provision_event_participant(p_event_id, p_profile_id, true);

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_add_event_member(uuid, uuid) to anon, authenticated;

-- ── admin_set_live_event ─────────────────────────────────────────────────────
-- Switch which event the auction room runs. Re-provisions the event's members
-- to their reserve budget and resets the room to idle.
create or replace function public.admin_set_live_event(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
begin
  if not exists (select 1 from public.auction_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  for v_profile in
    select p.id
    from public.profiles p
    join public.auction_event_members m on m.profile_id = p.id
    where m.event_id = p_event_id
  loop
    perform public.provision_event_participant(p_event_id, v_profile.id, true);
  end loop;

  perform public._reset_live_auction_rows(p_event_id);

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_set_live_event(uuid) to anon, authenticated;

-- ── admin_reset_event ────────────────────────────────────────────────────────
-- Reset the currently live event: every member's budget back to the reserve,
-- bids + sold markers cleared, the room back to idle. Replaces the old client
-- reset that hardcoded a $10,000 balance.
create or replace function public.admin_reset_event()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_profile record;
begin
  select e.* into v_event
  from public.auction_events e
  join public.auction_state s on s.event_id = e.id
  limit 1;

  if v_event is null then
    return json_build_object('success', false, 'error', 'No live event to reset');
  end if;

  for v_profile in
    select p.id
    from public.profiles p
    join public.auction_event_members m on m.profile_id = p.id
    where m.event_id = v_event.id
  loop
    perform public.provision_event_participant(v_event.id, v_profile.id, true);
  end loop;

  perform public._reset_live_auction_rows(v_event.id);

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_reset_event() to anon, authenticated;

-- ── enter_auction_as_member (event-aware) ────────────────────────────────────
-- A signed-in bidder joins the live event. Requires a live event to exist and
-- provisions/refreshes their participant without ever resetting a balance they
-- already spent (p_reset_balance defaults to false).
create or replace function public.enter_auction_as_member()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_event record;
  v_user_id uuid;
  v_user record;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;
  if lower(v_profile.role) <> 'bidder' then
    return json_build_object('success', false,
      'error', 'You need the Bidder role to join the auction');
  end if;

  select e.* into v_event
  from public.auction_events e
  join public.auction_state s on s.event_id = e.id
  limit 1;
  if v_event is null then
    return json_build_object('success', false,
      'error', 'No live auction event yet. Ask the admin to create one.');
  end if;

  -- Make sure they belong to the live event (auto-enrol if missed).
  insert into public.auction_event_members (event_id, profile_id)
  values (v_event.id, v_profile.id)
  on conflict do nothing;

  v_user_id := public.provision_event_participant(v_event.id, v_profile.id, false);
  select * into v_user from public.users where id = v_user_id;
  if v_user is null then
    return json_build_object('success', false, 'error', 'Could not provision participant');
  end if;

  return json_build_object(
    'success', true,
    'user_id', v_user.id,
    'role', v_user.role,
    'banned', v_user.banned,
    'event_name', v_event.name
  );
end;
$$;
grant execute on function public.enter_auction_as_member() to anon, authenticated;

-- ── place_bid: event-driven target + server-side reserve enforcement ─────────
-- Reads the target (player_limit) and reserve_per_player from the live event,
-- and rejects any bid that would dip into the reserve the bidder needs to still
-- reach their target. place_bid_core is left untouched.
create or replace function public.place_bid(p_player_id uuid, p_user_id uuid, p_amount integer)
 returns jsonb
 language plpgsql
as $function$
declare
  v_user record;
  v_event record;
  v_target int := 10;
  v_reserve_per int := 0;
  v_top_bidder_id uuid;
  v_won_count int := 0;
  v_reserve_to_keep int;
  v_spendable int;
begin
  -- S1: serialize validation + insert for this player
  perform pg_advisory_xact_lock(hashtext(p_player_id::text));

  select * into v_user from public.users where id = p_user_id;
  if v_user is null then
    return public.place_bid_core(p_player_id, p_user_id, p_amount);
  end if;

  -- Ban guard: banned participants can watch but never bid.
  if coalesce(v_user.banned, false) then
    return jsonb_build_object('success', false,
      'error', 'You are banned from bidding by the admin.');
  end if;

  -- Live event rules (fall back to the old defaults if somehow unbound).
  select e.* into v_event
  from public.auction_events e
  join public.auction_state s on s.event_id = e.id
  limit 1;
  if v_event is not null then
    v_target := v_event.player_limit;
    v_reserve_per := v_event.reserve_per_player;
  end if;

  if v_user.role = 'USER' then
    -- ANTI-SPAM: no two consecutive bids on the same player
    select b.user_id into v_top_bidder_id
    from public.bids b
    where b.player_id = p_player_id
    order by b.amount desc, b.created_at desc
    limit 1;

    if v_top_bidder_id is not null and v_top_bidder_id = p_user_id then
      return jsonb_build_object('success', false,
        'error', 'You cannot bid twice in a row. Wait for another user to bid.');
    end if;

    -- Target count straight from the settled source of truth (fast + correct)
    select count(*) into v_won_count
    from public.players
    where sold_to_user_id = p_user_id;

    if v_won_count >= v_target then
      return jsonb_build_object('success', false, 'error', 'Target reached. Bidding locked.');
    end if;

    -- RESERVE ENFORCEMENT: keep enough budget to fill the remaining slots (after
    -- this one) at the minimum reserve_per_player, so the target stays reachable.
    v_reserve_to_keep := greatest(v_target - v_won_count - 1, 0) * v_reserve_per;
    v_spendable := v_user.balance - v_reserve_to_keep;
    if p_amount > v_spendable then
      return jsonb_build_object('success', false,
        'error', 'Bid exceeds your spendable budget — keep $' || v_reserve_to_keep
          || ' in reserve to reach your target.');
    end if;
  end if;

  return public.place_bid_core(p_player_id, p_user_id, p_amount);
end;
$function$;

-- ── One-time cleanup of the old key-based world ──────────────────────────────
-- Bidders now come from Discord; only the admin still uses a key. Remove the
-- leftover key participants and every non-admin key. Detach FK references first
-- so the delete can't fail on a leftover bid / sold marker.
update public.players
   set sold_to_user_id = null, sold_amount = null
 where sold_to_user_id in (
   select id from public.users where profile_id is null and role in ('USER', 'SPECTATOR')
 );

delete from public.bids
 where user_id in (
   select id from public.users where profile_id is null and role in ('USER', 'SPECTATOR')
 );

delete from public.users where profile_id is null and role in ('USER', 'SPECTATOR');
delete from public.auth_keys where role <> 'ADMIN';
