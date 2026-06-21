-- ============================================================================
-- WoT Blitz guest onboarding: consent → role, and a self-linked Blitz account.
--
-- Most people who sign in are here for one game (WoT Blitz). Instead of an admin
-- hand-assigning a role to every new guest, a guest declares intent themselves:
-- a prominent consent card on their dashboard. Accepting it promotes them from
-- 'guest' to the 'wotblitz' role (a normal content role the admin targets when
-- creating Blitz events / tournaments) and records when they consented.
--
-- A wotblitz member then links their real in-game account (region + Wargaming
-- account), and we cache its career stats on the profile so the dashboard renders
-- it like a personal game profile. They can re-link a different account anytime.
--
-- All three RPCs are self-service: authorized by the caller's own JWT
-- (auth.uid()), never an admin key — a member can only ever change their OWN row,
-- and consent can only move 'guest' -> 'wotblitz' (never an escalation).
--
-- Run AFTER 20260621100000_users_username_drop_unique.sql. Idempotent.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists wotblitz_consented_at timestamptz,
  add column if not exists blitz_region   text,   -- 'eu' | 'na' | 'asia' | null
  add column if not exists blitz_account_id bigint,
  add column if not exists blitz_nickname text,
  -- Cached career details captured at link time (camelCase keys). The dashboard
  -- renders from this without re-hitting the Wargaming API on every load.
  add column if not exists blitz_stats    jsonb;

-- ── consent_wotblitz: a guest opts into WoT Blitz, unlocking the content role ─
create or replace function public.consent_wotblitz()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_role text;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;
  -- Only ever promote a guest. Other roles (admin/bidder/wotblitz) keep their
  -- role; we just stamp the consent time so it's recorded either way.
  v_role := case when lower(v_profile.role) = 'guest' then 'wotblitz' else v_profile.role end;

  update public.profiles
     set role = v_role,
         wotblitz_consented_at = coalesce(wotblitz_consented_at, now()),
         updated_at = now()
   where id = v_profile.id;

  return json_build_object('success', true, 'role', v_role);
end;
$$;
grant execute on function public.consent_wotblitz() to anon, authenticated;

-- ── set_my_blitz_account: link / re-link the caller's own Blitz account ───────
create or replace function public.set_my_blitz_account(
  p_region text,
  p_account_id bigint,
  p_nickname text,
  p_stats jsonb default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_region text;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;
  v_region := lower(nullif(trim(coalesce(p_region, '')), ''));
  if v_region not in ('eu', 'na', 'asia') then
    return json_build_object('success', false, 'error', 'Pick a valid region');
  end if;
  if p_account_id is null or p_nickname is null or length(trim(p_nickname)) = 0 then
    return json_build_object('success', false, 'error', 'A valid account is required');
  end if;

  update public.profiles
     set blitz_region = v_region,
         blitz_account_id = p_account_id,
         blitz_nickname = trim(p_nickname),
         blitz_stats = p_stats,
         updated_at = now()
   where id = v_profile.id;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.set_my_blitz_account(text, bigint, text, jsonb)
  to anon, authenticated;

-- ── clear_my_blitz_account: unlink the caller's Blitz account ─────────────────
create or replace function public.clear_my_blitz_account()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  update public.profiles
     set blitz_region = null,
         blitz_account_id = null,
         blitz_nickname = null,
         blitz_stats = null,
         updated_at = now()
   where id = auth.uid();

  return json_build_object('success', true);
end;
$$;
grant execute on function public.clear_my_blitz_account() to anon, authenticated;
