-- ============================================================================
-- Build the auction player pool from a community event's registration list.
--
-- Instead of seeding the players table by hand, the admin can point an auction
-- at a community event whose registration has ended: every registrant becomes a
-- player, stamped with the stats validated at sign-up (battles, win rate, avg
-- damage). The auction engine still reads public.players, so nothing downstream
-- changes — we just (re)fill that table from the chosen list.
--
-- admin_replace_players_from_list() wipes the current pool (and this round's bids
-- / sold markers) and inserts the list's players in registration order, then
-- idles the live room so the new pool is auctioned from the top.
--
-- Run AFTER 20260621060000_community_events_blitz.sql. Idempotent / safe to re-run.
-- ============================================================================

-- Career battle count for a player card (replaces WN8 for list-sourced players).
alter table public.players
  add column if not exists battles int not null default 0;

create or replace function public.admin_replace_players_from_list(
  p_list_event_id uuid,
  p_base_price int,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_event_id uuid;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.community_events where id = p_list_event_id) then
    return json_build_object('success', false, 'error', 'List not found');
  end if;
  if not exists (
    select 1 from public.community_event_registrations where event_id = p_list_event_id
  ) then
    return json_build_object('success', false, 'error', 'That list has no participants');
  end if;

  -- Clear the current pool and any in-flight round artifacts.
  delete from public.bids where true;
  delete from public.players where true;

  -- Seed players from the list, preserving registration order via created_at.
  insert into public.players (name, winrate, avg_damage, battles, wn8_30d, base_price, created_at)
  select
    coalesce(nullif(trim(coalesce(reg.player_name, reg.display_name)), ''), 'Player'),
    coalesce((reg.blitz_stats ->> 'winrate')::numeric, 0),
    coalesce(round((reg.blitz_stats ->> 'avgDamage')::numeric), 0),
    coalesce((reg.blitz_stats ->> 'battles')::int, 0),
    0,
    greatest(coalesce(p_base_price, 100), 0),
    now() + (row_number() over (order by reg.created_at asc)) * interval '1 millisecond'
  from public.community_event_registrations reg
  where reg.event_id = p_list_event_id;

  get diagnostics v_count = row_count;

  -- Idle the live room so the new pool is auctioned from the start.
  select event_id into v_event_id from public.auction_state limit 1;
  if v_event_id is not null then
    perform public._reset_live_auction_rows(v_event_id);
  end if;

  return json_build_object('success', true, 'count', v_count);
end;
$$;
grant execute on function public.admin_replace_players_from_list(uuid, int, text)
  to anon, authenticated;
