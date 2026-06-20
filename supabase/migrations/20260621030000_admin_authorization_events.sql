-- ============================================================================
-- Server-side authorization for the event-management admin RPCs.
--
-- Continues 20260621020000_admin_authorization.sql. Those member RPCs took the
-- admin key as an argument; the event RPCs have long, frequently-revised bodies,
-- so instead of re-stating them we wrap them:
--
--   * The real body is renamed to <name>_core and its EXECUTE grant is revoked
--     from anon/authenticated (so it can't be called directly to skip the gate).
--   * A thin <name> wrapper with the SAME signature checks is_admin_request()
--     and, if allowed, delegates to <name>_core. Being SECURITY DEFINER, the
--     wrapper can still call the core despite the revoke.
--
-- Because the event RPCs don't take an admin-key argument, the access-key admin
-- proves itself with an `x-admin-key` request header (injected by the app's
-- Supabase client). is_admin_request() is extended below to read it. The Discord
-- admin path (auth.uid -> profiles.role = 'admin') needs no header.
--
-- Maintenance note: change event logic in the *_core function. If a later
-- migration re-creates a bare <name> (no wrapper), re-apply the wrapper here or
-- the authorization gate is lost.
--
-- Run AFTER 20260621020000_admin_authorization.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── is_admin_request: also accept the x-admin-key request header ─────────────
create or replace function public.is_admin_request(p_admin_key text default null)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_header_key text;
begin
  -- 1. Authenticated Discord account promoted to the admin role.
  if auth.uid() is not null and exists (
    select 1 from public.profiles
     where id = auth.uid()
       and lower(role) = 'admin'
  ) then
    return true;
  end if;

  -- 2. Access-key admin via an explicit argument (the member RPCs pass it here).
  if p_admin_key is not null and exists (
    select 1 from public.auth_keys
     where key = p_admin_key
       and role = 'ADMIN'
  ) then
    return true;
  end if;

  -- 3. Access-key admin via the x-admin-key header (the event RPCs take no key
  --    argument). request.headers may be absent off the API, so guard the read.
  begin
    v_header_key := current_setting('request.headers', true)::json ->> 'x-admin-key';
  exception when others then
    v_header_key := null;
  end;
  if v_header_key is not null and exists (
    select 1 from public.auth_keys
     where key = v_header_key
       and role = 'ADMIN'
  ) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.is_admin_request(text) from public;
grant execute on function public.is_admin_request(text) to anon, authenticated;

-- ── admin_create_event ───────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.admin_create_event(text,integer,integer,integer,integer,integer,integer,integer[],timestamp with time zone,uuid[])') is not null
     and to_regprocedure('public.admin_create_event_core(text,integer,integer,integer,integer,integer,integer,integer[],timestamp with time zone,uuid[])') is null then
    alter function public.admin_create_event(text,integer,integer,integer,integer,integer,integer,integer[],timestamp with time zone,uuid[])
      rename to admin_create_event_core;
  end if;
end $$;
revoke all on function public.admin_create_event_core(text,integer,integer,integer,integer,integer,integer,integer[],timestamp with time zone,uuid[]) from anon, authenticated, public;

create or replace function public.admin_create_event(
  p_name text,
  p_player_limit int,
  p_opening_bid int,
  p_member_budget int,
  p_player_duration int,
  p_extend_threshold int,
  p_extend_amount int,
  p_bid_increments int[],
  p_opens_at timestamptz default null,
  p_excluded_profile_ids uuid[] default '{}'::uuid[]
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  return public.admin_create_event_core(
    p_name, p_player_limit, p_opening_bid, p_member_budget, p_player_duration,
    p_extend_threshold, p_extend_amount, p_bid_increments, p_opens_at,
    p_excluded_profile_ids
  );
end;
$$;
grant execute on function public.admin_create_event(text,integer,integer,integer,integer,integer,integer,integer[],timestamp with time zone,uuid[]) to anon, authenticated;

-- ── admin_delete_event ───────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.admin_delete_event(uuid)') is not null
     and to_regprocedure('public.admin_delete_event_core(uuid)') is null then
    alter function public.admin_delete_event(uuid) rename to admin_delete_event_core;
  end if;
end $$;
revoke all on function public.admin_delete_event_core(uuid) from anon, authenticated, public;

create or replace function public.admin_delete_event(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  return public.admin_delete_event_core(p_event_id);
end;
$$;
grant execute on function public.admin_delete_event(uuid) to anon, authenticated;

-- ── admin_add_event_member ───────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.admin_add_event_member(uuid,uuid)') is not null
     and to_regprocedure('public.admin_add_event_member_core(uuid,uuid)') is null then
    alter function public.admin_add_event_member(uuid,uuid) rename to admin_add_event_member_core;
  end if;
end $$;
revoke all on function public.admin_add_event_member_core(uuid,uuid) from anon, authenticated, public;

create or replace function public.admin_add_event_member(p_event_id uuid, p_profile_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  return public.admin_add_event_member_core(p_event_id, p_profile_id);
end;
$$;
grant execute on function public.admin_add_event_member(uuid,uuid) to anon, authenticated;

-- ── admin_set_live_event ─────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.admin_set_live_event(uuid)') is not null
     and to_regprocedure('public.admin_set_live_event_core(uuid)') is null then
    alter function public.admin_set_live_event(uuid) rename to admin_set_live_event_core;
  end if;
end $$;
revoke all on function public.admin_set_live_event_core(uuid) from anon, authenticated, public;

create or replace function public.admin_set_live_event(p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  return public.admin_set_live_event_core(p_event_id);
end;
$$;
grant execute on function public.admin_set_live_event(uuid) to anon, authenticated;

-- ── admin_reset_event ────────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.admin_reset_event()') is not null
     and to_regprocedure('public.admin_reset_event_core()') is null then
    alter function public.admin_reset_event() rename to admin_reset_event_core;
  end if;
end $$;
revoke all on function public.admin_reset_event_core() from anon, authenticated, public;

create or replace function public.admin_reset_event()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  return public.admin_reset_event_core();
end;
$$;
grant execute on function public.admin_reset_event() to anon, authenticated;

-- ── admin_open_live_event_now ────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.admin_open_live_event_now()') is not null
     and to_regprocedure('public.admin_open_live_event_now_core()') is null then
    alter function public.admin_open_live_event_now() rename to admin_open_live_event_now_core;
  end if;
end $$;
revoke all on function public.admin_open_live_event_now_core() from anon, authenticated, public;

create or replace function public.admin_open_live_event_now()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  return public.admin_open_live_event_now_core();
end;
$$;
grant execute on function public.admin_open_live_event_now() to anon, authenticated;

-- ── finalize_event_random ────────────────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.finalize_event_random()') is not null
     and to_regprocedure('public.finalize_event_random_core()') is null then
    alter function public.finalize_event_random() rename to finalize_event_random_core;
  end if;
end $$;
revoke all on function public.finalize_event_random_core() from anon, authenticated, public;

create or replace function public.finalize_event_random()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request() then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;
  return public.finalize_event_random_core();
end;
$$;
grant execute on function public.finalize_event_random() to anon, authenticated;
