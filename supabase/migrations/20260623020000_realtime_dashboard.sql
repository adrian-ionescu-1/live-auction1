-- ============================================================================
-- Realtime for the member dashboard.
--
-- The dashboard needs to react live (no page refresh) to three things:
--   * profiles        -> an admin grants/changes a member's roles;
--   * auction_events  -> a new auction goes live (or its status changes);
--   * community_events-> a new community event/list appears or its registration
--                        window opens/closes.
--
-- The auction room tables (auction_state, bids, users, players) were already
-- added to the supabase_realtime publication via the dashboard; this migration
-- makes the three dashboard tables reproducible in code too.
--
-- Adding a table to the publication is what lets the client receive
-- postgres_changes events for it. Row visibility still goes through RLS, so a
-- member only ever receives changes to rows they are allowed to read (e.g. their
-- own profile row).
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

  foreach tbl in array array['profiles', 'auction_events', 'community_events']
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

    -- REPLICA IDENTITY FULL ensures UPDATE payloads carry the full old/new row
    -- (so client filters like id=eq.<me> and role diffs work reliably).
    execute format('alter table public.%I replica identity full', tbl);
  end loop;
end $$;
