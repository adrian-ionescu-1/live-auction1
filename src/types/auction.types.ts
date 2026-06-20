export type UserRole = 'ADMIN' | 'USER' | 'SPECTATOR';

export interface User {
  id: string;
  username: string;
  balance: number;
  role: UserRole;
  wonPlayers: WonPlayer[];
  // A banned participant can watch the auction but cannot place bids.
  banned?: boolean;
  // Links the participant to the Discord member they were provisioned from.
  // Null only for legacy key-based rows (cleaned up by the events migration).
  profileId?: string | null;
}

export interface WonPlayer {
  playerId: string;
  playerName: string;
  amount: number;
}

export interface Player {
  id: string;
  name: string;
  wn8_30d: number;
  winrate: number;
  avg_damage: number;
  basePrice: number;
}

export interface Bid {
  userId: string;
  username: string;
  amount: number;
  timestamp: number;
}

export type AuctionStatus = 'idle' | 'countdown' | 'active' | 'paused' | 'result' | 'finished';

export interface AuctionState {
  users: User[];
  currentUserId: string | null;
  currentUserRole: UserRole | null;
  allPlayers: Player[];
  currentPlayerIndex: number;
  currentPlayer: Player | null;
  soldPlayers: string[];
  unsoldrPlayers: string[];
  status: AuctionStatus;
  countdown: number;
  timeRemaining: number;
  currentHighestBid: Bid | null;
  bidHistory: Bid[];
  resultMessage: string | null;
  currentRound: number;
  roundTotalPlayers: number;
  roundCurrentIndex: number;
}