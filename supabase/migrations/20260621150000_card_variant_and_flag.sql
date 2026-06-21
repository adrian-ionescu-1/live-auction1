-- ============================================================================
-- Personalized player cards: a chosen card design + a country flag per
-- participant, carried through to the auction player pool.
--
-- Each registration (and each auction player) now stores:
--   * card_variant -> one of the 10 card design ids (see src/.../cardDesigns).
--   * flag         -> an ISO 3166-1 alpha-2 country code (e.g. 'ro'), or null.
--
-- Members pick their design + flag when they register (or hit "Random"); the
-- admin picks (or randomizes) when adding participants / creating lists; imported
-- rows get random values from the client. When an auction pool is built from a
-- list, each player inherits the registrant's card + flag (card is random-filled
-- if somehow missing, so every card looks intentional).
--
-- Run AFTER 20260621120000_profiles_multi_role.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Columns ──────────────────────────────────────────────────────────────────
alter table public.community_event_registrations
  add column if not exists card_variant text,
  add column if not exists flag text;

alter table public.players
  add column if not exists card_variant text,
  add column if not exists flag text;

-- ── Random card design id (mirrors the frontend VARIANT_IDS) ─────────────────
create or replace function public.random_card_variant()
returns text
language sql
volatile
set search_path = public
as $$
  select (array[
    'desert-ops','winter-camo','urban-hex','forest-recon','steel-commander',
    'neon-grid','gold-elite','holo-prism','minimal-glass','crimson-aurora'
  ])[floor(random() * 10) + 1];
$$;

-- ── Member self-registration: now carries card_variant + flag ────────────────
drop function if exists public.register_for_community_event(uuid, jsonb, bigint, text, jsonb);
create or replace function public.register_for_community_event(
  p_event_id uuid,
  p_values jsonb,
  p_account_id bigint default null,
  p_player_name text default null,
  p_blitz_stats jsonb default null,
  p_card_variant text default null,
  p_flag text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_event record;
  v_name text;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;
  select * into v_event from public.community_events where id = p_event_id;
  if v_event is null then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  -- Role gate: any of the caller's roles must be in the event's visible_roles.
  if not (v_event.visible_roles && coalesce(v_profile.roles, array[lower(v_profile.role)])) then
    return json_build_object('success', false, 'error', 'This event is not open to your role.');
  end if;

  if v_event.registration_opens_at is not null and now() < v_event.registration_opens_at then
    return json_build_object('success', false, 'error', 'Registration has not opened yet.');
  end if;
  if v_event.registration_closes_at is not null and now() > v_event.registration_closes_at then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;

  if v_event.region is not null and (p_account_id is null or p_player_name is null) then
    return json_build_object('success', false, 'error', 'Validate your in-game account first.');
  end if;

  v_name := coalesce(
    nullif(trim(coalesce(p_player_name, '')), ''),
    nullif(trim(coalesce(v_profile.display_name, '')), ''),
    v_profile.username, 'Participant'
  );

  insert into public.community_event_registrations
    (event_id, profile_id, display_name, source, values, account_id, player_name,
     blitz_stats, card_variant, flag)
  values (
    p_event_id, v_profile.id, v_name, 'self', coalesce(p_values, '{}'::jsonb),
    p_account_id,
    nullif(trim(coalesce(p_player_name, '')), ''),
    p_blitz_stats,
    coalesce(nullif(trim(coalesce(p_card_variant, '')), ''), public.random_card_variant()),
    nullif(trim(coalesce(p_flag, '')), '')
  )
  on conflict (event_id, profile_id) where profile_id is not null
  do update set values = excluded.values,
                display_name = excluded.display_name,
                account_id = excluded.account_id,
                player_name = excluded.player_name,
                blitz_stats = excluded.blitz_stats,
                card_variant = excluded.card_variant,
                flag = excluded.flag,
                updated_at = now();

  return json_build_object('success', true);
end;
$$;
grant execute on function public.register_for_community_event(
  uuid, jsonb, bigint, text, jsonb, text, text
) to anon, authenticated;

-- ── Admin add participant: now carries card_variant + flag ───────────────────
drop function if exists public.admin_add_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, uuid, text
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
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg record;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if not exists (select 1 from public.community_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  insert into public.community_event_registrations
    (event_id, profile_id, display_name, source, values, account_id, player_name,
     blitz_stats, card_variant, flag)
  values (
    p_event_id,
    p_profile_id,
    coalesce(
      nullif(trim(coalesce(p_player_name, '')), ''),
      nullif(trim(coalesce(p_display_name, '')), ''),
      'Participant'
    ),
    'manual',
    coalesce(p_values, '{}'::jsonb),
    p_account_id,
    nullif(trim(coalesce(p_player_name, '')), ''),
    p_blitz_stats,
    coalesce(nullif(trim(coalesce(p_card_variant, '')), ''), public.random_card_variant()),
    nullif(trim(coalesce(p_flag, '')), '')
  )
  returning * into v_reg;

  return json_build_object('success', true, 'registration_id', v_reg.id);
end;
$$;
grant execute on function public.admin_add_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, uuid, text, text, text
) to anon, authenticated;

-- ── Admin update participant: now carries card_variant + flag ────────────────
drop function if exists public.admin_update_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, text
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
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.community_event_registrations
     set display_name = coalesce(nullif(trim(coalesce(p_display_name, '')), ''), display_name),
         values = coalesce(p_values, values),
         account_id = coalesce(p_account_id, account_id),
         player_name = coalesce(nullif(trim(coalesce(p_player_name, '')), ''), player_name),
         blitz_stats = coalesce(p_blitz_stats, blitz_stats),
         card_variant = coalesce(nullif(trim(coalesce(p_card_variant, '')), ''), card_variant),
         flag = coalesce(nullif(trim(coalesce(p_flag, '')), ''), flag),
         updated_at = now()
   where id = p_registration_id;

  if not found then
    return json_build_object('success', false, 'error', 'Registration not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, text, text, text
) to anon, authenticated;

-- ── Admin list participants: now returns card_variant + flag ─────────────────
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
           reg.card_variant, reg.flag,
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

-- ── Auction pool from a list: inherit each registrant's card + flag ──────────
-- Same as 20260621070000_auction_from_list.sql, but players now copy card_variant
-- (random-filled if missing) and flag from the source registration.
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

  delete from public.bids where true;
  delete from public.players where true;

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
    now() + (row_number() over (order by reg.created_at asc)) * interval '1 millisecond'
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
grant execute on function public.admin_replace_players_from_list(uuid, int, text)
  to anon, authenticated;
