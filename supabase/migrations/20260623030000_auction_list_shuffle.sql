-- ============================================================================
-- Optional shuffle when building the auction pool from a list.
--
-- When an admin creates an auction from a community list, the players go up in
-- the list's own order (by registration time). This adds an opt-in shuffle: with
-- p_shuffle = true the pool is inserted in a random order, so the same list can
-- be re-run without the players coming down the belt in the same sequence.
--
-- The order is encoded in created_at (the auction engine reads players ordered by
-- created_at), exactly like before — only the row_number() ordering changes.
--
-- Supersedes admin_replace_players_from_list from 20260621150000_card_variant_and_flag.sql.
-- Run AFTER that migration. Idempotent / safe to re-run.
-- ============================================================================

-- Drop the previous 3-arg signature so only the shuffle-aware version remains.
drop function if exists public.admin_replace_players_from_list(uuid, int, text);

create or replace function public.admin_replace_players_from_list(
  p_list_event_id uuid,
  p_base_price int,
  p_shuffle boolean default false,
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

  delete from public.bids where true;
  delete from public.players where true;

  -- Same insert as before, but the row_number() ordering is either the list's
  -- registration order (created_at) or random when the admin asked to shuffle.
  insert into public.players
    (name, winrate, avg_damage, battles, wn8_30d, base_price, card_variant, flag, created_at)
  select
    coalesce(nullif(trim(coalesce(reg.player_name, reg.display_name)), ''), 'Player'),
    coalesce((reg.blitz_stats ->> 'winrate')::numeric, 0),
    coalesce(round((reg.blitz_stats ->> 'avgDamage')::numeric), 0),
    coalesce((reg.blitz_stats ->> 'battles')::int, 0),
    0,
    greatest(coalesce(p_base_price, 100), 0),
    coalesce(nullif(trim(coalesce(reg.card_variant, '')), ''), public.random_card_variant()),
    nullif(trim(coalesce(reg.flag, '')), ''),
    now() + (
      row_number() over (
        order by case when p_shuffle then random() end, reg.created_at asc
      )
    ) * interval '1 millisecond'
  from public.community_event_registrations reg
  where reg.event_id = p_list_event_id;

  get diagnostics v_count = row_count;

  select event_id into v_event_id from public.auction_state limit 1;
  if v_event_id is not null then
    perform public._reset_live_auction_rows(v_event_id);
  end if;

  return json_build_object('success', true, 'count', v_count);
end;
$$;
grant execute on function public.admin_replace_players_from_list(uuid, int, boolean, text)
  to anon, authenticated;
