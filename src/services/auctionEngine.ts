// src/services/auctionEngine.ts

import { Player, User, Bid, AuctionState, WonPlayer } from '@/types/auction.types';
import { supabase } from '@/lib/supabase';

export class AuctionEngine {
  static async loadPlayers(): Promise<Player[]> {
    const { data, error } = await supabase.from('players').select('*');
    
    if (error) {
      console.error('Error loading players:', error);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      rating: p.rating,
      image: p.image,
      basePrice: p.base_price,
    }));
  }

  static async loadUsers(): Promise<User[]> {
    const { data: usersData, error: usersError } = await supabase.from('users').select('*');
    
    if (usersError) {
      console.error('Error loading users:', usersError);
      return [];
    }

    const { data: bidsData } = await supabase
      .from('bids')
      .select('*, players(id, name)')
      .order('amount', { ascending: false });

    const winningBidsByPlayer: Record<string, { user_id: string; amount: number; player_name: string }> = {};

    if (bidsData) {
      for (const bid of bidsData) {
        if (!winningBidsByPlayer[bid.player_id]) {
          winningBidsByPlayer[bid.player_id] = {
            user_id: bid.user_id,
            amount: bid.amount,
            player_name: (bid.players as any)?.name || 'Unknown Player',
          };
        }
      }
    }

    const userWonPlayersMap: Record<string, WonPlayer[]> = {};
    
    Object.entries(winningBidsByPlayer).forEach(([playerId, winData]) => {
      if (!userWonPlayersMap[winData.user_id]) {
        userWonPlayersMap[winData.user_id] = [];
      }
      userWonPlayersMap[winData.user_id].push({
        playerId,
        playerName: winData.player_name,
        amount: winData.amount,
      });
    });

    return (usersData || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      balance: u.balance,
      isAdmin: u.is_admin,
      wonPlayers: userWonPlayersMap[u.id] || [],
    }));
  }

  static canPlaceBid(
    user: User | undefined,
    amount: number,
    currentHighestBid: Bid | null,
    status: AuctionState['status']
  ): { valid: boolean; reason?: string } {
    if (!user) {
      return { valid: false, reason: 'User not found' };
    }

    if (status !== 'active') {
      return { valid: false, reason: 'Auction is not active' };
    }

    if (amount > user.balance) {
      return { valid: false, reason: 'Insufficient balance' };
    }

    const minBid = currentHighestBid ? currentHighestBid.amount + 1 : 0;
    if (amount < minBid) {
      return { valid: false, reason: `Bid must be at least $${minBid}` };
    }

    return { valid: true };
  }

  static processBid(
    userId: string,
    username: string,
    amount: number,
    currentTimeRemaining: number
  ): { bid: Bid; newTimeRemaining: number } {
    const bid: Bid = {
      userId,
      username,
      amount,
      timestamp: Date.now(),
    };

    const newTimeRemaining = Math.max(currentTimeRemaining, 10);

    return { bid, newTimeRemaining };
  }

  static async saveBid(playerId: string, userId: string, amount: number): Promise<boolean> {
    const { error } = await supabase.from('bids').insert({
      player_id: playerId,
      user_id: userId,
      amount,
    });

    if (error) {
      console.error('Error saving bid:', error);
      return false;
    }

    return true;
  }

  static generateResultMessage(player: Player, winner: Bid | null): string {
    if (winner) {
      return `${player.name} SOLD to ${winner.username} for $${winner.amount.toLocaleString()}!`;
    }
    return `${player.name} UNSOLD`;
  }

  static deductBalanceAndAddPlayer(
    users: User[],
    winnerId: string,
    amount: number,
    player: Player
  ): User[] {
    return users.map((u) => {
      if (u.id === winnerId) {
        const wonPlayer: WonPlayer = {
          playerId: player.id,
          playerName: player.name,
          amount,
        };
        return {
          ...u,
          balance: u.balance - amount,
          wonPlayers: [...u.wonPlayers, wonPlayer],
        };
      }
      return u;
    });
  }

  static async updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user balance:', error);
      return false;
    }

    return true;
  }

  static getNextPlayerIndex(
    currentIndex: number,
    allPlayers: Player[],
    soldPlayers: string[],
    unsoldPlayers: string[]
  ): { nextIndex: number; isFinished: boolean } {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= allPlayers.length) {
      return { nextIndex: -1, isFinished: true };
    }

    return { nextIndex, isFinished: false };
  }

  static async resetAuction(): Promise<boolean> {
    try {
      // Delete all bids
      await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Reset user balances
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) {
        for (const user of usersData) {
          await supabase
            .from('users')
            .update({ balance: 10000 })
            .eq('id', user.id);
        }
      }

      // Reset auction_state
      const { data: auctionStateData } = await supabase
        .from('auction_state')
        .select('*')
        .limit(1)
        .single();

      if (auctionStateData) {
        await supabase
          .from('auction_state')
          .update({
            status: 'idle',
            current_player_id: null,
            current_player_index: -1,
            countdown: 3,
            time_remaining: 30,
            current_highest_bid_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', auctionStateData.id);
      }

      return true;
    } catch (error) {
      console.error('Error resetting auction:', error);
      return false;
    }
  }
}

class AuctionTimerManager {
  private timerId: NodeJS.Timeout | null = null;

  startTimer(callback: () => void): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    this.timerId = setInterval(callback, 1000);
  }

  pauseTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  resumeTimer(callback: () => void): void {
    this.startTimer(callback);
  }

  stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const auctionEngine = new AuctionTimerManager();