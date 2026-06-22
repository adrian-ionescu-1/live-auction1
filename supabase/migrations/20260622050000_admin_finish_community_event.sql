-- ============================================================================
-- Let the admin close (finalize) a community event directly.
--
-- Events with an end date move to "Ended" on their own; an event without one
-- would otherwise stay "ongoing" forever. admin_finish_community_event() ends it
-- now by stamping ends_at = now() and closing the registration window, so it
-- drops into the Ended tab for both the admin and members. Reopening it is the
-- existing "Extend event" (push ends_at to the future) + "Reopen registration".
--
-- Run AFTER 20260621050000_community_events.sql. Idempotent / safe to re-run.
-- ============================================================================

create or replace function public.admin_finish_community_event(
  p_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.community_events
     set ends_at = now(),
         registration_closes_at = least(coalesce(registration_closes_at, now()), now()),
         updated_at = now()
   where id = p_event_id;

  if not found then
    return json_build_object('success', false, 'error', 'Event not found');
  end if;
  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_finish_community_event(uuid, text) to anon, authenticated;
