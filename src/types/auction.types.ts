// src/types/auction.types.ts

export interface Player {
  id: string;
  name: string;
  role: string;
  rating: number;
  image: string;
  basePrice: number;
}

export interface User {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  wonPlayers: PlayerWon[];
}

export interface PlayerWon {
  playerId: string;
  playerName: string;
  amount: number;
}

export interface Bid {
  userId: string;
  username: string;
  amount: number;
  timestamp: number;
}

export type AuctionStatus = 'idle' | 'countdown' | 'active' | 'paused' | 'result' | 'finished';

export interface AuctionState {
  // Users
  users: User[];
  currentUserId: string | null;
  
  // Players
  allPlayers: Player[];
  currentPlayerIndex: number;
  currentPlayer: Player | null;
  soldPlayers: string[]; // player IDs
  unsoldrPlayers: string[]; // player IDs to be re-auctioned
  
  // Auction state
  status: AuctionStatus;
  countdown: number;
  timeRemaining: number;
  
  // Bids
  currentHighestBid: Bid | null;
  bidHistory: Bid[];
  
  // Result
  resultMessage: string | null;
  
  // Actions
  selectUser: (userId: string) => void;
  startAuction: () => void;
  pauseAuction: () => void;
  resumeAuction: () => void;
  placeBid: (amount: number) => boolean;
  tick: () => void;
  reset: () => void;
}