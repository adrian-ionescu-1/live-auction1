// src/services/auctionEngine.ts

import { Player, User, Bid, AuctionStatus, PlayerWon } from '@/types/auction.types';
import { supabase, SupabaseUser, SupabasePlayer } from '@/lib/supabase';

export class AuctionEngine {
  private timerInterval: NodeJS.Timeout | null = null;
  private onTick: (() => void) | null = null;

  /**
   * Load users from Supabase
   */
  static async loadUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('username', { ascending: true });

      if (error) {
        console.error('Supabase error loading users:', error);
        throw error;
      }

      return (data as SupabaseUser[]).map((user) => ({
        id: user.id,
        username: user.username,
        balance: user.balance,
        isAdmin: user.is_admin,
        wonPlayers: [],
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  }

  /**
   * Load players from Supabase
   */
  static async loadPlayers(): Promise<Player[]> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error loading players:', error);
        throw error;
      }

      return (data as SupabasePlayer[]).map((player) => ({
        id: player.id,
        name: player.name,
        role: player.role,
        rating: player.rating,
        image: player.image,
        basePrice: player.base_price,
      }));
    } catch (error) {
      console.error('Error loading players:', error);
      return [];
    }
  }

  /**
   * Update user balance in Supabase
   */
  static async updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (error) {
        console.error('Supabase error updating balance:', error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating user balance:', error);
      return false;
    }
  }

  /**
   * Save bid to Supabase
   */
  static async saveBid(playerId: string, userId: string, amount: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bids')
        .insert({
          player_id: playerId,
          user_id: userId,
          amount: amount,
        });

      if (error) {
        console.error('Supabase error saving bid:', error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error saving bid:', error);
      return false;
    }
  }

  /**
   * Reset auction in Supabase
   */
  static async resetAuction(): Promise<boolean> {
    try {
      const { error: bidsError } = await supabase
        .from('bids')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (bidsError) {
        console.error('Supabase error deleting bids:', bidsError);
        throw bidsError;
      }

      const { error: usersError } = await supabase
        .from('users')
        .update({ balance: 10000 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (usersError) {
        console.error('Supabase error resetting balances:', usersError);
        throw usersError;
      }

      return true;
    } catch (error) {
      console.error('Error resetting auction:', error);
      return false;
    }
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
    if (status !== 'active') {
      return { valid: false, reason: 'Auction is not active' };
    }

    if (!user) {
      return { valid: false, reason: 'User not found' };
    }

    if (amount > user.balance) {
      return { valid: false, reason: 'Insufficient balance' };
    }

    if (user.balance === 0) {
      return { valid: false, reason: 'Balance is zero' };
    }

    const minBid = currentHighestBid ? currentHighestBid.amount + 1 : 0;
    if (amount <= minBid) {
      return { valid: false, reason: `Bid must be higher than ${minBid}` };
    }

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

    if (totalSold === totalPlayers) {
      return { nextIndex: currentIndex, isFinished: true };
    }

    if (currentIndex < totalPlayers - 1) {
      return { nextIndex: currentIndex + 1, isFinished: false };
    }

    if (totalUnsold > 0) {
      const firstUnsoldId = unsoldPlayers[0];
      const unsoldIndex = allPlayers.findIndex((p) => p.id === firstUnsoldId);
      return { nextIndex: unsoldIndex, isFinished: false };
    }

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

export const auctionEngine = new AuctionEngine();