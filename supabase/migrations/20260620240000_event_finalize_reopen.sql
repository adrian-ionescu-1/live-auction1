-- ============================================================================
-- Auction finalization with fair random distribution + event reopen + timestamps.
--
-- When every participant has reached their target but players remain (the player
-- count doesn't divide evenly by the bidders), bidding can't continue. Those
-- leftover players are handed out randomly as a free bonus — at most one per
-- person per round, reshuffled each round, so the spread is even (nobody gets 3
-- while others get 0). Then the auction finishes and the event closes.
--
--   * players.won_via_random        -> a player handed out randomly (free), not bid.
--   * auction_event_results.via_random -> same flag mirrored into the results.
--   * auction_events.available_at    -> when the event became enterable (went live).
--
--   * finalize_event_random()  -> distribute leftovers + finish (auto + admin button).
--   * auction_tick             -> auto-finalizes once everyone has reached target.
--   * enter_auction_as_member  -> refuses a finished/closed event.
--   * _reset_live_auction_rows -> reopening re-arms available_at + clears random flags.
--
-- Run AFTER 20260620230000_event_results.sql. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
alter table public.players
  add column if not exists won_via_random boolean not null default false;
alter table public.auction_event_results
  add column if not exists via_random boolean not null default false;
alter table public.auction_events
  add column if not exists available_at timestamptz;

update public.auction_events
   set available_at = created_at
 where available_at is null;

-- ── record_player_result: carry the random flag into results ─────────────────
create or replace function public.record_player_result()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_username text;
begin
  if new.sold_to_user_id is not null
     and new.sold_to_user_id is distinct from old.sold_to_user_id then
    select event_id into v_event_id from public.auction_state limit 1;
    if v_event_id is not null then
      select username into v_username from public.users where id = new.sold_to_user_id;

      insert into public.auction_event_results
        (event_id, player_id, player_name, user_id, username, amount, via_random, won_at)
      values
        (v_event_id, new.id, new.name, new.sold_to_user_id,
         coalesce(v_username, 'Unknown'), coalesce(new.sold_amount, 0),
         coalesce(new.won_via_random, false), now())
      on conflict (event_id, player_id) do update
        set user_id     = excluded.user_id,
            username    = excluded.username,
            amount      = excluded.amount,
            via_random  = excluded.via_random,
            player_name = excluded.player_name,
            won_at      = now();
    end if;
  end if;
  return new;
end;
$$;

-- ── Has every enrolled participant reached their target (by bidding)? ────────
create or replace function public._event_all_reached_target(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_total int;
  v_below int;
begin
  select player_limit into v_limit from public.auction_events where id = p_event_id;
  if v_limit is null then
    return false;
  end if;

  select count(*) into v_total
  from public.users u
  join public.auction_event_members m on m.profile_id = u.profile_id
  where m.event_id = p_event_id and u.role = 'USER';

  if v_total = 0 then
    return false;
  end if;

  -- Participants still short of target, counting bidding wins only.
  select count(*) into v_below
  from public.users u
  join public.auction_event_members m on m.profile_id = u.profile_id
  where m.event_id = p_event_id and u.role = 'USER'
    and (
      select count(*) from public.players p
      where p.sold_to_user_id = u.id and p.won_via_random = false
    ) < v_limit;

  return v_below = 0;
end;
$$;
grant execute on function public._event_all_reached_target(uuid) to anon, authenticated;

-- ── finalize_event_random: hand out leftovers fairly, then finish ────────────
create or replace function public.finalize_event_random()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction_id uuid;
  v_event_id uuid;
  v_participants uuid[];
  v_n int;
  v_player record;
  v_i int := 0;
  v_round uuid[];
  v_assignee uuid;
begin
  perform pg_advisory_xact_lock(987654321);

  select id, event_id into v_auction_id, v_event_id from public.auction_state limit 1;
  if v_event_id is null then
    return json_build_object('success', false, 'error', 'No live event');
  end if;

  -- Participants = enrolled members provisioned as auction users.
  select array_agg(u.id) into v_participants
  from public.users u
  join public.auction_event_members m on m.profile_id = u.profile_id
  where m.event_id = v_event_id and u.role = 'USER';

  v_n := coalesce(array_length(v_participants, 1), 0);

  if v_n > 0 then
    -- Each remaining (unsold) player goes to the next participant; a fresh
    -- shuffle every full round keeps the distribution even and random.
    for v_player in
      select id from public.players where sold_to_user_id is null order by random()
    loop
      if v_i % v_n = 0 then
        select array_agg(p order by random()) into v_round from unnest(v_participants) as p;
      end if;
      v_assignee := v_round[(v_i % v_n) + 1];
      update public.players
         set sold_to_user_id = v_assignee, sold_amount = 0, won_via_random = true
       where id = v_player.id;
      v_i := v_i + 1;
    end loop;
  end if;

  update public.auction_state
     set status = 'finished',
         phase_ends_at = null,
         current_player_id = null,
         updated_at = now()
   where id = v_auction_id;

  return json_build_object('success', true, 'assigned', v_i);
end;
$$;
grant execute on function public.finalize_event_random() to anon, authenticated;

-- ── auction_tick: auto-finalize once everyone has reached target ─────────────
create or replace function public.auction_tick()
 returns json
 language plpgsql
as $function$
declare
  v record;
  v_duration int := 30;
begin
  perform pg_advisory_xact_lock(987654321);

  select * into v from public.auction_state limit 1;
  if v.id is null then
    return json_build_object('changed', false);
  end if;

  if v.phase_ends_at is null or now() < v.phase_ends_at then
    return json_build_object('changed', false);
  end if;

  select coalesce(e.player_duration, 30) into v_duration
  from public.auction_events e
  where e.id = v.event_id;
  v_duration := coalesce(v_duration, 30);

  if v.status = 'countdown' then
    update public.auction_state
      set status = 'active',
          countdown = 0,
          time_remaining = v_duration,
          phase_ends_at = now() + make_interval(secs => v_duration),
          updated_at = now()
      where id = v.id;
    return json_build_object('changed', true, 'to', 'active');

  elsif v.status = 'active' then
    if v.current_player_id is not null then
      perform public.settle_player(v.current_player_id);
    end if;
    update public.auction_state
      set phase_ends_at = now() + interval '3 seconds', updated_at = now()
      where id = v.id and status = 'result';
    return json_build_object('changed', true, 'to', 'result');

  elsif v.status = 'result' then
    -- Everyone reached target but players remain -> stop bidding, distribute the
    -- leftovers randomly and finish.
    if v.event_id is not null
       and public._event_all_reached_target(v.event_id)
       and exists (select 1 from public.players where sold_to_user_id is null) then
      perform public.finalize_event_random();
      return json_build_object('changed', true, 'to', 'finished');
    end if;

    perform public.advance_to_next_player(v.id);
    return json_build_object('changed', true, 'to', 'next');
  end if;

  return json_build_object('changed', false);
end;
$function$;

-- ── enter_auction_as_member: refuse a closed event ───────────────────────────
create or replace function public.enter_auction_as_member()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_event record;
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

  insert into public.auction_event_members (event_id, profile_id)
  values (v_event.id, v_profile.id)
  on conflict do nothing;

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

-- ── _reset_live_auction_rows: clear random flags + re-arm available_at ───────
create or replace function public._reset_live_auction_rows(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auction_id uuid;
begin
  select id into v_auction_id from public.auction_state limit 1;

  update public.auction_state
     set event_id = p_event_id,
         status = 'idle',
         current_player_id = null,
         current_player_index = -1,
         countdown = 3,
         time_remaining = 30,
         phase_ends_at = null,
         current_highest_bid_id = null,
         current_round = 1,
         round_total_players = 0,
         round_current_index = 0,
         sold_players = '{}',
         unsold_players = '{}',
         updated_at = now()
   where id = v_auction_id;

  delete from public.bids where true;

  update public.players
     set sold_to_user_id = null, sold_amount = null, won_via_random = false
   where sold_to_user_id is not null or won_via_random = true;

  delete from public.auction_event_results where event_id = p_event_id;
  update public.auction_events
     set status = 'live', finished_at = null, available_at = now()
   where id = p_event_id;
end;
$$;
grant execute on function public._reset_live_auction_rows(uuid) to anon, authenticated;
