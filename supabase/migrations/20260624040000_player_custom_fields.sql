-- ============================================================================
-- Custom fields for manually-imported participant lists.
--
-- When an admin imports a CSV/Excel with "Use file data", only the Player (name)
-- column is fixed. Every other column is a free-form custom field: the admin
-- gives it a title and picks which spreadsheet column feeds it. These fields are
-- taken verbatim from the file (no Wargaming validation) and must survive the
-- whole chain — registration -> players -> the live card the bidders/streamer see.
--
-- We store them as an ORDERED jsonb array of {"label","value"} on both
-- community_event_registrations and players (order = the admin's column order,
-- which is the display order on the card).
--
-- admin_replace_players_from_list() also gains an optional sort: build the
-- auction order by a chosen custom field, ascending or descending (numeric).
--
-- Run AFTER 20260623040000_auction_list_shuffle_order.sql and
-- 20260621160000_no_duplicate_player_names.sql. Idempotent / safe to re-run.
-- ============================================================================

alter table public.community_event_registrations
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;

alter table public.players
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;

-- ── Admin add participant / import — now also stores custom_fields ────────────
drop function if exists public.admin_add_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, uuid, text, text, text
);
create or replace function public.admin_add_community_registration(
  p_event_id uuid,
  p_display_name text,
  p_values jsonb,
  p_account_id bigint default null,
  p_player_name text default null,
  p_blitz_stats jsonb default null,
  p_profile_id uuid default null,
  p_card_variant text default null,
  p_flag text default null,
  p_custom_fields jsonb default '[]'::jsonb,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
  v_name text;
  v_norm text;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.community_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  v_name := coalesce(
    nullif(trim(coalesce(p_player_name, '')), ''),
    nullif(trim(coalesce(p_display_name, '')), ''),
    'Participant'
  );

  v_norm := public._reg_norm_name(p_player_name, p_display_name);
  if v_norm <> '' and exists (
    select 1 from public.community_event_registrations r
    where r.event_id = p_event_id
      and public._reg_norm_name(r.player_name, r.display_name) = v_norm
  ) then
    return json_build_object('success', false,
      'error', '"' || v_name || '" is already in this list.');
  end if;

  insert into public.community_event_registrations
    (event_id, profile_id, display_name, source, values, account_id, player_name,
     blitz_stats, card_variant, flag, custom_fields)
  values (
    p_event_id, p_profile_id, v_name, 'manual',
    coalesce(p_values, '{}'::jsonb),
    p_account_id,
    nullif(trim(coalesce(p_player_name, '')), ''),
    p_blitz_stats,
    coalesce(nullif(trim(coalesce(p_card_variant, '')), ''), public.random_card_variant()),
    nullif(trim(coalesce(p_flag, '')), ''),
    coalesce(p_custom_fields, '[]'::jsonb)
  )
  returning * into v_reg;

  return json_build_object('success', true, 'registration_id', v_reg.id);
end;
$$;
grant execute on function public.admin_add_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, uuid, text, text, jsonb, text
) to anon, authenticated;

-- ── Admin update participant — now also updates custom_fields ─────────────────
drop function if exists public.admin_update_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, text, text, text
);
create or replace function public.admin_update_community_registration(
  p_registration_id uuid,
  p_display_name text,
  p_values jsonb,
  p_account_id bigint default null,
  p_player_name text default null,
  p_blitz_stats jsonb default null,
  p_card_variant text default null,
  p_flag text default null,
  p_custom_fields jsonb default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_player text;
  v_display text;
  v_norm text;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_existing
  from public.community_event_registrations
  where id = p_registration_id;
  if not found then
    return json_build_object('success', false, 'error', 'Registration not found');
  end if;

  v_player := coalesce(nullif(trim(coalesce(p_player_name, '')), ''), v_existing.player_name);
  v_display := coalesce(nullif(trim(coalesce(p_display_name, '')), ''), v_existing.display_name);
  v_norm := public._reg_norm_name(v_player, v_display);

  if v_norm <> '' and exists (
    select 1 from public.community_event_registrations r
    where r.event_id = v_existing.event_id
      and r.id <> p_registration_id
      and public._reg_norm_name(r.player_name, r.display_name) = v_norm
  ) then
    return json_build_object('success', false,
      'error', '"' || coalesce(nullif(trim(v_player), ''), v_display)
        || '" is already in this list.');
  end if;

  update public.community_event_registrations
     set display_name = coalesce(nullif(trim(coalesce(p_display_name, '')), ''), display_name),
         values = coalesce(p_values, values),
         account_id = coalesce(p_account_id, account_id),
         player_name = coalesce(nullif(trim(coalesce(p_player_name, '')), ''), player_name),
         blitz_stats = coalesce(p_blitz_stats, blitz_stats),
         card_variant = coalesce(nullif(trim(coalesce(p_card_variant, '')), ''), card_variant),
         flag = coalesce(nullif(trim(coalesce(p_flag, '')), ''), flag),
         custom_fields = coalesce(p_custom_fields, custom_fields),
         updated_at = now()
   where id = p_registration_id;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, text, text, jsonb, text
) to anon, authenticated;

