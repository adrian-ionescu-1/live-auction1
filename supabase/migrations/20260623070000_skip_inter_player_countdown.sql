-- ============================================================================
-- Drop the redundant per-player "get ready" countdown between players.
--
-- The old flow showed TWO back-to-back 3s countdowns at every hand-off:
--   active -> result (SOLD/UNSOLD modal, "Next player in 3..1")
--          -> countdown (a second "Auction Starting In 3..1")
--          -> active
-- The result phase already gives bidders the 3s heads-up, so the extra
-- countdown is duplicate, looks like the timer card "reloads", and wastes ~3s
-- per player. Here advance_to_next_player sends the next player straight to
-- 'active'. Only the very first player keeps the initial countdown (set by
-- start_auction).
--
-- IMPORTANT: this function was made SECURITY DEFINER by
-- 20260623060000_auction_writes_security_definer.sql. CREATE OR REPLACE would
-- silently reset it to SECURITY INVOKER (re-breaking its writes under RLS), so
-- the definition below re-declares SECURITY DEFINER + search_path explicitly.
--
-- Idempotent / safe to re-run. Apply AFTER 20260623060000.
-- ============================================================================

create or replace function public.advance_to_next_player(p_auction_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path = public
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
  v_duration int := 30;
begin
  select * into v from public.auction_state where id = p_auction_id;
  if v.id is null then
    return;
  end if;

  -- Active-phase length comes from the live event (fallback 30s).
  select coalesce(e.player_duration, 30) into v_duration
  from public.auction_events e
  where e.id = v.event_id;
  v_duration := coalesce(v_duration, 30);

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

  -- Straight to the active bidding phase — no second countdown.
  update public.auction_state
  set status = 'active',
      current_player_id = v_next_id,
      current_player_index = v_next_idx,
      countdown = 0,
      time_remaining = v_duration,
      current_highest_bid_id = null,
      current_round = v_new_round,
      round_total_players = v_new_round_total,
      round_current_index = v_new_round_index,
      unsold_players = v_unsold,
      phase_ends_at = now() + make_interval(secs => v_duration),
      updated_at = now()
  where id = p_auction_id;
end;
$function$;
