-- ============================================================================
-- Per-event customization: spendable budget, timer control, opening bid and
-- the bid-increment buttons. Plus event deletion.
--
-- New auction_events columns:
--   * member_budget    -> the spendable budget given to each member (>= reserve).
--   * player_duration  -> seconds each player stays on the block (active phase).
--   * extend_threshold -> when <= this many seconds remain, a bid extends time.
--   * extend_amount    -> seconds added by a qualifying bid (capped at duration).
--   * bid_start        -> opening minimum bid per player (0 = use player base price).
--   * bid_increments   -> the preset "+N" buttons bidders get (event-specific).
--
-- Behaviour wired to the live event:
--   * auction_tick      -> the active phase now lasts player_duration seconds.
--   * place_bid_core     -> opening minimum = bid_start; anti-snipe uses
--                           extend_threshold / extend_amount (capped at duration).
--   * provision_*        -> each member's budget is set to member_budget (>= reserve).
--   * admin_create_event -> takes all the new settings; member_budget is clamped
--                           up to the reserve so the target stays reachable.
--   * admin_delete_event -> remove an event (unbinds + idles the room if live).
--
-- Run in the Supabase SQL Editor AFTER 20260620200000_auction_events.sql.
-- Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
alter table public.auction_events
  add column if not exists member_budget    int    not null default 0;
alter table public.auction_events
  add column if not exists player_duration  int    not null default 30 check (player_duration > 0);
alter table public.auction_events
  add column if not exists extend_threshold int    not null default 10 check (extend_threshold >= 0);
alter table public.auction_events
  add column if not exists extend_amount    int    not null default 5  check (extend_amount >= 0);
alter table public.auction_events
  add column if not exists bid_start        int    not null default 0  check (bid_start >= 0);
alter table public.auction_events
  add column if not exists bid_increments   int[]  not null default '{10,50,100,500,1000}';

-- Backfill: existing events get a budget equal to their reserve.
update public.auction_events
   set member_budget = total_reserve
 where member_budget = 0;

-- ── provision_event_participant: budget = member_budget (>= reserve) ─────────
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
  v_budget int;
  v_user record;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile is null then
    return null;
  end if;

  -- The member's spendable budget for this event (never below the reserve).
  select greatest(member_budget, total_reserve) into v_budget
  from public.auction_events where id = p_event_id;
  if v_budget is null then
    return null;
  end if;

  select * into v_user from public.users where profile_id = p_profile_id limit 1;
  if v_user is null then
    insert into public.users (username, balance, role, profile_id, banned)
    values (coalesce(v_profile.username, 'Bidder'), v_budget, 'USER', p_profile_id, v_profile.banned)
    returning * into v_user;
  else
    update public.users
       set balance = case when p_reset_balance then v_budget else balance end,
           banned = v_profile.banned,
           username = coalesce(v_profile.username, username)
     where id = v_user.id
    returning * into v_user;
  end if;

  return v_user.id;
end;
$$;
grant execute on function public.provision_event_participant(uuid, uuid, boolean) to anon, authenticated;

-- ── admin_create_event: full settings ───────────────────────────────────────
-- Drop the old 4-arg version so PostgREST resolves the new signature cleanly.
drop function if exists public.admin_create_event(text, int, int, int);

