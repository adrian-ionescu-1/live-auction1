// src/services/auctionEngine.ts

import { Player, User, Bid, WonPlayer } from '@/types/auction.types';
import { supabase } from '@/lib/supabase';

export class AuctionEngine {
  /**
   * Load all players from database
   */
  static async loadPlayers(): Promise<Player[]> {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: true });

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
    } catch (error) {
      console.error('Error in loadPlayers:', error);
      return [];
    }
  }

  /**
   * Load all users with their won players
   */
  static async loadUsers(): Promise<User[]> {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('username', { ascending: true });

      if (usersError) {
        console.error('Error loading users:', usersError);
        return [];
      }

      // Get all bids with player information
      const { data: bidsData } = await supabase
        .from('bids')
        .select('*, players(id, name)')
        .order('created_at', { ascending: true });

      // Determine winning bids for each player (highest bid wins)
      const winningBidsByPlayer: Record<string, { user_id: string; amount: number; player_name: string }> = {};

      if (bidsData) {
        const playerIds = new Set<string>();

        for (const bid of bidsData) {
          if (!playerIds.has(bid.player_id)) {
            // Get all bids for this player
            const allBidsForPlayer = bidsData.filter((b: any) => b.player_id === bid.player_id);
            
            // Find the highest bid
            const highestBid = allBidsForPlayer.reduce((max: any, current: any) =>
              current.amount > max.amount ? current : max
            );

            winningBidsByPlayer[bid.player_id] = {
              user_id: highestBid.user_id,
              amount: highestBid.amount,
              player_name: (highestBid.players as any)?.name || 'Unknown Player',
            };

            playerIds.add(bid.player_id);
          }
        }
      }

      // Map won players to users
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

      // Build user objects
      return (usersData || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        balance: u.balance,
        role: u.role,
        wonPlayers: userWonPlayersMap[u.id] || [],
      }));
    } catch (error) {
      console.error('Error in loadUsers:', error);
      return [];
    }
  }

  /**
   * Update user balance in database
   */
  static async updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', userId);

      if (error) {
        console.error('Error updating balance:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserBalance:', error);
      return false;
    }
  }

  /**
   * Save a bid to database
   */
  static async saveBid(playerId: string, userId: string, amount: number): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('bids')
        .insert({
          player_id: playerId,
          user_id: userId,
          amount: amount,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving bid:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Error in saveBid:', error);
      return null;
    }
  }

  /**
   * Get current auction state from database
   */
  static async getAuctionState(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('auction_state')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading auction state:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getAuctionState:', error);
      return null;
    }
  }

  /**
   * Update auction state in database
   */
  static async updateAuctionState(updates: any): Promise<boolean> {
    try {
      const state = await this.getAuctionState();
      if (!state) {
        console.error('No auction state found to update');
        return false;
      }

      const { error } = await supabase
        .from('auction_state')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', state.id);

      if (error) {
        console.error('Error updating auction state:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateAuctionState:', error);
      return false;
    }
  }

  /**
   * Reset entire auction to initial state
   */
  static async resetAuction(): Promise<boolean> {
    try {
      // Delete all bids
      await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Reset all USER balances to 10000 (don't touch ADMIN or SPECTATOR)
      const { data: users } = await supabase.from('users').select('*');
      if (users) {
        for (const user of users) {
          if (user.role === 'USER') {
            await supabase.from('users').update({ balance: 10000 }).eq('id', user.id);
          }
        }
      }

      // Reset auction state to initial values
      await this.updateAuctionState({
        status: 'idle',
        current_player_id: null,
        current_player_index: -1,
        countdown: 3,
        time_remaining: 30,
        current_highest_bid_id: null,
        current_round: 1,
        round_total_players: 0,
        round_current_index: 0,
        sold_players: [],
        unsold_players: [],
      });

      return true;
    } catch (error) {
      console.error('Error resetting auction:', error);
      return false;
    }
  }
}