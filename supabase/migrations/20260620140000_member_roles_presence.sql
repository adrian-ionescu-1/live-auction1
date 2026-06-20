-- ============================================================================
-- Member roles directory: admin-readable profiles + a ban flag.
--
-- Builds on 20260620120000_discord_profiles.sql. Two changes:
--   1. `banned` flag on profiles (UI shows a red dot now; the admin toggle / the
--      bid-blocking logic comes later).
--   2. A read policy so the admin members directory can list every member.
--      The admin signs in with an access key (anon Supabase client, no JWT), so
--      the original "select own row" policy returned nothing for them. Reads are
--      limited to the non-sensitive columns the app actually selects
--      (username, avatar, role, banned) — never discord_id.
--
-- Role values are free text. New accounts start as 'guest'; an admin promotes
-- them to 'bidder' (allowed to bid) or any other role.
--
-- Run in the Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

-- ── Ban flag ─────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists banned boolean not null default false;

-- ── Make the members directory readable ──────────────────────────────────────
-- Anyone (including the anon access-key admin) can read profiles. This is a
-- members directory of usernames/roles/avatars; it is not sensitive. Role and
-- ban changes still require the service role, so users can't edit themselves.
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
  on public.profiles
  for select
  using (true);
