-- ============================================================================
-- Admin actions on members: change role / set ban flag.
--
-- The admin signs in with an access key (anon Supabase client, no JWT), so they
-- can't UPDATE profiles directly under RLS. These SECURITY DEFINER functions
-- perform the change on their behalf and are the single place to add real
-- admin authorization later (e.g. once admins authenticate via Supabase).
--
-- NOTE: like the existing auction RPCs, these currently trust the caller
-- (the app gates admin actions on the client). Harden before exposing widely.
--
-- Run in the Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

create or replace function public.admin_set_member_role(
  p_member_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set role = p_role,
         updated_at = now()
   where id = p_member_id;
end;
$$;

create or replace function public.admin_set_member_banned(
  p_member_id uuid,
  p_banned boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set banned = p_banned,
         updated_at = now()
   where id = p_member_id;
end;
$$;

grant execute on function public.admin_set_member_role(uuid, text) to anon, authenticated;
grant execute on function public.admin_set_member_banned(uuid, boolean) to anon, authenticated;
