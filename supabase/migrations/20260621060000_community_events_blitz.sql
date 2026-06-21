-- ============================================================================
-- Blitz validation for community events.
--
-- A community event can target a WoT Blitz region (eu / na / asia). When it does,
-- registrants validate a real in-game account: the app searches the Wargaming
-- Blitz API by nickname, the player picks their account, and the app stores the
-- account id, canonical nickname and career stats (battles, win rate, average
-- damage). Those stats later populate the auction player cards built from the
-- list, replacing the old manually-loaded players table.
--
-- region = null  -> a plain (non-Blitz) event: the old custom-fields flow only.
--
-- Stats come from the official Wargaming API via a server route that holds the
-- application_id; the client passes the validated values to these RPCs. Run
-- AFTER 20260621050000_community_events.sql. Idempotent / safe to re-run.
-- ============================================================================

alter table public.community_events
  add column if not exists region text;  -- 'eu' | 'na' | 'asia' | null

alter table public.community_event_registrations
  add column if not exists account_id  bigint,
  add column if not exists player_name  text,
  -- { "battles": int, "winrate": numeric, "avgDamage": numeric }
  add column if not exists blitz_stats  jsonb;

-- ── admin_create_community_event (now carries region) ────────────────────────
drop function if exists public.admin_create_community_event(
  text, text, text, text, text[], boolean, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz, jsonb, text
);
create or replace function public.admin_create_community_event(
  p_category_key text,
  p_category_name text,
  p_title text,
  p_content text,
  p_visible_roles text[],
  p_has_link boolean,
  p_link_label text,
  p_link_url text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_registration_opens_at timestamptz,
  p_registration_closes_at timestamptz,
  p_registration_fields jsonb,
  p_region text default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_roles text[];
  v_region text;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_title is null or length(trim(p_title)) = 0 then
    return json_build_object('success', false, 'error', 'Title is required');
  end if;

  select coalesce(array_agg(distinct lower(trim(r))), '{}')
    into v_roles
  from unnest(coalesce(p_visible_roles, '{}')) as r
  where length(trim(r)) > 0;

  v_region := lower(nullif(trim(coalesce(p_region, '')), ''));
  if v_region is not null and v_region not in ('eu', 'na', 'asia') then
    v_region := null;
  end if;

  insert into public.community_events (
    category_key, category_name, title, content, visible_roles,
    has_link, link_label, link_url,
    starts_at, ends_at, registration_opens_at, registration_closes_at,
    registration_fields, region, created_by
  ) values (
    coalesce(nullif(trim(p_category_key), ''), 'custom'),
    coalesce(nullif(trim(p_category_name), ''), 'Event'),
    trim(p_title),
    coalesce(p_content, ''),
    v_roles,
    coalesce(p_has_link, false),
    nullif(trim(coalesce(p_link_label, '')), ''),
    nullif(trim(coalesce(p_link_url, '')), ''),
    p_starts_at, p_ends_at, p_registration_opens_at, p_registration_closes_at,
    coalesce(p_registration_fields, '[]'::jsonb),
    v_region,
    auth.uid()
  )
  returning * into v_event;

  return json_build_object('success', true, 'event_id', v_event.id);
end;
$$;
grant execute on function public.admin_create_community_event(
  text, text, text, text, text[], boolean, text, text,
  timestamptz, timestamptz, timestamptz, timestamptz, jsonb, text, text
) to anon, authenticated;

-- ── register_for_community_event (with optional Blitz validation) ─────────────
drop function if exists public.register_for_community_event(uuid, jsonb);
create or replace function public.register_for_community_event(
  p_event_id uuid,
  p_values jsonb,
  p_account_id bigint default null,
  p_player_name text default null,
  p_blitz_stats jsonb default null
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
  if coalesce(v_profile.banned, false) then
    return json_build_object('success', false, 'error', 'You are banned.');
  end if;

  select * into v_event from public.community_events where id = p_event_id;
  if v_event is null then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;

  if not (lower(v_profile.role) = any (v_event.visible_roles)) then
    return json_build_object('success', false, 'error', 'This event is not open to your role.');
  end if;

  if v_event.registration_opens_at is not null and now() < v_event.registration_opens_at then
    return json_build_object('success', false, 'error', 'Registration has not opened yet.');
  end if;
  if v_event.registration_closes_at is not null and now() > v_event.registration_closes_at then
    return json_build_object('success', false, 'error', 'Registration is closed.');
  end if;

  -- Blitz events require a validated account.
  if v_event.region is not null and (p_account_id is null or p_player_name is null) then
    return json_build_object('success', false, 'error', 'Validate your in-game account first.');
  end if;

  -- Display name: the validated in-game name on Blitz events, else the profile name.
  v_name := coalesce(
    nullif(trim(coalesce(p_player_name, '')), ''),
    nullif(trim(coalesce(v_profile.display_name, '')), ''),
    v_profile.username, 'Participant'
  );

  insert into public.community_event_registrations
    (event_id, profile_id, display_name, source, values, account_id, player_name, blitz_stats)
  values (
    p_event_id, v_profile.id, v_name, 'self', coalesce(p_values, '{}'::jsonb),
    p_account_id,
    nullif(trim(coalesce(p_player_name, '')), ''),
    p_blitz_stats
  )
  on conflict (event_id, profile_id) where profile_id is not null
  do update set values = excluded.values,
                display_name = excluded.display_name,
                account_id = excluded.account_id,
                player_name = excluded.player_name,
                blitz_stats = excluded.blitz_stats,
                updated_at = now();

  return json_build_object('success', true);
end;
$$;
grant execute on function public.register_for_community_event(uuid, jsonb, bigint, text, jsonb)
  to anon, authenticated;

-- ── admin_add_community_registration (with optional Blitz data) ───────────────
drop function if exists public.admin_add_community_registration(uuid, text, jsonb, uuid, text);
create or replace function public.admin_add_community_registration(
  p_event_id uuid,
  p_display_name text,
  p_values jsonb,
  p_account_id bigint default null,
  p_player_name text default null,
  p_blitz_stats jsonb default null,
  p_profile_id uuid default null,
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
    (event_id, profile_id, display_name, source, values, account_id, player_name, blitz_stats)
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
    p_blitz_stats
  )
  returning * into v_reg;

  return json_build_object('success', true, 'registration_id', v_reg.id);
end;
$$;
grant execute on function public.admin_add_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, uuid, text
) to anon, authenticated;

-- ── admin_update_community_registration (now carries Blitz data) ─────────────
drop function if exists public.admin_update_community_registration(uuid, text, jsonb, text);
create or replace function public.admin_update_community_registration(
  p_registration_id uuid,
  p_display_name text,
  p_values jsonb,
  p_account_id bigint default null,
  p_player_name text default null,
  p_blitz_stats jsonb default null,
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
         updated_at = now()
   where id = p_registration_id;

  if not found then
    return json_build_object('success', false, 'error', 'Registration not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, text
) to anon, authenticated;

-- ── admin_list_community_registrations (now returns the Blitz columns) ────────
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
