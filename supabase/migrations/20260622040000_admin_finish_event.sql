-- ============================================================================
-- Let the admin finish (close) an auction directly from the Auctions list.
--
-- Auctions have no scheduled end date, so an auction built from a standalone /
-- manual list never closes on its own — the admin decides when it's done.
-- admin_finish_event() marks the auction finished (status + finished_at) so:
--   * the bidders' Results show it as Final and it stays as history;
--   * the admin Auctions list shows it Closed;
--   * if it's the live auction, the room ends too (bidders see the results).
--
-- Players already won stay won (results are kept); this just closes the auction.
-- Reopening it is the existing "Reopen event" action on the Auctions page.
--
-- Run AFTER 20260620230000_event_results.sql. Idempotent / safe to re-run.
-- ============================================================================

create or replace function public.admin_finish_event(
  p_event_id uuid,
  p_admin_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_live uuid;
begin
  if not public.is_admin_request(p_admin_key) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if not exists (select 1 from public.auction_events where id = p_event_id) then
    return json_build_object('success', false, 'error', 'Auction not found');
  end if;

  update public.auction_events
     set status = 'finished',
         finished_at = coalesce(finished_at, now())
   where id = p_event_id;

  -- If this is the live auction, end the room as well (mark_event_finished keeps
  -- the event row in sync) so bidders are shown their results.
  select event_id into v_live from public.auction_state limit 1;
  if v_live = p_event_id then
    update public.auction_state
       set status = 'finished', phase_ends_at = null, updated_at = now()
     where event_id = p_event_id;
  end if;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.admin_finish_event(uuid, text) to anon, authenticated;
