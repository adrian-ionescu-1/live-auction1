-- ============================================================================
-- Admin-editable member display name (with the original always kept).
--
-- An admin can rename any member; the registered Discord name stays in
-- profiles.username, the admin override lives in profiles.display_name. The name
-- shown everywhere is coalesce(display_name, username), so a renamed member
-- reads the same to everyone — including inside the live auction room.
--
--   * profiles.display_name      -> admin override, NULL = use the original.
--   * admin_set_member_name      -> set (or clear) it + sync the live participant.
--   * provision_event_participant-> seeds users.username from the effective name.
--
-- Run AFTER 20260621000000_event_open_schedule_exclude.sql. Idempotent.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists display_name text;

-- ── admin_set_member_name: rename or reset, keeping the room in sync ──────────
-- p_name null/blank clears the override (back to the original Discord name).
create or replace function public.admin_set_member_name(p_member_id uuid, p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text;
  v_original text;
begin
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
grant execute on function public.admin_set_member_name(uuid, text) to anon, authenticated;

-- ── provision_event_participant: seed the shown name from the effective one ──
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

  -- The member's spendable budget for this event (never below the reserve).
  select greatest(member_budget, total_reserve) into v_budget
  from public.auction_events where id = p_event_id;
  if v_budget is null then
    return null;
  end if;

  -- Admin override wins over the registered Discord name.
  v_name := coalesce(v_profile.display_name, v_profile.username, 'Bidder');

  select * into v_user from public.users where profile_id = p_profile_id limit 1;
  if v_user is null then
    insert into public.users (username, balance, role, profile_id, banned)
    values (v_name, v_budget, 'USER', p_profile_id, v_profile.banned)
    returning * into v_user;
  else
    update public.users
       set balance = case when p_reset_balance then v_budget else balance end,
           banned = v_profile.banned,
           username = v_name
     where id = v_user.id
    returning * into v_user;
  end if;

  return v_user.id;
end;
$$;
grant execute on function public.provision_event_participant(uuid, uuid, boolean) to anon, authenticated;
