-- ============================================================================
-- Show each bidder's admin-set flag (country tag) live in the auction room.
--
-- The admin-set display name already propagates to the auction participant
-- (admin_set_member_name -> users.username). The flag lived only on
-- profiles.default_country and never reached the room, so bidders/streamers
-- never saw it. This:
--   * adds public.users.flag (the participant's country tag for the room);
--   * backfills it from each linked profile's default_country;
--   * makes provision_event_participant copy/refresh it on entry (so it stays in
--     sync exactly like the username + banned flag);
--   * makes admin_set_member_country propagate the change to the live
--     participant, so the realtime users channel pushes it to every open room.
--
-- The username already syncs, so this completes "name + flag, live, for everyone".
-- Idempotent / safe to re-run. Apply AFTER 20260622060000 (default_country) and
-- 20260621010000 (provision_event_participant).
-- ============================================================================

-- 1) Column on the auction participant.
alter table public.users
  add column if not exists flag text;

-- 2) Backfill from the linked profile's default tag.
update public.users u
   set flag = p.default_country
  from public.profiles p
 where u.profile_id = p.id
   and u.flag is distinct from p.default_country;

-- 3) Provisioning copies + refreshes the flag (same place that syncs the name).
create or replace function public.provision_event_participant(
  p_event_id uuid,
  p_profile_id uuid,
  p_reset_balance boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_budget int;
  v_name text;
  v_user record;
begin
  select * into v_profile from public.profiles where id = p_profile_id;
  if v_profile is null then
    return null;
  end if;

  select greatest(member_budget, total_reserve) into v_budget
  from public.auction_events where id = p_event_id;
  if v_budget is null then
    return null;
  end if;

  -- Admin override wins over the registered Discord name.
  v_name := coalesce(v_profile.display_name, v_profile.username, 'Bidder');

  select * into v_user from public.users where profile_id = p_profile_id limit 1;
  if v_user is null then
    insert into public.users (username, balance, role, profile_id, banned, flag)
    values (v_name, v_budget, 'USER', p_profile_id, v_profile.banned, v_profile.default_country)
    returning * into v_user;
  else
    update public.users
       set balance = case when p_reset_balance then v_budget else balance end,
           banned = v_profile.banned,
           username = v_name,
           flag = v_profile.default_country
     where id = v_user.id
    returning * into v_user;
  end if;

  return v_user.id;
end;
$$;

-- 4) Admin flag change reflects on the live participant immediately (realtime).
create or replace function public.admin_set_member_country(
  p_member_id uuid,
  p_country text default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flag text;
begin
  if not public.is_admin_request(p_admin_key) then
    return json_build_object('success', false, 'error', 'Not authorized');
  end if;

  v_flag := nullif(trim(coalesce(p_country, '')), '');

  update public.profiles
     set default_country = v_flag,
         updated_at = now()
   where id = p_member_id;
  if not found then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;

  -- Keep the live auction participant in sync so the room shows the flag now.
  update public.users
     set flag = v_flag
   where profile_id = p_member_id;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_set_member_country(uuid, text, text) to anon, authenticated;
