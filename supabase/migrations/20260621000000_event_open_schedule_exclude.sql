-- ============================================================================
-- Scheduled event opening + per-member exclusion.
--
-- Two admin controls, set when an event is created:
--
--   * auction_events.opens_at         -> when bidders may start entering the
--       room. NULL means "open immediately". A future timestamp keeps the event
--       created & bound but closed: bidders see a countdown until it opens.
--   * auction_event_members.excluded  -> a member kept out of the auction even
--       though they hold the Bidder role. They are never provisioned and are
--       refused at the door, so they can't self-enroll by entering.
--
--   * admin_create_event       -> takes the open time + the excluded member ids.
--   * enter_auction_as_member  -> refuses before opens_at and refuses excluded.
--   * admin_add_event_member   -> un-excludes (adding a member always includes).
--
-- Run AFTER 20260620240000_event_finalize_reopen.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
alter table public.auction_events
  add column if not exists opens_at timestamptz;
alter table public.auction_event_members
  add column if not exists excluded boolean not null default false;

-- ── admin_create_event: open time + excluded members ─────────────────────────
drop function if exists public.admin_create_event(text, int, int, int, int, int, int, int[]);

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
declare
  v_event record;
  v_entry int;
  v_increments int[];
  v_min_increment int;
  v_reserve_per int;
  v_total int;
  v_budget int;
  v_excluded uuid[];
  v_profile record;
  v_is_excluded boolean;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    return json_build_object('success', false, 'error', 'Event name is required');
  end if;
  if p_player_limit is null or p_player_limit <= 0 then
    return json_build_object('success', false, 'error', 'Player limit must be at least 1');
  end if;

  v_entry := greatest(coalesce(p_opening_bid, 0), 0);
  v_increments := coalesce(nullif(p_bid_increments, '{}'::int[]), '{10,50,100,500,1000}'::int[]);
  v_excluded := coalesce(p_excluded_profile_ids, '{}'::uuid[]);

  -- The cheapest bid a member can place is opening + smallest button; the reserve
  -- must cover that, otherwise the target is unreachable.
  select min(x) into v_min_increment from unnest(v_increments) as x;
  v_min_increment := coalesce(v_min_increment, 0);

  v_reserve_per := v_entry + v_min_increment;
  v_total := p_player_limit * v_reserve_per;
  v_budget := greatest(coalesce(p_member_budget, v_total), v_total);

  insert into public.auction_events
    (name, player_limit, entry_fee, margin, reserve_per_player, total_reserve,
     member_budget, player_duration, extend_threshold, extend_amount, bid_start,
     bid_increments, status, opens_at)
  values
    (trim(p_name), p_player_limit, v_entry, v_min_increment, v_reserve_per, v_total,
     v_budget,
     greatest(coalesce(p_player_duration, 30), 1),
     greatest(coalesce(p_extend_threshold, 10), 0),
     greatest(coalesce(p_extend_amount, 5), 0),
     v_entry, v_increments, 'live', p_opens_at)
  returning * into v_event;

  -- Enroll every bidder. Excluded ones get a membership row flagged excluded
  -- (so the door check can find them) but are never provisioned a participant.
  for v_profile in select * from public.profiles where lower(role) = 'bidder' loop
    v_is_excluded := v_profile.id = any (v_excluded);

    insert into public.auction_event_members (event_id, profile_id, excluded)
    values (v_event.id, v_profile.id, v_is_excluded)
    on conflict (event_id, profile_id) do update set excluded = v_is_excluded;

    if not v_is_excluded then
      perform public.provision_event_participant(v_event.id, v_profile.id, true);
    end if;
  end loop;

  perform public._reset_live_auction_rows(v_event.id);

  return json_build_object('success', true, 'event_id', v_event.id);
end;
$$;
grant execute on function public.admin_create_event(text, int, int, int, int, int, int, int[], timestamptz, uuid[]) to anon, authenticated;

-- ── enter_auction_as_member: gate on opens_at + exclusion ────────────────────
create or replace function public.enter_auction_as_member()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_event record;
  v_member record;
  v_user_id uuid;
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

  select e.* into v_event
  from public.auction_events e
  join public.auction_state s on s.event_id = e.id
  limit 1;
  if v_event is null then
    return json_build_object('success', false,
      'error', 'No live auction event yet. Ask the admin to create one.');
  end if;
  if v_event.status = 'finished' then
    return json_build_object('success', false,
      'error', 'This event is closed. See your results in the dashboard.');
  end if;

  -- Scheduled opening: refuse until the open time passes.
  if v_event.opens_at is not null and now() < v_event.opens_at then
    return json_build_object('success', false,
      'error', 'This event has not opened yet. Check the countdown on your dashboard.');
  end if;

  -- Excluded members are blocked even though they hold the Bidder role.
  select * into v_member
  from public.auction_event_members
  where event_id = v_event.id and profile_id = v_profile.id;
  if v_member is not null and v_member.excluded then
    return json_build_object('success', false,
      'error', 'You are not part of this auction. Ask the admin if this is a mistake.');
  end if;

  insert into public.auction_event_members (event_id, profile_id, excluded)
  values (v_event.id, v_profile.id, false)
  on conflict (event_id, profile_id) do nothing;

  v_user_id := public.provision_event_participant(v_event.id, v_profile.id, false);
  select * into v_user from public.users where id = v_user_id;
  if v_user is null then
    return json_build_object('success', false, 'error', 'Could not provision participant');
  end if;

  return json_build_object(
    'success', true,
    'user_id', v_user.id,
    'role', v_user.role,
    'banned', v_user.banned,
    'event_name', v_event.name
  );
end;
$$;
grant execute on function public.enter_auction_as_member() to anon, authenticated;

-- ── admin_add_event_member: adding a member always includes them ─────────────
create or replace function public.admin_add_event_member(p_event_id uuid, p_profile_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.auction_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    return json_build_object('success', false, 'error', 'Member not found');
  end if;

  insert into public.auction_event_members (event_id, profile_id, excluded)
  values (p_event_id, p_profile_id, false)
  on conflict (event_id, profile_id) do update set excluded = false;

  update public.profiles
     set role = 'bidder', updated_at = now()
   where id = p_profile_id and lower(role) <> 'bidder';

  perform public.provision_event_participant(p_event_id, p_profile_id, true);

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_add_event_member(uuid, uuid) to anon, authenticated;

-- ── admin_open_live_event_now: open the live event right away ────────────────
-- Lets the admin start a scheduled event before its opening time: bringing
-- opens_at to now() opens the door so bidders can enter immediately.
create or replace function public.admin_open_live_event_now()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select event_id into v_event_id from public.auction_state limit 1;
  if v_event_id is null then
    return json_build_object('success', false, 'error', 'No live event');
  end if;

  update public.auction_events
     set opens_at = now()
   where id = v_event_id;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_open_live_event_now() to anon, authenticated;
