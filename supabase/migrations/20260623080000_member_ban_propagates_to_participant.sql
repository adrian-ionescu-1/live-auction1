-- ============================================================================
-- Fix: banning a member must also ban their live auction participant.
--
-- The original admin_set_member_banned (20260620180000_member_bidding.sql)
-- updated BOTH public.profiles.banned AND public.users.banned (the auction
-- participant linked via users.profile_id), so a member ban blocked bidding.
-- The authorization rewrite (20260621020000_admin_authorization.sql) added the
-- admin-key check but dropped the second UPDATE, so member-level bans
-- (e.g. the auction room's "Bidders" card and the admin Members page) only set
-- profiles.banned. place_bid checks public.users.banned, so those bans stopped
-- blocking bidding — the button looked applied but had no effect.
--
-- This restores the participant propagation. The User Squad Overview already
-- works because it calls admin_set_user_banned directly; after this, both paths
-- behave identically and stay in sync (the realtime users channel propagates the
-- users.banned change to every open auction room).
--
-- Idempotent / safe to re-run. Apply AFTER 20260621020000.
-- ============================================================================

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

  -- Keep the auction participant in sync so a member ban actually blocks bidding
  -- (place_bid guards on public.users.banned).
  update public.users
     set banned = p_banned
   where profile_id = p_member_id;
end;
$$;
grant execute on function public.admin_set_member_banned(uuid, boolean, text) to anon, authenticated;