create or replace function public.admin_create_event(
  p_name text,
  p_player_limit int,
  p_entry_fee int,
  p_margin int,
  p_member_budget int,
  p_player_duration int,
  p_extend_threshold int,
  p_extend_amount int,
  p_bid_start int,
  p_bid_increments int[]
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
  v_budget int;
  v_increments int[];
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
  -- Budget can never be below the reserve (else the target is unreachable).
  v_budget := greatest(coalesce(p_member_budget, v_total), v_total);

  v_increments := coalesce(nullif(p_bid_increments, '{}'::int[]), '{10,50,100,500,1000}'::int[]);

  insert into public.auction_events
    (name, player_limit, entry_fee, margin, reserve_per_player, total_reserve,
     member_budget, player_duration, extend_threshold, extend_amount, bid_start,
     bid_increments, status)
  values
    (trim(p_name), p_player_limit, coalesce(p_entry_fee, 0), coalesce(p_margin, 0),
     v_reserve_per, v_total, v_budget,
     greatest(coalesce(p_player_duration, 30), 1),
     greatest(coalesce(p_extend_threshold, 10), 0),
     greatest(coalesce(p_extend_amount, 5), 0),
     greatest(coalesce(p_bid_start, 0), 0),
     v_increments, 'live')
  returning * into v_event;

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
grant execute on function public.admin_create_event(text, int, int, int, int, int, int, int, int, int[]) to anon, authenticated;

-- ── admin_delete_event ───────────────────────────────────────────────────────
-- Remove an event. If it is the live one, unbind + idle the room and clear the
-- current round first (its members rows are removed by the FK cascade).
create or replace function public.admin_delete_event(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.auction_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  if exists (select 1 from public.auction_state where event_id = p_event_id) then
    update public.auction_state
       set event_id = null,
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
     where event_id = p_event_id;

    delete from public.bids where true;
    update public.players
       set sold_to_user_id = null, sold_amount = null
     where sold_to_user_id is not null;
  end if;

  delete from public.auction_events where id = p_event_id;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_delete_event(uuid) to anon, authenticated;

-- ── auction_tick: active phase lasts player_duration seconds ─────────────────
create or replace function public.auction_tick()
 returns json
 language plpgsql
as $function$
declare
  v record;
  v_duration int := 30;
begin
  perform pg_advisory_xact_lock(987654321);

  select * into v from public.auction_state limit 1;
  if v.id is null then
    return json_build_object('changed', false);
  end if;

  if v.phase_ends_at is null or now() < v.phase_ends_at then
    return json_build_object('changed', false);
  end if;

  -- Active phase length from the live event (fallback 30s if unbound).
  select coalesce(e.player_duration, 30) into v_duration
  from public.auction_events e
  where e.id = v.event_id;
  v_duration := coalesce(v_duration, 30);

  if v.status = 'countdown' then
    update public.auction_state
      set status = 'active',
          countdown = 0,
          time_remaining = v_duration,
          phase_ends_at = now() + make_interval(secs => v_duration),
          updated_at = now()
      where id = v.id;
    return json_build_object('changed', true, 'to', 'active');

  elsif v.status = 'active' then
    if v.current_player_id is not null then
      perform public.settle_player(v.current_player_id);
    end if;
    update public.auction_state
      set phase_ends_at = now() + interval '3 seconds', updated_at = now()
      where id = v.id and status = 'result';
    return json_build_object('changed', true, 'to', 'result');

  elsif v.status = 'result' then
    perform public.advance_to_next_player(v.id);
    return json_build_object('changed', true, 'to', 'next');
  end if;

  return json_build_object('changed', false);
end;
$function$;

-- ── place_bid_core: event opening bid + configurable anti-snipe ──────────────
create or replace function public.place_bid_core(p_player_id uuid, p_user_id uuid, p_amount integer)
 returns json
 language plpgsql
as $function$
declare
  v_auction_id uuid;
  v_event_id uuid;
  v_current_player_id uuid;
  v_auction_status text;
  v_user_balance integer;
  v_current_highest_bid integer := 0;
  v_player_base_price integer;
  v_opening_min integer;
  v_phase_ends_at timestamptz;
  v_remaining int;
  v_new_remaining int;
  v_new_ends timestamptz;
  v_bid_id uuid;
  -- event timer config (fallbacks match the old hardcoded behaviour)
  v_duration int := 30;
  v_threshold int := 10;
  v_extend int := 5;
  v_bid_start int := 0;
begin
  if p_player_id is null then
    return json_build_object('success', false, 'error', 'Player ID is required');
  end if;
  if p_user_id is null then
    return json_build_object('success', false, 'error', 'User ID is required');
  end if;
  if p_amount is null or p_amount <= 0 then
    return json_build_object('success', false, 'error', 'Bid amount must be greater than 0');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_player_id::text));

  select id, event_id, current_player_id, status, phase_ends_at
  into v_auction_id, v_event_id, v_current_player_id, v_auction_status, v_phase_ends_at
  from public.auction_state
  limit 1;

  if v_auction_id is null then
    return json_build_object('success', false, 'error', 'No auction state found');
  end if;
  if v_auction_status != 'active' then
    return json_build_object('success', false, 'error', 'Auction is not active');
  end if;
  if v_current_player_id is null or v_current_player_id != p_player_id then
    return json_build_object('success', false, 'error', 'This player is not currently being auctioned');
  end if;

  -- Live event timer + opening-bid config.
  select coalesce(e.player_duration, 30), coalesce(e.extend_threshold, 10),
         coalesce(e.extend_amount, 5), coalesce(e.bid_start, 0)
  into v_duration, v_threshold, v_extend, v_bid_start
  from public.auction_events e
  where e.id = v_event_id;
  v_duration := coalesce(v_duration, 30);
  v_threshold := coalesce(v_threshold, 10);
  v_extend := coalesce(v_extend, 5);
  v_bid_start := coalesce(v_bid_start, 0);

  select balance into v_user_balance from public.users where id = p_user_id;
  if v_user_balance is null then
    return json_build_object('success', false, 'error', 'User not found');
  end if;
  if v_user_balance < p_amount then
    return json_build_object('success', false, 'error', 'Insufficient balance');
  end if;

  select base_price into v_player_base_price from public.players where id = p_player_id;
  if v_player_base_price is null then
    return json_build_object('success', false, 'error', 'Player not found');
  end if;

  -- Opening minimum: the event bid_start when set, else the player base price.
  v_opening_min := case when v_bid_start > 0 then v_bid_start else v_player_base_price end;

  select coalesce(max(amount), 0) into v_current_highest_bid
  from public.bids where player_id = p_player_id;

  if v_current_highest_bid = 0 then
    if p_amount < v_opening_min then
      return json_build_object('success', false,
        'error', 'Bid must be at least the opening bid of ' || v_opening_min);
    end if;
  else
    if p_amount <= v_current_highest_bid then
      return json_build_object('success', false,
        'error', 'Bid must be higher than current bid of ' || v_current_highest_bid);
    end if;
  end if;

  insert into public.bids (player_id, user_id, amount)
  values (p_player_id, p_user_id, p_amount)
  returning id into v_bid_id;

  if v_bid_id is null then
    return json_build_object('success', false, 'error', 'Failed to insert bid');
  end if;

  -- Anti-snipe: when <= threshold seconds remain, push the deadline by extend
  -- (capped at the configured player_duration).
  v_remaining := greatest(0, ceil(extract(epoch from (coalesce(v_phase_ends_at, now()) - now()))))::int;
  if v_remaining <= v_threshold then
    v_new_remaining := least(v_remaining + v_extend, v_duration);
    v_new_ends := now() + make_interval(secs => v_new_remaining);
  else
    v_new_remaining := v_remaining;
    v_new_ends := coalesce(v_phase_ends_at, now() + make_interval(secs => v_remaining));
  end if;

  update public.auction_state
  set current_highest_bid_id = v_bid_id,
      time_remaining = v_new_remaining,
      phase_ends_at = v_new_ends,
      updated_at = now()
  where id = v_auction_id;

  if not found then
    return json_build_object('success', false, 'error', 'Failed to update auction state');
  end if;

  return json_build_object('success', true, 'error', null);
end;
$function$;
