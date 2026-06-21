-- ============================================================================
-- Multiple roles per member.
--
-- Until now a profile had a single `role`, so granting "bidder" to a WoT Blitz
-- member overwrote 'wotblitz' and they lost their Blitz content. A member can now
-- hold several roles at once (e.g. wotblitz + bidder): the dashboard shows every
-- capability, and they see events targeted at ANY of their roles.
--
--   * profiles.roles text[]  -> the source of truth (the full set).
--   * profiles.role          -> kept in sync as a derived "primary" role
--                               (precedence below) so existing single-role checks
--                               (is_admin_request, enter_auction_as_member, the
--                               excluded lock, displays) keep working unchanged.
--
-- Role writes go through guarded RPCs that update `roles` and re-derive `role`.
-- Community-event visibility now matches on role-set overlap.
--
-- Run AFTER 20260621110000_wotblitz_guest_consent.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema: add roles[], backfill from the current single role, then constrain ─
alter table public.profiles add column if not exists roles text[];
update public.profiles
   set roles = array[lower(coalesce(role, 'guest'))]
 where roles is null;
alter table public.profiles alter column roles set default '{guest}';
alter table public.profiles alter column roles set not null;

-- ── primary_role: the one role legacy single-role code should see ─────────────
-- Precedence: a locked account dominates; otherwise the most-privileged content
-- role wins, falling back to guest.
create or replace function public.primary_role(p_roles text[])
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when 'excluded' = any(p_roles) then 'excluded'
    when 'admin'    = any(p_roles) then 'admin'
    when 'bidder'   = any(p_roles) then 'bidder'
    when 'wotblitz' = any(p_roles) then 'wotblitz'
    when 'guest'    = any(p_roles) then 'guest'
    else coalesce(p_roles[1], 'guest')
  end;
$$;

-- ── consent_wotblitz (roles-aware): add 'wotblitz', drop the 'guest' baseline ─
create or replace function public.consent_wotblitz()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_roles text[];
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;
  -- Add the wotblitz content role; a real role replaces the 'guest' baseline.
  v_roles := array(select distinct x from unnest(coalesce(v_profile.roles, '{}') || array['wotblitz']) x);
  v_roles := array_remove(v_roles, 'guest');

  update public.profiles
     set roles = v_roles,
         role = public.primary_role(v_roles),
         wotblitz_consented_at = coalesce(wotblitz_consented_at, now()),
         updated_at = now()
   where id = v_profile.id;

  return json_build_object('success', true, 'role', public.primary_role(v_roles));
end;
$$;
grant execute on function public.consent_wotblitz() to anon, authenticated;

-- ── admin_add_member_role: grant one role, keeping the others ────────────────
create or replace function public.admin_add_member_role(
  p_member_id uuid,
  p_role text,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_roles text[];
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_role := lower(nullif(trim(coalesce(p_role, '')), ''));
  if v_role is null then
    return json_build_object('success', false, 'error', 'Role is required');
  end if;

  select roles into v_roles from public.profiles where id = p_member_id;
  if not found then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;

  v_roles := array(select distinct x from unnest(coalesce(v_roles, '{}') || array[v_role]) x);
  -- A real role supersedes the 'guest' baseline.
  if v_role <> 'guest' then
    v_roles := array_remove(v_roles, 'guest');
  end if;

  update public.profiles
     set roles = v_roles, role = public.primary_role(v_roles), updated_at = now()
   where id = p_member_id;

  return json_build_object('success', true, 'role', public.primary_role(v_roles));
end;
$$;
grant execute on function public.admin_add_member_role(uuid, text, text) to anon, authenticated;

-- ── admin_remove_member_role: revoke one role (empty set falls back to guest) ─
create or replace function public.admin_remove_member_role(
  p_member_id uuid,
  p_role text,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_roles text[];
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_role := lower(nullif(trim(coalesce(p_role, '')), ''));
  select roles into v_roles from public.profiles where id = p_member_id;
  if not found then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;

  v_roles := array_remove(coalesce(v_roles, '{}'), v_role);
  if array_length(v_roles, 1) is null then
    v_roles := array['guest'];
  end if;

  update public.profiles
     set roles = v_roles, role = public.primary_role(v_roles), updated_at = now()
   where id = p_member_id;

  return json_build_object('success', true, 'role', public.primary_role(v_roles));
end;
$$;
grant execute on function public.admin_remove_member_role(uuid, text, text) to anon, authenticated;

-- ── admin_set_member_role (guarded): now REPLACES the set with one role ───────
-- Kept for the "reset to a single role" path; syncs both columns.
drop function if exists public.admin_set_member_role(uuid, text, text);
create or replace function public.admin_set_member_role(
  p_member_id uuid,
  p_role text,
  p_admin_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_role := lower(nullif(trim(coalesce(p_role, '')), ''));
  if v_role is null then
    v_role := 'guest';
  end if;

  update public.profiles
     set role = v_role,
         roles = array[v_role],
         updated_at = now()
   where id = p_member_id;
end;
$$;
grant execute on function public.admin_set_member_role(uuid, text, text) to anon, authenticated;

-- ── register_for_community_event: gate on role-set OVERLAP ────────────────────
-- Same body as 20260621060000_community_events_blitz.sql, except the role gate
-- now passes if ANY of the member's roles is in the event's visible_roles.
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
