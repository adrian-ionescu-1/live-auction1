# Discord sign-in — setup checklist

The app supports two separate login methods:

- **Access key** — ephemeral auction participants (unchanged, no account).
- **Discord** — real accounts. Signing in with Discord creates a `profiles` row
  with the `guest` role; an admin promotes the role manually.

The code is already wired up. To make Discord sign-in work live, complete the
steps below once (you need access to the Discord Developer Portal and the
Supabase dashboard).

## 1. Create a Discord application

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. Open **OAuth2** and copy the **Client ID** and **Client Secret**.
3. Under **OAuth2 → Redirects**, add the Supabase callback URL (from step 2):
   `https://<your-project-ref>.supabase.co/auth/v1/callback`

## 2. Enable Discord in Supabase

1. Supabase dashboard → **Authentication → Providers → Discord** → enable it.
2. Paste the Discord **Client ID** and **Client Secret**, then save.
   (The Redirect URL shown here is the one you pasted into Discord above.)

## 3. Allow the app's redirect targets

Supabase only redirects back to URLs on its allowlist.

- Supabase dashboard → **Authentication → URL Configuration**.
- **Site URL**: your production URL (e.g. `https://your-app.vercel.app`).
- **Redirect URLs** — add both:
  - `http://localhost:3000/**` (local dev)
  - `https://your-app.vercel.app/**` (production)

## 4. Create the profiles table

Run `supabase/migrations/20260620120000_discord_profiles.sql` in the
**Supabase SQL Editor**. It creates the `profiles` table, the auto-create
trigger, and the RLS policies. It is idempotent (safe to re-run).

## 5. Test

1. `npm run dev`, open `/login`, click **Sign in with Discord**.
2. Authorize on Discord → you are redirected to `/dashboard`.
3. In Supabase → **Table editor → profiles** you should see a new row with
   `role = 'guest'`.

## Assigning a real role (admin)

For now, role assignment is manual:

- Supabase → **Table editor → profiles** → edit the user's `role`
  (e.g. `guest` → `prime`), or run:
  ```sql
  update public.profiles set role = 'prime' where username = 'TheUsername';
  ```

A self-serve admin UI for role management can be added later.
