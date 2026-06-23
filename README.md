# 🏆 Live Auction & Tournaments — WoT Blitz

A real-time platform for **World of Tanks Blitz** communities: run **live auction
drafts**, host **community events** with sign-ups, and play **tournaments**
(FIFA-style leagues and registration cups with groups + a knockout bracket).
Admins run everything; members register and bid; streamers broadcast it live.

Built on **Next.js (App Router) + Supabase**, with realtime sync and a
server-authoritative timer (the heavy logic lives in Postgres functions, so the
server is the single source of truth).

🔗 **Live demo:** https://live-auction1.vercel.app/

---

## What it does

| Area | Summary |
| --- | --- |
| ⚡ **Auction drafts** | Real-time bidding under a budget — a FIFA-style draft for tanks. Server-settled, concurrency-safe, anti-snipe timer, re-auction of unsold players. |
| 🎟️ **Community events** | Admin-posted events members register for, with custom fields and optional Wargaming account validation (EU/NA/ASIA). |
| 🏆 **Tournaments — FIFA** | Built from a finished auction: bidders become national teams, results feed a live standings table (P/W/D/L/SF/SA/SD/PTS), with a podium. |
| 🎯 **Tournaments — WoT Blitz** | Teams self-register (validated rosters), get drawn into seeded groups, then play a single-elimination bracket that auto-advances by score. |
| 🎥 **Streaming** | A watch-only broadcast room (live player, timer, price, bids) for going live on YouTube / Twitch / TikTok. |
| 💬 **Contact** | Visitor and member contact forms that email the owner via Resend, plus a Discord contact card. |

---

## Tech stack

- **Next.js 16 (App Router)** · **React 19** · **TypeScript**
- **Tailwind CSS** for styling
- **Zustand** for client auction state (`src/store/auctionStore.ts`)
- **Supabase** (PostgreSQL + Realtime + Auth) — data, bidding, settlement, RLS
- **Resend** for transactional contact emails (`/api/contact`)
- **Vitest + React Testing Library** for tests (`npm test`)
- **Wargaming Blitz API** (server-side proxy) for in-game account validation

The auction's bid validation, settlement and timer live in **Postgres functions**
(SECURITY DEFINER RPCs); the client subscribes to realtime changes and computes
the displayed countdown locally. All admin writes go through guarded RPCs.

---

## Project structure

```
src/
├─ app/                          # Next.js App Router
│  ├─ _components/               # shared marketing UI (SiteHeader, CTASection,
│  │                            #   HostBanner, ui, Reveal, AccountMenu, …)
│  ├─ _data/                     # static landing-page content
│  ├─ api/                       # route handlers: blitz/* (WG proxy), contact (Resend)
│  ├─ admin/                     # admin area (gated): events, community-events,
│  │                            #   members, room, tournaments  (+ layout/page)
│  ├─ dashboard/                 # member dashboard (role-based section tabs)
│  ├─ login/  stream/            # auction room (auth gate) · streamer room
│  ├─ contact/ tournaments/      # public pages
│  │  rules/ faq/ streamers/
│  └─ layout.tsx page.tsx …      # root layout + landing + not-found + globals.css
│
├─ components/
│  ├─ auction/                   # board, bid controls/history, player cards, admin controls
│  ├─ admin/                     # member/event management, dialogs, nav, meta helpers
│  ├─ community/                 # community-event views, registration, Blitz validator, flags
│  ├─ tournaments/               # shared standings/matches + admin/ (FIFA) + wb/ (WoT Blitz)
│  ├─ contact/                   # visitor + member contact forms, Discord card
│  ├─ dashboard/                 # member nav + sections/
│  └─ stream/  auth/  ui/        # broadcast room · login · ConfirmDialog
│
├─ services/                     # data access: auctionEngine, eventsService,
│                                #   communityEventsService, tournamentsService, …
├─ lib/                          # pure helpers: standings, bracket, flags, teamFormats,
│                                #   teamSymbols, contact*, supabase client (+ *.test.ts)
├─ store/auctionStore.ts         # Zustand: realtime channels + actions + liveEvent
├─ config/auctionRules.ts        # DEFAULT_* fallbacks (real rules come from the live event)
└─ types/                        # auction / event / community-event / tournament / account

supabase/migrations/            # SQL migrations (apply in filename order)
scripts/load-test.mjs           # concurrency / load test
vitest.config.mts vitest.setup.ts
```

