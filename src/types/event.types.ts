// Types for named auction events (licitații). An event captures the rules the
// admin sets once (player limit, entry fee, margin) from which the reserve is
// derived, and the set of Discord members allowed to bid in it. A single event
// is "live" at a time and the auction room runs against it.

export interface AuctionEvent {
  id: string;
  name: string;
  /** How many players each member must take from the auction (the target). */
  playerLimit: number;
  /** Entry fee paid per player. */
  entryFee: number;
  /** Safety margin added on top of the entry fee. */
  margin: number;
  /** Derived: entryFee + margin. The minimum a member must keep per slot. */
  reservePerPlayer: number;
  /** Derived: playerLimit * reservePerPlayer. The minimum budget per member. */
  totalReserve: number;
  /** Spendable budget given to each member. Never below totalReserve. */
  memberBudget: number;
  /** Seconds each player stays on the block (the active phase length). */
  playerDuration: number;
  /** When this many seconds (or fewer) remain, a bid extends the timer. */
  extendThreshold: number;
  /** Seconds a qualifying bid adds (capped at playerDuration). */
  extendAmount: number;
  /** Opening minimum bid per player. 0 = fall back to the player's base price. */
  bidStart: number;
  /** Preset "+N" increment buttons bidders get for this event. */
  bidIncrements: number[];
  status: "live" | "finished";
  createdAt: string;
  /** When the event became enterable (went live / was reopened). */
  availableAt: string | null;
  /**
   * When bidders may start entering the room. null = open immediately; a future
   * timestamp keeps the event created but closed until then (bidders see a
   * countdown). Set by the admin at creation.
   */
  opensAt: string | null;
  /** When the auction closed, or null while still open. */
  finishedAt: string | null;
}

/** A member enrolled in an event (joined with their profile for display). */
export interface EventMember {
  profileId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  banned: boolean;
}

/** A settled result: one player won by a member in an event, for an amount. */
export interface EventResult {
  playerId: string;
  playerName: string;
  userId: string | null;
  username: string;
  amount: number;
  /** True when handed out by the random leftover distribution (free bonus). */
  viaRandom: boolean;
  wonAt: string;
}

/** The signed-in member's results within one event (for the dashboard). */
export interface MyEventResults {
  eventId: string;
  eventName: string;
  status: "live" | "finished";
  finishedAt: string | null;
  results: EventResult[];
}

/**
 * Reserve to keep at a given moment so the target stays reachable. Mirrors the
 * server rule in place_bid: reserve only the slots remaining AFTER the one being
 * bid on. Pass remainingAfterCurrent = playerLimit - wonCount - 1.
 */
export function reserveForSlots(remainingSlots: number, reservePerPlayer: number): number {
  return Math.max(0, remainingSlots) * reservePerPlayer;
}
