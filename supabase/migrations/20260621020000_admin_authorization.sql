-- ============================================================================
-- Server-side authorization for the member-management admin RPCs.
--
-- Until now admin_set_member_role / _banned / _name trusted the caller: any
-- anonymous client could call them, so anyone could grant themselves the
-- 'admin' role (privilege escalation). They are now guarded by is_admin_request,
-- which recognises an admin in one of two ways — mirroring the app's two logins:
--
--   * Discord admin    -> auth.uid() maps to a profiles row with role = 'admin'.
--   * Access-key admin -> presents a valid auth_keys row with role 'ADMIN'.
--     This login is anonymous to Postgres (no JWT), so the key is the only
--     credential it can show. The app keeps it from login and passes p_admin_key.
--
-- Bootstrap: the first 'admin' profile has to be created by the existing
-- access-key admin (or by hand in the SQL editor). After that, admins manage
-- each other's roles through the guarded RPCs.
--
-- Run AFTER 20260621010000_member_display_name.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── is_admin_request: the single authorization check ─────────────────────────
-- SECURITY DEFINER so it can read profiles/auth_keys regardless of RLS. auth.uid
-- still reflects the caller's JWT inside a definer function (it reads the request
-- claims, not the executing role), so the Discord path stays correct.
create or replace function public.is_admin_request(p_admin_key text default null)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  -- 1. Authenticated Discord account promoted to the admin role.
  if auth.uid() is not null and exists (
    select 1 from public.profiles
     where id = auth.uid()
       and lower(role) = 'admin'
  ) then
    return true;
  end if;

  -- 2. Access-key admin proving itself with a valid ADMIN key.
  if p_admin_key is not null and exists (
    select 1 from public.auth_keys
     where key = p_admin_key
       and role = 'ADMIN'
  ) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.is_admin_request(text) from public;
grant execute on function public.is_admin_request(text) to anon, authenticated;

-- ── admin_set_member_role (guarded) ──────────────────────────────────────────
-- The privilege-escalation surface: nobody but an admin may change roles.
-- Adding p_admin_key changes the signature, so drop the old 2-arg version first.
drop function if exists public.admin_set_member_role(uuid, text);
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
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.profiles
     set role = p_role,
         updated_at = now()
   where id = p_member_id;
end;
$$;
grant execute on function public.admin_set_member_role(uuid, text, text) to anon, authenticated;

-- ── admin_set_member_banned (guarded) ────────────────────────────────────────
drop function if exists public.admin_set_member_banned(uuid, boolean);
create or replace function public.admin_set_member_banned(
  p_member_id uuid,
  p_banned boolean,
  p_admin_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.profiles
     set banned = p_banned,
         updated_at = now()
   where id = p_member_id;
end;
$$;
grant execute on function public.admin_set_member_banned(uuid, boolean, text) to anon, authenticated;

-- ── admin_set_member_name (guarded) ──────────────────────────────────────────
-- Same body as 20260621010000, now behind the authorization check.
drop function if exists public.admin_set_member_name(uuid, text);
create or replace function public.admin_set_member_name(
  p_member_id uuid,
  p_name text,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
  v_original text;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  v_clean := nullif(trim(coalesce(p_name, '')), '');

  update public.profiles
     set display_name = v_clean,
         updated_at = now()
   where id = p_member_id
  returning username into v_original;

  if not found then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;

  -- Reflect immediately on the live auction participant so the room (squad
  -- cards, live bids) shows the new name to everyone without a re-provision.
  update public.users
     set username = coalesce(v_clean, v_original, 'Bidder')
   where profile_id = p_member_id;

  return json_build_object(
    'success', true,
    'display_name', v_clean,
    'original', v_original
  );
end;
$$;
grant execute on function public.admin_set_member_name(uuid, text, text) to anon, authenticated;
