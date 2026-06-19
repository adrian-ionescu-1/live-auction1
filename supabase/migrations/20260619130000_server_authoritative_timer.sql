-- ============================================================================
-- Server-authoritative auction timer (deadline-based).
--
-- Removes the dependency on the ADMIN browser tab's setInterval (which froze
-- the whole auction when the tab was backgrounded / throttled).
--
-- Model:
--   * auction_state.phase_ends_at (timestamptz) is the single source of truth
--     for when the current phase ends. Clients compute the displayed countdown
--     locally from it, so the display never freezes.
--   * Phase transitions (countdown -> active -> result -> next) are performed
--     server-side by auction_tick(), which is idempotent and serialized with a
--     global advisory lock, so ANY client can safely drive it once the deadline
--     passes. No single point of failure.
--
-- Run in the Supabase SQL Editor AFTER the concurrency migration
-- (20260619120000_fix_auction_concurrency.sql). Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema: deadline column ─────────────────────────────────────────────────
alter table public.auction_state
  add column if not exists phase_ends_at timestamptz;

-- Lock key shared by all whole-auction transitions (start/pause/resume/tick).
-- (place_bid / settle still use the per-player lock from the previous migration.)

-- ── start_auction ───────────────────────────────────────────────────────────
create or replace function public.start_auction(p_first_player_id uuid, p_total_players integer)
 returns json
 language plpgsql
as $function$
declare
  v record;
begin
  perform pg_advisory_xact_lock(987654321);

  select * into v from public.auction_state limit 1;
  if v.id is null then
    return json_build_object('success', false, 'error', 'No auction state found');
  end if;
  if v.status <> 'idle' then
    return json_build_object('success', false, 'error', 'Auction is not idle');
  end if;

  update public.auction_state
  set status = 'countdown',
      current_player_id = p_first_player_id,
      current_player_index = 0,
      countdown = 3,
      time_remaining = 30,
      current_highest_bid_id = null,
      current_round = 1,
      round_total_players = p_total_players,
      round_current_index = 1,
      sold_players = '{}',
      unsold_players = '{}',
      phase_ends_at = now() + interval '3 seconds',
      updated_at = now()
  where id = v.id;

  return json_build_object('success', true, 'error', null);
end;
$function$;

-- ── pause_auction (freezes the deadline) ────────────────────────────────────
create or replace function public.pause_auction()
 returns json
 language plpgsql
as $function$
declare
  v record;
  v_remaining int;
begin
  perform pg_advisory_xact_lock(987654321);

  select * into v from public.auction_state limit 1;
  if v.id is null then
    return json_build_object('success', false, 'error', 'No auction state found');
  end if;
  if v.status <> 'active' then
    return json_build_object('success', false, 'error', 'Auction is not active');
  end if;

  v_remaining := greatest(0, ceil(extract(epoch from (coalesce(v.phase_ends_at, now()) - now()))))::int;

  update public.auction_state
  set status = 'paused',
      time_remaining = v_remaining,
      phase_ends_at = null,
      updated_at = now()
  where id = v.id;

  return json_build_object('success', true, 'error', null);
end;
$function$;

-- ── resume_auction (re-arms the deadline from the frozen remaining) ──────────
create or replace function public.resume_auction()
 returns json
 language plpgsql
as $function$
declare
  v record;
begin
  perform pg_advisory_xact_lock(987654321);

  select * into v from public.auction_state limit 1;
  if v.id is null then
    return json_build_object('success', false, 'error', 'No auction state found');
  end if;
  if v.status <> 'paused' then
    return json_build_object('success', false, 'error', 'Auction is not paused');
  end if;

  update public.auction_state
  set status = 'active',
      phase_ends_at = now() + make_interval(secs => greatest(1, coalesce(v.time_remaining, 30))),
      updated_at = now()
  where id = v.id;

  return json_build_object('success', true, 'error', null);
end;
$function$;

-- ── extend_auction_time (admin) — now moves the deadline ─────────────────────
create or replace function public.extend_auction_time(p_seconds integer)
 returns json
 language plpgsql
 security definer
as $function$
declare
  v record;
  v_remaining int;
begin
  if p_seconds is null or p_seconds <= 0 then
    return json_build_object('success', false, 'error', 'Seconds must be greater than 0');
  end if;

  perform pg_advisory_xact_lock(987654321);

  select * into v from public.auction_state limit 1;
  if v.id is null then
    return json_build_object('success', false, 'error', 'No auction state found');
  end if;
  if v.status <> 'active' then
    return json_build_object('success', false, 'error', 'Auction is not active');
  end if;

  v_remaining := greatest(0, ceil(extract(epoch from (coalesce(v.phase_ends_at, now()) - now()))))::int;

  update public.auction_state
  set phase_ends_at = now() + make_interval(secs => v_remaining + p_seconds),
      time_remaining = v_remaining + p_seconds,
      updated_at = now()
  where id = v.id;

  return json_build_object('success', true, 'error', null);
end;
$function$;

-- ── place_bid_core — deadline-aware extension (keeps the S1 per-player lock) ──
create or replace function public.place_bid_core(p_player_id uuid, p_user_id uuid, p_amount integer)
 returns json
 language plpgsql
