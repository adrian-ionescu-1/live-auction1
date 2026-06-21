-- ============================================================================
-- No duplicate player names within a single list / event.
--
-- A player must not appear twice in the same registration list (so nobody is
-- auctioned twice by mistake). The check is by NAME, case-insensitive, on the
-- effective name (the validated in-game name when present, else the display
-- name). The SAME name may still appear across DIFFERENT lists — uniqueness is
-- scoped per event_id only.
--
-- Enforced in the three entry points that add players:
--   * register_for_community_event        (member self-registration)
--   * admin_add_community_registration     (admin adds / CSV-Excel import)
--   * admin_update_community_registration  (admin renames a participant)
--
-- Run AFTER 20260621150000_card_variant_and_flag.sql. Idempotent / safe to re-run.
-- ============================================================================

-- Normalized effective name used for the duplicate check.
create or replace function public._reg_norm_name(p_player text, p_display text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(coalesce(nullif(trim(p_player), ''), nullif(trim(p_display), ''), ''));
$$;

-- ── Member self-registration (+ duplicate-name guard) ────────────────────────
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
  v_norm text;
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

  -- Duplicate-name guard (within this event, excluding the caller's own row,
  -- which the upsert below updates in place).
  v_norm := public._reg_norm_name(p_player_name, v_name);
  if v_norm <> '' and exists (
    select 1 from public.community_event_registrations r
    where r.event_id = p_event_id
      and r.profile_id is distinct from v_profile.id
      and public._reg_norm_name(r.player_name, r.display_name) = v_norm
  ) then
    return json_build_object('success', false,
      'error', 'A player named "' || v_name || '" is already registered for this event.');
  end if;

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

-- ── Admin add participant / import (+ duplicate-name guard) ───────────────────
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
     blitz_stats, card_variant, flag)
  values (
    p_event_id, p_profile_id, v_name, 'manual',
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

-- ── Admin update participant (+ duplicate-name guard, excluding self) ─────────
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

  -- The names this update will result in (after the coalesce in the UPDATE).
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
         updated_at = now()
   where id = p_registration_id;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_update_community_registration(
  uuid, text, jsonb, bigint, text, jsonb, text, text, text
) to anon, authenticated;
