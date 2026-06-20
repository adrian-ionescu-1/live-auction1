-- ============================================================================
-- Discord members bidding + ban enforcement.
--
-- Unifies the two worlds: a Discord member with the 'bidder' role can now enter
-- the auction as a participant (public.users row), and the ban flag actually
-- blocks bidding (server-side, in place_bid).
--
--   * users.profile_id  -> links an auction participant to a Discord profile.
--   * users.banned      -> a banned participant can watch but cannot bid.
--   * enter_auction_as_member() -> a bidder joins the auction (admin sets budget).
--   * admin_set_user_banned / admin_set_user_balance -> admin manages participants.
--   * admin_set_member_banned -> now also syncs the linked participant's ban.
--   * place_bid -> rejects bids from banned participants.
--
-- Access keys still work for special cases; delete existing ones with:
--     delete from public.auth_keys;
--
-- Run in the Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;
alter table public.users
  add column if not exists banned boolean not null default false;

-- ── A bidder-role member joins the auction ───────────────────────────────────
-- Called by the signed-in Discord member (auth.uid()). Reuses their participant
-- row if present, else creates one with a 0 budget (the admin sets the budget).
create or replace function public.enter_auction_as_member()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_user record;
begin
  if auth.uid() is null then
    return json_build_object('success', false, 'error', 'Not signed in');
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;
  if lower(v_profile.role) <> 'bidder' then
    return json_build_object('success', false,
      'error', 'You need the Bidder role to join the auction');
  end if;

  select * into v_user from public.users where profile_id = v_profile.id limit 1;
  if v_user is null then
    insert into public.users (username, balance, role, profile_id, banned)
    values (coalesce(v_profile.username, 'Bidder'), 0, 'USER', v_profile.id, v_profile.banned)
    returning * into v_user;
  else
    update public.users
       set banned = v_profile.banned,
           username = coalesce(v_profile.username, username)
     where id = v_user.id
    returning * into v_user;
  end if;

  return json_build_object(
    'success', true,
    'user_id', v_user.id,
    'role', v_user.role,
    'banned', v_user.banned
  );
end;
$$;
grant execute on function public.enter_auction_as_member() to anon, authenticated;

-- ── Admin: ban / unban a participant directly (covers key users) ─────────────
create or replace function public.admin_set_user_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set banned = p_banned where id = p_user_id;
end;
$$;
grant execute on function public.admin_set_user_banned(uuid, boolean) to anon, authenticated;

-- ── Admin: set a participant's budget ────────────────────────────────────────
create or replace function public.admin_set_user_balance(p_user_id uuid, p_balance integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set balance = greatest(coalesce(p_balance, 0), 0) where id = p_user_id;
end;
$$;
grant execute on function public.admin_set_user_balance(uuid, integer) to anon, authenticated;

-- ── Banning a member also bans their auction participant ─────────────────────
create or replace function public.admin_set_member_banned(p_member_id uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set banned = p_banned, updated_at = now() where id = p_member_id;
  update public.users set banned = p_banned where profile_id = p_member_id;
end;
$$;
grant execute on function public.admin_set_member_banned(uuid, boolean) to anon, authenticated;

-- ── place_bid: reject banned participants ────────────────────────────────────
-- Same as the concurrency migration, with a ban guard added right after the
-- participant is loaded. place_bid_core is left untouched.
create or replace function public.place_bid(p_player_id uuid, p_user_id uuid, p_amount integer)
 returns jsonb
 language plpgsql
as $function$
declare
  v_user record;
  v_target int := 10;
  v_top_bidder_id uuid;
  v_won_count int := 0;
begin
  -- S1: serialize validation + insert for this player
  perform pg_advisory_xact_lock(hashtext(p_player_id::text));

  select * into v_user from public.users where id = p_user_id;
  if v_user is null then
    return public.place_bid_core(p_player_id, p_user_id, p_amount);
  end if;

  -- Ban guard: banned participants can watch but never bid.
  if coalesce(v_user.banned, false) then
    return jsonb_build_object('success', false,
      'error', 'You are banned from bidding by the admin.');
  end if;

  if v_user.role = 'USER' then
    -- ANTI-SPAM: no two consecutive bids on the same player
    select b.user_id into v_top_bidder_id
    from public.bids b
    where b.player_id = p_player_id
    order by b.amount desc, b.created_at desc
    limit 1;

    if v_top_bidder_id is not null and v_top_bidder_id = p_user_id then
      return jsonb_build_object('success', false,
        'error', 'You cannot bid twice in a row. Wait for another user to bid.');
    end if;

    -- S3: target count straight from the settled source of truth (fast + correct)
    select count(*) into v_won_count
    from public.players
    where sold_to_user_id = p_user_id;

    if v_won_count >= v_target then
      return jsonb_build_object('success', false, 'error', 'Target reached. Bidding locked.');
    end if;
  end if;

  return public.place_bid_core(p_player_id, p_user_id, p_amount);
end;
$function$;