as $function$
declare
  v_auction_id uuid;
  v_current_player_id uuid;
  v_auction_status text;
  v_user_balance integer;
  v_current_highest_bid integer := 0;
  v_player_base_price integer;
  v_phase_ends_at timestamptz;
  v_remaining int;
  v_new_remaining int;
  v_new_ends timestamptz;
  v_bid_id uuid;
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

  -- S1: serialize bids for the same player
  perform pg_advisory_xact_lock(hashtext(p_player_id::text));

  select id, current_player_id, status, phase_ends_at
  into v_auction_id, v_current_player_id, v_auction_status, v_phase_ends_at
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

  select coalesce(max(amount), 0) into v_current_highest_bid
  from public.bids where player_id = p_player_id;

  if v_current_highest_bid = 0 then
    if p_amount < v_player_base_price then
      return json_build_object('success', false,
        'error', 'Bid must be at least the base price of ' || v_player_base_price);
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

  -- Anti-snipe: if <= 10s remain, push the deadline so remaining = min(remaining+5, 30)
  v_remaining := greatest(0, ceil(extract(epoch from (coalesce(v_phase_ends_at, now()) - now()))))::int;
  if v_remaining <= 10 then
    v_new_remaining := least(v_remaining + 5, 30);
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

-- ── advance_to_next_player — server-side port of the client loadNextPlayer ───
create or replace function public.advance_to_next_player(p_auction_id uuid)
 returns void
 language plpgsql
as $function$
declare
  v record;
  v_sold text[];
  v_unsold text[];
  v_unsold_initial int;
  v_next_id uuid;
  v_next_idx int;
  v_is_reauction boolean := false;
  v_remaining_count int;
  v_new_round int;
  v_new_round_total int;
  v_new_round_index int;
begin
  select * into v from public.auction_state where id = p_auction_id;
  if v.id is null then
    return;
  end if;

  v_sold := coalesce(v.sold_players, array[]::text[]);
  v_unsold := coalesce(v.unsold_players, array[]::text[]);
  v_unsold_initial := coalesce(array_length(v.unsold_players, 1), 0);

  select count(*) into v_remaining_count
  from public.players p
  where not (p.id::text = any(v_sold));

  if v_remaining_count = 0 then
    update public.auction_state
      set status = 'finished', phase_ends_at = null, updated_at = now()
      where id = p_auction_id;
    return;
  end if;

  -- 1) next not-sold player after the current index (created_at order)
  with ordered as (
    select p.id, (row_number() over (order by p.created_at asc))::int - 1 as idx
    from public.players p
  )
  select o.id, o.idx into v_next_id, v_next_idx
  from ordered o
  where o.idx > v.current_player_index
    and not (o.id::text = any(v_sold))
  order by o.idx asc
  limit 1;

  -- 2) else start a re-auction round from the unsold list (array order)
  if v_next_id is null and v_unsold_initial > 0 then
    v_is_reauction := true;

    with ordered as (
      select p.id, (row_number() over (order by p.created_at asc))::int - 1 as idx
      from public.players p
    )
    select o.id, o.idx into v_next_id, v_next_idx
    from ordered o
    where (o.id::text = any(v_unsold))
      and not (o.id::text = any(v_sold))
    order by array_position(v_unsold, o.id::text) asc
    limit 1;

    if v_next_id is not null then
      v_unsold := array_remove(v_unsold, v_next_id::text);
    end if;
  end if;

  if v_next_id is null then
    update public.auction_state
      set status = 'finished', phase_ends_at = null, updated_at = now()
      where id = p_auction_id;
    return;
  end if;

  -- Round bookkeeping (mirrors the previous client logic)
  v_new_round := v.current_round;
  v_new_round_total := v.round_total_players;
  v_new_round_index := v.round_current_index + 1;

  if v_is_reauction then
    v_new_round := v.current_round + 1;
    v_new_round_total := v_unsold_initial;
    v_new_round_index := 1;
  elsif v_new_round_index > v.round_total_players then
    v_new_round := v.current_round + 1;
    v_new_round_total := v_unsold_initial;
    v_new_round_index := 1;
  end if;

  update public.auction_state
  set status = 'countdown',
      current_player_id = v_next_id,
      current_player_index = v_next_idx,
      countdown = 3,
      time_remaining = 30,
      current_highest_bid_id = null,
      current_round = v_new_round,
      round_total_players = v_new_round_total,
      round_current_index = v_new_round_index,
      unsold_players = v_unsold,
      phase_ends_at = now() + interval '3 seconds',
      updated_at = now()
  where id = p_auction_id;
end;
$function$;

-- ── auction_tick — idempotent phase advance, callable by ANY client ──────────
create or replace function public.auction_tick()
 returns json
 language plpgsql
as $function$
declare
  v record;
begin
  -- global lock: only one transition runs at a time across all clients
  perform pg_advisory_xact_lock(987654321);

  select * into v from public.auction_state limit 1;
  if v.id is null then
    return json_build_object('changed', false);
  end if;

  -- nothing to do until the current phase deadline has passed
  if v.phase_ends_at is null or now() < v.phase_ends_at then
    return json_build_object('changed', false);
  end if;

  if v.status = 'countdown' then
    update public.auction_state
      set status = 'active',
          countdown = 0,
          time_remaining = 30,
          phase_ends_at = now() + interval '30 seconds',
          updated_at = now()
      where id = v.id;
    return json_build_object('changed', true, 'to', 'active');

  elsif v.status = 'active' then
    if v.current_player_id is not null then
      perform public.settle_player(v.current_player_id);  -- sets status='result', countdown=3
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
