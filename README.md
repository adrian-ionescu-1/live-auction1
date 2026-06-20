# 🏆 Live Auction App

Real-time player auction for WoT Blitz tournaments — FIFA-style draft. Admins run
the auction, users bid live under a budget, spectators watch. Built on Next.js +
Supabase with realtime sync and a server-authoritative timer.

🔗 **Live demo:** https://live-auction1.vercel.app/

---

## Tech stack

- **Next.js 14 (App Router)** + **React 18** + **TypeScript**
- **Tailwind CSS** for styling
- **Zustand** for client state (`src/store/auctionStore.ts`)
- **Supabase** (PostgreSQL + Realtime) for data, bidding and settlement logic

The heavy logic (bid validation, settlement, the timer) lives in **Postgres
functions** so it is the single source of truth; the client subscribes to
realtime changes and computes the displayed countdown locally.

---

## Project structure

```
src/
├─ app/                      # Next.js App Router
│  ├─ _components/           # marketing UI (SiteHeader, CTASection, ui, Reveal, …)
│  ├─ _data/                 # static content for the landing page
│  ├─ login/                 # the auction room (auth gate + live app)
│  ├─ tournaments|rules|     # public info pages
│  │  faq|spectator/
│  ├─ layout.tsx page.tsx    # root layout + landing page
│  ├─ not-found.tsx globals.css
│
├─ components/
│  ├─ auction/               # AuctionBoard, BidControls, BidHistory, PlayerCard,
│  │                         # TargetProgress, ResultBanner, ResultsView,
│  │                         # UserBalance, AdminControls, AdminUserCards
│  ├─ auth/                  # LoginPage
│  └─ ui/                    # ConfirmDialog
│
├─ store/auctionStore.ts     # Zustand store: realtime channels + actions + liveEvent
├─ services/                 # auctionEngine, authService, eventsService, membersService
├─ lib/supabase.ts           # Supabase client
├─ config/auctionRules.ts    # DEFAULT_* fallbacks (real rules come from the live event)
└─ types/                    # auction.types, event.types, account.types

supabase/migrations/         # SQL migrations (run them in the Supabase SQL editor)
scripts/load-test.mjs        # concurrency / load test
```

---

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Configure Supabase** — copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   (Find these in the Supabase dashboard → Project Settings → API.)

3. **Apply the SQL migrations** in the Supabase SQL editor, in order:

   - `supabase/migrations/20260619120000_fix_auction_concurrency.sql`
   - `supabase/migrations/20260619130000_server_authoritative_timer.sql`

4. **Run**

   ```bash
   npm run dev      # http://localhost:3000
   npm run build    # production build
   npm run lint
   ```

---

## Roles

| Role          | Can                                                                 |
| ------------- | ------------------------------------------------------------------- |
| 👑 **Admin**     | Start / pause / resume / reset the auction, extend the timer, see every team's squad and budget |
| 🙋 **User**      | Bid in real time under a fixed budget, track their squad and remaining balance |
| 👀 **Spectator** | Read-only live view (no bidding)                                    |

Login is **key-based**: each access key maps to a user (`auth_keys` table).

---

## Auction flow

`idle → countdown → active → result → (next player) → … → finished`

1. Admin starts the auction (`start_auction`).
2. Each player is auctioned for a fixed time; bids within the last seconds
   extend the deadline (anti-snipe).
3. When the deadline passes, the server settles the player:
   - **SOLD** to the highest bidder (balance is deducted), or
   - **UNSOLD** (no bids) → re-entered for a re-auction round.
4. Phase transitions are driven by `auction_tick()` — idempotent and globally
   locked, so any client advances it once the deadline passes. The timer no
   longer depends on the admin's browser tab.

---

## Key database objects

- **Tables:** `users`, `auth_keys`, `players`, `bids`, `auction_state`
  (`auction_state.phase_ends_at` is the deadline source of truth;
  `players.sold_to_user_id` / `sold_amount` record winners).
- **Functions (RPC):** `place_bid` / `place_bid_core` (validated, per-player
  locked), `settle_player` (idempotent), `auction_tick`,
  `advance_to_next_player`, `start_auction`, `pause_auction`, `resume_auction`,
  `extend_auction_time`.

---

## Load testing

`scripts/load-test.mjs` simulates many users bidding in simultaneous bursts,
drives the auction, and verifies correctness (winner = highest bid, balances
deducted correctly, target cap respected, money conserved).

```bash
npm run load-test -- --reset --players 8     # reset, then run 8 players
npm run load-test -- --users 8 --burst 6     # tune concurrency
npm run load-test -- --reset-only            # just clean up
```

> ⚠️ It mutates data — run it against a test project or clean up with `--reset`.

---

## Status

✅ Realtime auction · ✅ Server-authoritative timer · ✅ Concurrency-safe bidding
· 🛠️ Ongoing UX polish
