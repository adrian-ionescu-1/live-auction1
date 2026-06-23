-- ============================================================================
-- Realtime for the auction room (make it reproducible in code).
--
-- The live auction room relies on Postgres realtime to push phase changes and
-- bids to every client:
--   * auction_state -> status / timer / current player / round transitions;
--   * bids          -> the live bid stream;
--   * users         -> balance + role updates;
--   * players       -> SOLD/UNSOLD updates that drive winners + targets.
--
-- These tables were originally added to the supabase_realtime publication by
-- hand in the Supabase Dashboard, never in a migration. On any database where
-- that manual step is missing (a fresh project, a reset/restored DB), the room
-- looks broken: start_auction updates the DB but the client never receives the
-- change, so the auction "doesn't start" and the timer never advances even
-- though the server is ticking. This migration captures that config in code so
-- the realtime room works on every environment.
--
-- Adding a table to the publication is what lets the client receive
-- postgres_changes events for it. Row visibility still goes through RLS (these
-- tables already allow public SELECT), and the client only reads payload.new,
-- so the default replica identity is enough — we don't force REPLICA IDENTITY
-- FULL here, to avoid extra WAL on the high-write bids table under load.
--
-- Idempotent: re-running is a no-op (we skip tables already in the publication).
-- ============================================================================

do $$
declare
  tbl text;
begin
  -- The publication exists on any project with Realtime enabled; create it
  -- empty if somehow missing so the adds below never fail.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach tbl in array array['auction_state', 'bids', 'users', 'players']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
