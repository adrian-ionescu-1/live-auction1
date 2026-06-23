-- ============================================================================
-- Fix: the live-auction write RPCs must run as SECURITY DEFINER.
--
-- 20260622010000_security_advisor_hardening.sql tightened RLS on auction_state,
-- bids and players down to "public SELECT only", on the stated assumption that
-- "these are written only by SECURITY DEFINER RPCs (owner-exempt from RLS)".
-- That assumption was wrong: the core auction RPCs were NOT security definer, so
-- they run with the caller's (anon/authenticated) privileges and their writes
-- are now silently dropped by RLS — the UPDATE matches zero rows and the
-- function still returns success.
--
-- Symptoms this caused:
--   * start_auction returns {success:true} but auction_state stays 'idle'
--     -> the room "doesn't start" (timer card flashes then reverts to Start);
--   * place_bid can't insert a bid / extend the clock -> bidding is dead;
--   * auction_tick can't advance the phase -> the timer never progresses;
--   * settle_player / advance_to_next_player can't write -> rounds never move.
--
-- Fix: mark every RPC that writes auction_state / bids / players / users as
-- SECURITY DEFINER (so it runs as the owner and bypasses RLS, exactly as the
-- hardening migration assumed). auth.uid() inside these still resolves the
-- caller's JWT, so per-user logic (e.g. place_bid's bidder identity) is intact.
-- search_path is already pinned to public on these by the hardening migration;
-- we re-assert it here so the functions remain safe as definers on any DB.
--
-- Idempotent / safe to re-run. Apply AFTER 20260622010000_security_advisor_hardening.sql.
-- ============================================================================

do $$
declare
  sig text;
  sigs text[] := array[
    'public.start_auction(uuid, integer)',
    'public.pause_auction()',
    'public.resume_auction()',
    'public.advance_to_next_player(uuid)',
    'public.auction_tick()',
    'public.place_bid(uuid, uuid, integer)',
    'public.settle_player(uuid)'
  ];
begin
  foreach sig in array sigs
  loop
    execute format('alter function %s security definer', sig);
    execute format('alter function %s set search_path = public', sig);
  end loop;
end $$;
