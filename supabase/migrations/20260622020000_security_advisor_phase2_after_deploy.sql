-- ============================================================================
-- Security advisor hardening (phase 2 — RUN ONLY AFTER THE NEW CODE IS DEPLOYED).
--
-- Phase 1 left two always-true write policies in place because the OLD client
-- still wrote them directly during the access-key admin login:
--   * public.users   INSERT  (creating the admin's participant row)
--   * public.auth_keys UPDATE (marking the key used)
--
-- Once the new code is live, that login goes through the key_login() RPC
-- (SECURITY DEFINER, owner-exempt from RLS), so the client no longer writes
-- these tables directly. Dropping the two policies then clears the last
-- "RLS Policy Always True" warnings without breaking login.
--
-- ⚠️  Order: run 20260622010000 → deploy the app → test the admin key login →
--     THEN run this file. If you run it before the new code is deployed, the old
--     direct-write login will fail.
--
-- Idempotent / safe to re-run.
-- ============================================================================

drop policy if exists "Allow public insert to users" on public.users;
drop policy if exists "Allow public update to auth_keys" on public.auth_keys;
