# 🏆 LIVE AUCTION APP – README

## 📌 Overview

**Auction App** is a real-time live auction application designed to simulate a *player auction system* (inspired by fantasy leagues / sports auctions).

The app supports **Admin**, **Spectator**, and **Users (Bidders)** with live updates, auction states, SOLD / UNSOLD messages, rounds, re-auctions, and full admin control.

The backend is powered by **Supabase (PostgreSQL + Realtime + RLS)**, while the frontend consumes live data via REST APIs and realtime subscriptions.

---

## 🧱 Architecture

### 🔹 Backend

* Supabase (PostgreSQL)
* Realtime subscriptions (`bids`, `auction_state`, `players`)
* SQL triggers & functions
* Row Level Security (RLS)

### 🔹 Frontend

* Admin Panel
* User (Bidder) Panel
* Spectator View
* Live auction messages

---

## 📂 Project File Structure

```
auction-app/
├── src/
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── AuctionControls.tsx
│   │   └── AdminUsersOverview.tsx
│   │
│   ├── user/
│   │   ├── UserDashboard.tsx
│   │   ├── BidPanel.tsx
│   │   └── SquadOverview.tsx
│   │
│   ├── spectator/
│   │   └── SpectatorView.tsx
│   │
│   ├── components/
│   │   ├── PlayerCard.tsx
│   │   ├── Timer.tsx
│   │   └── AuctionMessage.tsx
│   │
│   ├── services/
│   │   ├── supabaseClient.ts
│   │   ├── auctionService.ts
│   │   └── bidService.ts
│   │
│   ├── hooks/
│   │   ├── useAuctionState.ts
│   │   ├── useBids.ts
│   │   └── usePlayers.ts
│   │
│   ├── utils/
│   │   └── permissions.ts
│   │
│   └── App.tsx
│
├── sql/
│   ├── schema.sql
│   ├── triggers.sql
│   ├── rls.sql
│   ├── reset_full.sql
│   ├── reset_players.sql
│   └── reset_users_partial.sql
│
├── README.md
└── package.json
```

---

## 👥 User Roles

### 👑 Admin

* Start / stop auctions
* Control rounds and timers
* See buyer and final bid price
* Perform partial or full system resets

### 👀 Spectator

* Read-only view
* Sees only **SOLD / UNSOLD** messages
* No access to bidder data or prices

### 🙋 User (Bidder)

* Has a fixed budget
* Places bids in real time
* Receives SOLD / UNSOLD feedback

---

## 🗄️ Database Structure

### 📦 `users`

| Column  | Type    | Description              |
| ------- | ------- | ------------------------ |
| id      | uuid    | user id                  |
| name    | text    | display name             |
| role    | text    | admin / spectator / user |
| balance | integer | available budget         |

---

### 🔑 `auth_keys`

| Column  | Type | Description           |
| ------- | ---- | --------------------- |
| id      | uuid | key id                |
| user_id | uuid | linked user           |
| key     | text | auth token / password |

---

### 🧍 `players`

| Column     | Type    | Description        |
| ---------- | ------- | ------------------ |
| id         | uuid    | player id          |
| name       | text    | player name        |
| wn8_30d    | integer | performance metric |
| winrate    | decimal | winrate %          |
| avg_damage | integer | average damage     |
| base_price | integer | starting price     |

---

### 💰 `bids`

| Column     | Type      | Description |
| ---------- | --------- | ----------- |
| id         | uuid      | bid id      |
| player_id  | uuid      | player      |
| user_id    | uuid      | bidder      |
| amount     | integer   | bid amount  |
| created_at | timestamp | timestamp   |

---

### ⏱️ `auction_state`

| Column            | Type    | Description               |
| ----------------- | ------- | ------------------------- |
| status            | text    | idle / running / finished |
| current_player_id | uuid    | active player             |
| time_remaining    | integer | seconds                   |
| current_round     | integer | round number              |
| sold_players      | uuid[]  | sold players              |
| unsold_players    | uuid[]  | unsold players            |

---

## 🔁 Auction Flow

1. Admin starts the auction
2. `current_player_id` is set
3. Users place bids
4. Timer expires
5. If bids exist → **SOLD**
6. If no bids → **UNSOLD** → re-auction
7. Spectators see only SOLD / UNSOLD status

---

## 🧠 Core Logic Rules

* **Admin view**:

  * buyer identity
  * final price

* **User & Spectator view**:

  * auction result text only

All updates are synchronized through realtime subscriptions.

---

## 🔐 Security

* RLS enabled on all tables
* Admin has full access
* Users have restricted read/write access
* Authentication handled via `auth_keys`

---

## ♻️ Common SQL Resets

### 🔄 Reset players & bids

```sql
DELETE FROM bids;
DELETE FROM players;
```

### 🔄 Reset User Squad Overview only

```sql
DELETE FROM bids;
```

### 🔄 Full system reset

Use: **LIVE AUCTION SYSTEM - COMPLETE DATABASE RESET** script

---

## 🧪 Debug & Common Errors

### ❌ `player_id=in()` error

* Occurs when player list is empty
* Ensure players are inserted before querying bids

### ❌ Trigger dependency errors

* Use `DROP TRIGGER ... CASCADE`

---

## 📦 Best Practices

* Do not edit production data manually
* Version SQL scripts
* Always backup before resets

---

## 🚀 Project Status

✅ Fully functional
✅ Realtime enabled
✅ Admin-controlled
🛠️ Ongoing improvements (UX & messaging)

---

### Want more?

* API documentation
* Database ER diagram
* Deployment guide (Supabase)
* Environment variables setup

👉 Just tell me and I’ll extend this README.
