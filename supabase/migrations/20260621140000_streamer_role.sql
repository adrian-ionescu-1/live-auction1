-- ============================================================================
-- Streamer role: members who broadcast the live auction (YouTube / Twitch /
-- TikTok). A streamer joins the auction room as a WATCH-ONLY participant — they
-- see the same live player / timer / price / bids as a bidder, but never bid.
--
-- This replaces the old "spectator" concept (access keys + a manual key handout).
-- Everything is automated now: an admin grants the 'streamer' role like any
-- other, and the member enters the broadcast room straight from their dashboard.
--
--   * primary_role()              -> now ranks 'streamer' in the precedence list.
--   * enter_auction_as_streamer() -> a streamer joins the room; reuses (or creates)
--                                    a users row with the watch-only SPECTATOR role
--                                    so the existing "spectators cannot bid" guard
--                                    in place_bid / BidControls applies unchanged.
--
-- Run AFTER 20260621120000_profiles_multi_role.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── primary_role: rank 'streamer' among the content roles ────────────────────
-- A locked account still dominates; otherwise the most-privileged content role
-- wins. Streamer sits just below bidder (a member who is both bids primarily).
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
    when 'streamer' = any(p_roles) then 'streamer'
    when 'wotblitz' = any(p_roles) then 'wotblitz'
    when 'guest'    = any(p_roles) then 'guest'
    else coalesce(p_roles[1], 'guest')
  end;
$$;

-- ── A streamer-role member joins the auction room (watch-only) ────────────────
-- Called by the signed-in Discord member (auth.uid()). Reuses their participant
-- row if present, else creates one with the SPECTATOR role and a 0 budget. The
-- SPECTATOR role is what blocks bidding everywhere downstream, so a streamer who
-- is ALSO a bidder still gets a watch-only seat here (their bidding seat is a
-- separate USER row created by enter_auction_as_member).
create or replace function public.enter_auction_as_streamer()
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
  if not ('streamer' = any(coalesce(v_profile.roles, array[lower(v_profile.role)]))) then
    return json_build_object('success', false,
      'error', 'You need the Streamer role to join the broadcast room');
  end if;

  -- Reuse this member's watch-only seat if it exists, else create one. A streamer
  -- who is also a bidder may already own a USER seat (from enter_auction_as_member);
  -- we keep the two separate so switching modes never changes their role.
  select * into v_user
  from public.users
  where profile_id = v_profile.id and role = 'SPECTATOR'
  limit 1;

  if v_user is null then
    insert into public.users (username, balance, role, profile_id, banned)
    values (coalesce(v_profile.username, 'Streamer'), 0, 'SPECTATOR', v_profile.id, false)
    returning * into v_user;
  else
    update public.users
       set username = coalesce(v_profile.username, username)
     where id = v_user.id
    returning * into v_user;
  end if;

  return json_build_object(
    'success', true,
    'user_id', v_user.id,
    'role', v_user.role
  );
end;
$$;
grant execute on function public.enter_auction_as_streamer() to anon, authenticated;
