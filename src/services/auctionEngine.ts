// src/services/auctionEngine.ts

import { Player, User, Bid, AuctionStatus, PlayerWon } from '@/types/auction.types';

export class AuctionEngine {
  private timerInterval: NodeJS.Timeout | null = null;
  private onTick: (() => void) | null = null;

  /**
   * Initialize predefined users
   */
  static initializeUsers(): User[] {
    return [
      { id: 'admin', username: 'ADMIN', balance: 10000, isAdmin: true, wonPlayers: [] },
      { id: 'u1', username: 'USER1', balance: 10000, isAdmin: false, wonPlayers: [] },
      { id: 'u2', username: 'USER2', balance: 10000, isAdmin: false, wonPlayers: [] },
      { id: 'u3', username: 'USER3', balance: 10000, isAdmin: false, wonPlayers: [] },
      { id: 'u4', username: 'USER4', balance: 10000, isAdmin: false, wonPlayers: [] },
      { id: 'u5', username: 'USER5', balance: 10000, isAdmin: false, wonPlayers: [] },
    ];
  }

  /**
   * Load players from mock data
   */
  static async loadPlayers(): Promise<Player[]> {
    const playersData = await import('@/data/players.mock.json');
    return playersData.default as Player[];
  }

  /**
   * Validate if a bid can be placed
   */
  static canPlaceBid(
    user: User | undefined,
    amount: number,
    currentHighestBid: Bid | null,
    status: AuctionStatus
  ): { valid: boolean; reason?: string } {
    // Check if auction is active
    if (status !== 'active') {
      return { valid: false, reason: 'Auction is not active' };
    }

    // Check if user exists
    if (!user) {
      return { valid: false, reason: 'User not found' };
    }

    // Check if user has enough balance
    if (amount > user.balance) {
      return { valid: false, reason: 'Insufficient balance' };
    }

    // Check if balance is zero
    if (user.balance === 0) {
      return { valid: false, reason: 'Balance is zero' };
    }

    // Check if bid is higher than current highest
    const minBid = currentHighestBid ? currentHighestBid.amount + 1 : 0;
    if (amount <= minBid) {
      return { valid: false, reason: `Bid must be higher than ${minBid}` };
    }

    // Check if bid is exactly the same as current highest (tie-breaker rule)
    if (currentHighestBid && amount === currentHighestBid.amount) {
      return { valid: false, reason: 'Bid amount already taken' };
    }

    return { valid: true };
  }

  /**
   * Process a bid
   */
  static processBid(
    userId: string,
    username: string,
    amount: number,
    timeRemaining: number
  ): { bid: Bid; newTimeRemaining: number } {
    const bid: Bid = {
      userId,
      username,
      amount,
      timestamp: Date.now(),
    };

    // If time <= 15s, add 10s
    let newTimeRemaining = timeRemaining;
    if (timeRemaining <= 15) {
      newTimeRemaining = timeRemaining + 10;
    }

    return { bid, newTimeRemaining };
  }

  /**
   * Deduct balance from winner and add player to their won list
   */
  static deductBalanceAndAddPlayer(
    users: User[],
    winnerId: string,
    amount: number,
    player: Player
  ): User[] {
    return users.map((user) => {
      if (user.id === winnerId) {
        const playerWon: PlayerWon = {
          playerId: player.id,
          playerName: player.name,
          amount: amount,
        };
        return {
          ...user,
          balance: user.balance - amount,
          wonPlayers: [...user.wonPlayers, playerWon],
        };
      }
      return user;
    });
  }

  /**
   * Generate result message
   */
  static generateResultMessage(
    player: Player,
    winner: Bid | null
  ): string {
    if (!winner) {
      return `No bids for ${player.name}. Player will be re-auctioned.`;
    }
    return `${player.name} won by ${winner.username} for $${winner.amount.toLocaleString()}`;
  }

  /**
   * Get next player index, handling unsold players
   */
  static getNextPlayerIndex(
    currentIndex: number,
    allPlayers: Player[],
    soldPlayers: string[],
    unsoldPlayers: string[]
  ): { nextIndex: number; isFinished: boolean } {
    const totalPlayers = allPlayers.length;
    const totalSold = soldPlayers.length;
    const totalUnsold = unsoldPlayers.length;

    // If all players are sold, auction is finished
    if (totalSold === totalPlayers) {
      return { nextIndex: currentIndex, isFinished: true };
    }

    // If we haven't gone through all players yet
    if (currentIndex < totalPlayers - 1) {
      return { nextIndex: currentIndex + 1, isFinished: false };
    }

    // If we're at the end of the original list and have unsold players
    if (totalUnsold > 0) {
      // Find the first unsold player
      const firstUnsoldId = unsoldPlayers[0];
      const unsoldIndex = allPlayers.findIndex((p) => p.id === firstUnsoldId);
      return { nextIndex: unsoldIndex, isFinished: false };
    }

    // All players processed
    return { nextIndex: currentIndex, isFinished: true };
  }

  /**
   * Start the auction timer
   */
  startTimer(tickCallback: () => void): void {
    this.onTick = tickCallback;
    this.timerInterval = setInterval(() => {
      if (this.onTick) {
        this.onTick();
      }
    }, 1000);
  }

  /**
   * Stop the auction timer
   */
  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.onTick = null;
  }

  /**
   * Pause timer
   */
  pauseTimer(): void {
    this.stopTimer();
  }

  /**
   * Resume timer
   */
  resumeTimer(tickCallback: () => void): void {
    this.startTimer(tickCallback);
  }
}

// Singleton instance
export const auctionEngine = new AuctionEngine();