-- ── List registrations — expose custom_fields to the admin UI ────────────────
create or replace function public.admin_list_community_registrations(
  p_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows json;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select coalesce(json_agg(row_to_json(r) order by r.created_at), '[]'::json)
    into v_rows
  from (
    select reg.id, reg.event_id, reg.profile_id, reg.display_name, reg.source,
           reg.values, reg.account_id, reg.player_name, reg.blitz_stats,
           reg.card_variant, reg.flag, reg.custom_fields,
           reg.created_at, reg.updated_at,
           p.username      as profile_username,
           p.display_name  as profile_display_name,
           p.avatar_url    as profile_avatar_url,
           p.role          as profile_role
    from public.community_event_registrations reg
    left join public.profiles p on p.id = reg.profile_id
    where reg.event_id = p_event_id
  ) r;

  return json_build_object('success', true, 'registrations', v_rows);
end;
$$;
grant execute on function public.admin_list_community_registrations(uuid, text)
  to anon, authenticated;

-- ── Build the auction pool from a list — copy custom_fields + optional sort ───
-- Supersedes the 4-arg version from 20260623040000. Adds p_sort_field /
-- p_sort_dir: when a field label is given, the pool is ordered by that custom
-- field's numeric value (asc/desc); otherwise shuffle or registration order.
drop function if exists public.admin_replace_players_from_list(uuid, int, boolean, text);

create or replace function public.admin_replace_players_from_list(
  p_list_event_id uuid,
  p_base_price int,
  p_shuffle boolean default false,
  p_sort_field text default null,
  p_sort_dir text default 'asc',
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
  v_field text := nullif(trim(coalesce(p_sort_field, '')), '');
  v_desc boolean := lower(coalesce(p_sort_dir, 'asc')) = 'desc';
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

  -- Each registrant gets a fixed sort weight, decided once:
  --   * a chosen custom field's numeric value (negated for descending), or
  --   * a random value when shuffling, or
  --   * NULL so it falls back to registration order (created_at).
  -- row_number() then freezes that order into created_at (the auction's order).
  insert into public.players
    (name, winrate, avg_damage, battles, wn8_30d, base_price, card_variant, flag,
     custom_fields, created_at)
  select
    coalesce(nullif(trim(coalesce(reg.player_name, reg.display_name)), ''), 'Player'),
    coalesce((reg.blitz_stats ->> 'winrate')::numeric, 0),
    coalesce(round((reg.blitz_stats ->> 'avgDamage')::numeric), 0),
    coalesce((reg.blitz_stats ->> 'battles')::int, 0),
    0,
    greatest(coalesce(p_base_price, 100), 0),
    coalesce(nullif(trim(coalesce(reg.card_variant, '')), ''), public.random_card_variant()),
    nullif(trim(coalesce(reg.flag, '')), ''),
    coalesce(reg.custom_fields, '[]'::jsonb),
    now() + (
      row_number() over (
        order by reg.sort_weight asc nulls last, reg.created_at asc
      )
    ) * interval '1 millisecond'
  from (
    select
      r.*,
      case
        when v_field is not null then
          (
            case
              when regexp_replace(coalesce(cf.value, ''), '[^0-9.-]', '', 'g')
                     ~ '^-?[0-9]+(\.[0-9]+)?$'
              then regexp_replace(cf.value, '[^0-9.-]', '', 'g')::numeric
              else null
            end
          ) * (case when v_desc then -1 else 1 end)
        when p_shuffle then random()
        else null
      end as sort_weight
    from public.community_event_registrations r
    left join lateral (
      select elem ->> 'value' as value
      from jsonb_array_elements(coalesce(r.custom_fields, '[]'::jsonb)) elem
      where lower(trim(elem ->> 'label')) = lower(v_field)
      limit 1
    ) cf on true
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
grant execute on function public.admin_replace_players_from_list(uuid, int, boolean, text, text, text)
  to anon, authenticated;
