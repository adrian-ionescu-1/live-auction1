-- ============================================================================
-- Reopen / restart the live auction from inside the auction room.
--
-- admin_reopen_auction() does what admin_reset_event() does (reprovision every
-- member back to their reserve budget, clear all bids + sold markers, idle the
-- room) and additionally:
--   * clears this event's recorded results (auction_event_results), so every
--     bidder's "won" list resets — nobody keeps players from the previous run;
--   * brings the event back to 'live' (clears finished_at) in case it had ended;
--   * sets opens_at: null = open immediately, a future timestamp = scheduled
--     reopen (bidders see a countdown until then).
--
-- The client gates this behind a typed-name + consent confirmation so it can't
-- be triggered by accident.
--
-- Run AFTER 20260620240000_event_finalize_reopen.sql. Idempotent / safe to re-run.
-- ============================================================================

create or replace function public.admin_reopen_auction(
  p_opens_at timestamptz default null,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_profile record;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select e.* into v_event
  from public.auction_events e
  join public.auction_state s on s.event_id = e.id
  limit 1;

  if v_event is null then
    return json_build_object('success', false, 'error', 'No live event to reopen');
  end if;

  -- Reprovision every member back to their reserve budget.
  for v_profile in
    select p.id
    from public.profiles p
    join public.auction_event_members m on m.profile_id = p.id
    where m.event_id = v_event.id
  loop
    perform public.provision_event_participant(v_event.id, v_profile.id, true);
  end loop;

  -- Clear bids + sold markers and idle the room.
  perform public._reset_live_auction_rows(v_event.id);

  -- Wipe the recorded results for this event (everyone's won list resets).
  delete from public.auction_event_results where event_id = v_event.id;

  -- Bring the event back to live and (re)schedule when bidders may enter.
  update public.auction_events
     set status = 'live',
         finished_at = null,
         opens_at = p_opens_at
   where id = v_event.id;

  return json_build_object('success', true, 'opens_at', p_opens_at);
end;
$$;
grant execute on function public.admin_reopen_auction(timestamptz, text) to anon, authenticated;
