-- ============================================================================
-- Drop the legacy UNIQUE constraint on public.users.username.
--
-- public.users predates Discord login, when a participant WAS their username, so
-- the column was created UNIQUE (constraint users_username_key). Identity is now
-- users.profile_id (a participant is linked to a Discord profile), and the shown
-- name is coalesce(profiles.display_name, profiles.username) — which two distinct
-- members can legitimately share (same Discord name, or the same admin override).
--
-- Because admin_create_event provisions every bidder by inserting into
-- public.users (username, …), two members with the same effective name hit:
--   duplicate key value violates unique constraint "users_username_key"
-- and the whole event creation aborts.
--
-- Cards/rows are keyed by users.id, never by username, so the column only needs
-- to be a label. Dropping the unique constraint fixes event creation without any
-- downstream change.
--
-- Run in the Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

alter table public.users drop constraint if exists users_username_key;

-- Cover the (unlikely) case it was a standalone unique index rather than a
-- table constraint under the same name.
drop index if exists public.users_username_key;
