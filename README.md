# Live Auction System - T3 App

A complete, production-ready FIFA-style live auction system built with Next.js App Router, TypeScript, Tailwind CSS, and Zustand.

## Features

### User Management

- 5 predefined users (USER1-USER5) + 1 ADMIN
- Each user starts with $10,000 balance
- Simple login by selecting username
- Users with $0 balance cannot bid

### Auction Flow

- One player appears at a time
- 3-2-1 countdown before each auction
- 30-second auction timer
- Timer adds +10s when bid placed with ≤15s remaining
- Highest bidder wins when timer reaches 0
- 3-second result display between players

### Bidding Rules

- Bids must be higher than current highest
- Two users cannot place the same bid amount
- First bidder at a price wins
- Insufficient balance bids are rejected
- Winner's balance is deducted automatically

### Special Rule

- Players with NO bids are pushed to end of auction list
- They reappear after all other players
- Ensures every player gets multiple chances

### Admin Controls

- Start/Pause/Resume auction
- Reset auction
- Same UI as users + extra controls

### Real-Time Updates (Simulated)

- Global state with Zustand
- All users see same state:
  - Current player
  - Highest bid & bidder
  - Time remaining
  - Their own balance

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
auction-system/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Main page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── AuctionBoard.tsx    # Player display + timer
│   │   ├── PlayerCard.tsx      # Player card component
│   │   ├── BidControls.tsx     # Bid input and buttons
│   │   ├── AdminControls.tsx   # Admin-only controls
│   │   ├── UserSelector.tsx    # Login screen
│   │   ├── UserBalance.tsx     # User info display
│   │   ├── BidHistory.tsx      # Recent bids list
│   │   └── ResultBanner.tsx    # Winner announcement
│   ├── store/
│   │   └── auctionStore.ts     # Zustand state management
│   ├── services/
│   │   └── auctionEngine.ts    # Core auction logic
│   ├── types/
│   │   └── auction.types.ts    # TypeScript types
│   └── data/
│       └── players.mock.json   # Mock player data
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.js
```

## Usage

1. **Select User**: Choose from ADMIN or USER1-USER5
2. **Start Auction**: Admin clicks "Start Auction"
3. **Place Bids**: Users enter bid amount or use quick bid buttons
4. **Watch Timer**: Timer counts down from 30s (adds +10s if bid ≤15s)
5. **View Results**: See winner announcement for 3s
6. **Next Player**: Automatically loads next player

## Code Architecture

### State Management (Zustand)

- Single global store for all auction state
- Actions for user selection, bidding, auction control
- Tick function for timer updates

### Auction Engine (Service Layer)

- Pure functions for auction logic
- User initialization
- Bid validation
- Balance deduction
- Player rotation with unsold player handling
- Timer management (isolated from UI)

### Components

- Modular, reusable React components
- Clear separation of concerns
- Disabled states for invalid actions
- Real-time updates via Zustand subscriptions

## Configuration

### Players

Edit `src/data/players.mock.json` to add/modify players:

```json
{
  "id": "p1",
  "name": "Player Name",
  "role": "Position",
  "rating": 90,
  "image": "https://...",
  "basePrice": 1000
}
```

### Timer Settings

In `src/store/auctionStore.ts`:

```typescript
const COUNTDOWN_DURATION = 3; // Countdown seconds
const AUCTION_DURATION = 30; // Auction seconds
const RESULT_DISPLAY_DURATION = 3; // Result display seconds
```

### Users

In `src/services/auctionEngine.ts`:

```typescript
static initializeUsers(): User[] {
  return [
    { id: 'admin', username: 'ADMIN', balance: 10000, isAdmin: true },
    { id: 'u1', username: 'USER1', balance: 10000, isAdmin: false },
    // Add more users...
  ];
}
```

## Future Extensions (Supabase Integration)

The architecture is ready for Supabase integration:

1. Replace mock users with Supabase Auth
2. Store players in Supabase Database
3. Use Supabase Realtime for live updates
4. Persist auction history and results
5. Add user profiles and statistics

## Technical Notes

- **No Authentication**: Users select username (add auth later)
- **No Backend**: All logic client-side with Zustand
- **No Database**: Mock data in JSON file
- **Timer Logic**: Isolated in service layer, not dependent on UI renders
- **Production-Ready**: Clean code, TypeScript, comprehensive comments

## License

MIT
