// src/types/auction.types.ts

export interface User {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  wonPlayers: WonPlayer[];
}

export interface WonPlayer {
  playerId: string;
  playerName: string;
  amount: number;
}

export interface Player {
  id: string;
  name: string;
  role: string;
  rating: number;
  image: string;
  basePrice: number;
}

export interface Bid {
  userId: string;
  username: string;
  amount: number;
  timestamp: number;
}

export interface AuctionState {
  users: User[];
  currentUserId: string | null;
  allPlayers: Player[];
  currentPlayerIndex: number;
  currentPlayer: Player | null;
  soldPlayers: string[];
  unsoldrPlayers: string[];
  status: 'idle' | 'countdown' | 'active' | 'paused' | 'result' | 'finished';
  countdown: number;
  timeRemaining: number;
  currentHighestBid: Bid | null;
  bidHistory: Bid[];
  resultMessage: string | null;
  
  // Round-based progress tracking
  currentRound: number;
  roundTotalPlayers: number;
  roundCurrentIndex: number;
}