---

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...        # Supabase → Project Settings → API
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   WG_APPLICATION_ID=...               # optional: Wargaming Blitz account validation
   RESEND_API_KEY=...                  # optional: contact-form email (see .env.example)
   # CONTACT_TO / CONTACT_FROM are optional overrides for the contact email
   ```

   Discord sign-in is handled by **Supabase Auth** — enable the Discord provider in
   the Supabase dashboard (Authentication → Providers).

3. **Apply the SQL migrations** in the Supabase SQL editor, **in filename order**
   (they are timestamped). They are idempotent and safe to re-run. When the editor
   asks about Row Level Security, choose **"Run without RLS"** — each migration sets
   up its own RLS policies.

4. **Run**

   ```bash
   npm run dev      # http://localhost:3000
   npm run build    # production build (Turbopack)
   npm run lint     # ESLint (flat config)
   npm test         # Vitest unit + component tests
   ```

---

## Roles

| Role | Can |
| --- | --- |
| 👑 **Admin** | Run auctions (start/pause/resume/reset, extend timer); create events; build & run tournaments (draw groups, generate brackets, enter scores, finalize); manage members. |
| 🙋 **Bidder** | Bid live under a budget, track squad & balance; register a WoT Blitz tournament team; see results. |
| 🎮 **WoT Blitz** | Register for community events and tournaments. |
| 🎥 **Streamer** | Watch-only broadcast room for going live. |

Members sign in with **Discord**; an admin grants roles (a member can hold several
at once). The admin can also use a key-based login (`auth_keys` table).

---

## Auction flow

```
idle → countdown → active → result → (next player) → … → finished
```

1. Admin starts the auction (`start_auction`).
2. Each player is auctioned for a fixed time; bids in the final seconds extend the
   deadline (anti-snipe).
3. At the deadline the server settles the player: **SOLD** to the highest bidder
   (balance deducted) or **UNSOLD** → re-entered for a re-auction round.
4. Phase transitions run through `auction_tick()` — idempotent and globally
   locked — so any client advances it once the deadline passes (the timer doesn't
   depend on the admin's tab).

## Tournament flow (WoT Blitz)

```
registration → groups → knockout → done
```

Admin creates the tournament, opens registration (captains register validated
teams), **draws seeded groups** (by average starter win-rate), plays the
round-robin, **generates the bracket** from the qualifiers, enters scores (the
winner auto-advances), and **finalizes** to set the podium and archive it.

---

## Key database objects

- **Auction:** `users`, `auth_keys`, `players`, `bids`, `auction_state`
  (`phase_ends_at` is the deadline source of truth). RPCs: `place_bid`,
  `settle_player`, `auction_tick`, `advance_to_next_player`, `start/pause/resume_auction`.
- **Events:** `auction_events` (+ results), `community_events` (+ registrations).
- **Tournaments:** `tournaments`, `tournament_teams`, `tournament_team_players`,
  `tournament_team_members`, `tournament_rounds`, `tournament_matches`.
- All admin writes go through guarded `admin_*` RPCs (Discord admin JWT or the
  access-key admin); reads use open `select` RLS so the public views are read-only.

---

## Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Vitest (jsdom) + React Testing Library cover the pure logic (standings, bracket
seeding, team formats/symbols, flags, auction reserves), key components and the
`/api/contact` route. Tests are colocated as `*.test.ts(x)`.

---

## Load testing

`scripts/load-test.mjs` simulates many users bidding in simultaneous bursts and
verifies correctness (winner = highest bid, balances deducted, target cap
respected, money conserved).

```bash
npm run load-test -- --reset --players 8     # reset, then run 8 players
npm run load-test -- --users 8 --burst 6     # tune concurrency
npm run load-test -- --reset-only            # just clean up
```

> ⚠️ It mutates data — run it against a test project or clean up with `--reset`.

---

## Status

✅ Realtime auction · ✅ Server-authoritative timer · ✅ Concurrency-safe bidding
· ✅ Community events · ✅ FIFA & WoT Blitz tournaments · ✅ Contact (Resend)
· ✅ Vitest test suite · ✅ Next 16 / React 19
