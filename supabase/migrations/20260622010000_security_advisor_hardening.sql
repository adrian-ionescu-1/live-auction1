-- ============================================================================
-- Security advisor hardening (phase 1 — safe, no deploy dependency).
--
-- Clears most Supabase security-advisor WARNINGs without breaking anything:
--
--   1. Pin search_path = public on every public function that lacks one
--      (fixes "role mutable search_path").
--
--   2. Revoke EXECUTE on internal helper functions (everything the client never
--      calls) from anon/authenticated/public, so they're no longer exposed as
--      public RPC endpoints. The real RPCs the app calls keep their grants.
--      Internal calls still work: SECURITY DEFINER functions run as the owner,
--      which always keeps EXECUTE.
--
--   3. key_login() RPC — moves the access-key admin login (which today writes to
--      users + auth_keys directly from the anon client) into a SECURITY DEFINER
--      function, so those tables no longer need permissive write policies for
--      anon. (The client switches to this RPC in the same PR; the final policy
--      drop is phase 2, run AFTER the new code is deployed.)
--
--   4. Tighten the always-true RLS policies that are NOT load-bearing:
--      auction_state / bids / players become read-only for clients (all writes
--      already go through SECURITY DEFINER RPCs), and the unused users
--      UPDATE/DELETE policies are dropped. SELECT (public read) is preserved.
--
-- Idempotent / safe to re-run.
-- ============================================================================

-- ── 1. Pin search_path on every public function lacking one ──────────────────
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as ident
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public', fn.ident);
  end loop;
end $$;

-- ── 3. Access-key admin login as a SECURITY DEFINER RPC ──────────────────────
-- Mirrors AuthService.authenticateWithKey exactly: validate an ADMIN key, reuse
-- or create the admin's participant row, mark the key used, return the user.
create or replace function public.key_login(p_key text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key record;
  v_user record;
begin
  if p_key is null or btrim(p_key) = '' then
    return json_build_object('success', false, 'error', 'Please enter a key');
  end if;

  select * into v_key from public.auth_keys where key = btrim(p_key);
  if v_key is null then
    return json_build_object('success', false, 'error', 'Invalid key');
  end if;
  if v_key.role <> 'ADMIN' then
    return json_build_object('success', false,
      'error', 'Access keys are for admins only. Bidders sign in with Discord.');
  end if;

  select * into v_user from public.users where username = v_key.user_name limit 1;
  if v_user is null then
    insert into public.users (username, balance, role, auth_key_id)
    values (v_key.user_name, 0, v_key.role, v_key.id)
    returning * into v_user;
  end if;

  update public.auth_keys set used = true, used_at = now() where id = v_key.id;

  return json_build_object(
    'success', true,
    'user_id', v_user.id,
    'username', v_user.username,
    'balance', v_user.balance,
    'role', v_user.role
  );
end;
$$;
grant execute on function public.key_login(text) to anon, authenticated;

-- ── 2. Revoke EXECUTE on internal helpers (anything the client never calls) ──
do $$
declare
  fn record;
  allowed text[] := array[
    'key_login',
    'admin_add_community_registration','admin_add_event_member','admin_add_member_role',
    'admin_clear_community_registrations','admin_close_community_registration',
    'admin_convert_event_to_list','admin_create_community_event','admin_create_event',
    'admin_create_participant_list','admin_delete_community_event',
    'admin_delete_community_registration','admin_delete_event','admin_delete_member',
    'admin_extend_community_event','admin_list_community_registrations',
    'admin_open_live_event_now','admin_remove_member_role','admin_reopen_community_registration',
    'admin_replace_players_from_list','admin_reset_event','admin_set_live_event',
    'admin_set_member_banned','admin_set_member_name','admin_set_member_role',
    'admin_set_user_balance','admin_set_user_banned','admin_update_community_event',
    'admin_update_community_registration','auction_tick','clear_my_blitz_account',
    'consent_wotblitz','enter_auction_as_member','enter_auction_as_streamer',
    'extend_auction_time','finalize_event_random','pause_auction','place_bid',
    'register_for_community_event','resume_auction','set_my_blitz_account',
    'settle_player','start_auction','withdraw_from_community_event'
  ];
begin
  for fn in
    select p.oid::regprocedure as ident
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname <> all(allowed)
  loop
    execute format('revoke execute on function %s from anon, authenticated, public', fn.ident);
  end loop;
end $$;

-- ── 4. Tighten the non-load-bearing always-true RLS policies ─────────────────
-- These three are written only by SECURITY DEFINER RPCs (owner-exempt from RLS),
-- so clients only ever need to read them.
drop policy if exists "Allow public access to auction_state" on public.auction_state;
create policy "Public read auction_state" on public.auction_state for select using (true);

drop policy if exists "Allow public access to bids" on public.bids;
create policy "Public read bids" on public.bids for select using (true);

drop policy if exists "Allow public access to players" on public.players;
create policy "Public read players" on public.players for select using (true);

-- users: drop the unused write policies (admin RPCs do these as owner). The
-- INSERT policy stays for now — the access-key login still inserts directly until
-- the new code (key_login RPC) is deployed; phase 2 removes it. SELECT is kept.
drop policy if exists "Allow public update to users" on public.users;
drop policy if exists "Allow public delete to users" on public.users;
