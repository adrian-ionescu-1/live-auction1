-- ============================================================================
-- Fix the reserve so it actually covers the first real bid.
--
-- Problem: reserve_per_player was entry_fee + a MANUAL margin, independent of the
-- bid buttons. But the cheapest bid a member can place is (opening bid + smallest
-- button) — the UI always adds an increment on top of the opening. So with a
-- smallest button of +50 and a margin of 10, a member with exactly the reserve
-- budget couldn't afford their last player and the target became unreachable.
--
-- Fix: the reserve is derived from the bidding config, not a manual number:
--     reserve_per_player = opening_bid + min(bid_increments)
--     margin             = min(bid_increments)   (stored for display)
--     entry_fee = bid_start = opening_bid
-- so the reserve always equals the cheapest amount needed to secure one player.
--
-- admin_create_event now takes a single opening bid (no separate entry/margin);
-- margin + reserve are computed from it and the bid buttons.
--
-- Run AFTER 20260620210000_event_customization.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Backfill existing events to the corrected formula ────────────────────────
update public.auction_events
   set bid_start = case when bid_start > 0 then bid_start else entry_fee end
 where true;

update public.auction_events
   set margin = coalesce((select min(x) from unnest(bid_increments) as x), 0),
       entry_fee = bid_start
 where true;

update public.auction_events
   set reserve_per_player = bid_start + margin,
       total_reserve = player_limit * (bid_start + margin)
 where true;

update public.auction_events
   set member_budget = greatest(member_budget, total_reserve)
 where true;

-- ── admin_create_event: opening bid drives the reserve ───────────────────────
drop function if exists public.admin_create_event(text, int, int, int, int, int, int, int, int, int[]);

create or replace function public.admin_create_event(
  p_name text,
  p_player_limit int,
  p_opening_bid int,
  p_member_budget int,
  p_player_duration int,
  p_extend_threshold int,
  p_extend_amount int,
  p_bid_increments int[]
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_entry int;
  v_increments int[];
  v_min_increment int;
  v_reserve_per int;
  v_total int;
  v_budget int;
  v_profile record;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('success', false, 'error', 'Event name is required');
  end if;
  if p_player_limit is null or p_player_limit <= 0 then
    return json_build_object('success', false, 'error', 'Player limit must be at least 1');
  end if;

  v_entry := greatest(coalesce(p_opening_bid, 0), 0);
  v_increments := coalesce(nullif(p_bid_increments, '{}'::int[]), '{10,50,100,500,1000}'::int[]);

  -- The cheapest bid a member can place is opening + smallest button; the reserve
  -- must cover that, otherwise the target is unreachable.
  select min(x) into v_min_increment from unnest(v_increments) as x;
  v_min_increment := coalesce(v_min_increment, 0);

  v_reserve_per := v_entry + v_min_increment;
  v_total := p_player_limit * v_reserve_per;
  v_budget := greatest(coalesce(p_member_budget, v_total), v_total);

  insert into public.auction_events
    (name, player_limit, entry_fee, margin, reserve_per_player, total_reserve,
     member_budget, player_duration, extend_threshold, extend_amount, bid_start,
     bid_increments, status)
  values
    (trim(p_name), p_player_limit, v_entry, v_min_increment, v_reserve_per, v_total,
     v_budget,
     greatest(coalesce(p_player_duration, 30), 1),
     greatest(coalesce(p_extend_threshold, 10), 0),
     greatest(coalesce(p_extend_amount, 5), 0),
     v_entry, v_increments, 'live')
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
grant execute on function public.admin_create_event(text, int, int, int, int, int, int, int[]) to anon, authenticated;
