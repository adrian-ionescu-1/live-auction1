-- ============================================================================
-- Make the list shuffle a robust, one-time operation at auction creation.
--
-- 20260623030000 added p_shuffle but ordered the window directly by random(),
-- i.e. called a volatile function inside the window's ORDER BY. On some Postgres
-- versions that can re-evaluate per comparison and is fragile. Here the random
-- weight is computed ONCE per registrant in a subselect, then the window orders
-- by that fixed column — so the shuffled order is decided a single time and
-- frozen into players.created_at (the order the auction reads). No shuffling
-- happens at start or during the auction; the pool is already in its final order.
--
-- Supersedes admin_replace_players_from_list from 20260623030000_auction_list_shuffle.sql.
-- Run AFTER that migration. Idempotent / safe to re-run.
-- ============================================================================

-- Drop the legacy 3-arg signature in case 20260623030000 was never applied.
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

  -- The order is decided once: each registrant gets a fixed sort weight (a random
  -- value when shuffling, NULL otherwise so it falls back to registration order).
  -- row_number() then numbers them into created_at, freezing the final order.
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
      row_number() over (order by reg.sort_weight, reg.created_at asc)
    ) * interval '1 millisecond'
  from (
    select
      r.*,
      case when p_shuffle then random() end as sort_weight
    from public.community_event_registrations r
    where r.event_id = p_list_event_id
  ) reg;

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
