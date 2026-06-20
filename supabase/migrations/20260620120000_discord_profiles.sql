-- ============================================================================
-- Discord account profiles.
--
-- Adds a `profiles` table for people who create a real account by signing in
-- with Discord (Supabase Auth OAuth provider). This is intentionally SEPARATE
-- from `users` (the ephemeral, key-based auction participants):
--   * `users`    -> access-key login, has an auction balance, no persistent role.
--   * `profiles` -> Discord login, a persistent account + role assigned by an
--                   admin. Every new account starts with the 'guest' role until
--                   an admin promotes it manually.
--
-- Each profile row is 1:1 with a Supabase Auth user (auth.users.id). It is
-- created automatically by a trigger the first time someone signs in with
-- Discord, so the app never has to insert it from the client.
--
-- Run in the Supabase SQL Editor. Idempotent / safe to re-run.
-- ============================================================================

-- ── Schema ───────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  discord_id  text,
  username    text,
  avatar_url  text,
  -- Default role for every new account. An admin changes this manually
  -- (Supabase Table editor / SQL) to grant a real role, e.g. 'prime'.
  role        text not null default 'guest',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Auto-create a profile on first Discord sign-in ───────────────────────────
-- Runs as SECURITY DEFINER so it can write to public.profiles regardless of the
-- caller's RLS. Discord identity lands in auth.users.raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, discord_id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'provider_id',
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'user_name',
      'guest'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- A signed-in user can read their own profile (role, username, etc.).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  using (auth.uid() = id);

-- Role assignment is admin-only and is performed with the service role
-- (Supabase dashboard / server), which bypasses RLS. We deliberately do NOT
-- grant clients UPDATE so a user can never promote their own role.
