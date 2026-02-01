// src/services/auctionEngine.ts

import { Player, User, WonPlayer } from '@/types/auction.types';
import { supabase } from '@/lib/supabase';

export class AuctionEngine {
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
        name: p.name || 'Unknown Player',
        wn8_30d: Number(p.wn8_30d) || 0,
        winrate: Number(p.winrate) || 0,
        avg_damage: Number(p.avg_damage) || 0,
        basePrice: Number(p.base_price) || 100,
      }));
    } catch (error) {
      console.error('Error in loadPlayers:', error);
      return [];
    }
  }

  /**
   * Load all users with their wonPlayers calculated based on sold players
   * @param soldPlayerIds - Optional array of player IDs that have been sold
   */
  static async loadUsers(soldPlayerIds: string[] = []): Promise<User[]> {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('username', { ascending: true });

      if (usersError) {
        console.error('Error loading users:', usersError);
        return [];
      }

      // Only fetch bids for sold players if soldPlayerIds is provided
      let bidsData: any[] = [];
      if (soldPlayerIds.length > 0) {
        const { data } = await supabase
          .from('bids')
          .select('*, players(id, name)')
          .in('player_id', soldPlayerIds)
          .order('created_at', { ascending: true });
        
        bidsData = data || [];
      } else {
        // If no soldPlayerIds, fetch all bids
        const { data } = await supabase
          .from('bids')
          .select('*, players(id, name)')
          .order('created_at', { ascending: true });
        
        bidsData = data || [];
      }

      const winningBidsByPlayer: Record<string, { user_id: string; amount: number; player_name: string }> = {};

      if (bidsData && bidsData.length > 0) {
        const playerIds = new Set<string>();

        for (const bid of bidsData) {
          if (!playerIds.has(bid.player_id)) {
            const allBidsForPlayer = bidsData.filter((b: any) => b.player_id === bid.player_id);
            
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
        role: u.role,
        wonPlayers: userWonPlayersMap[u.id] || [],
      }));
    } catch (error) {
      console.error('Error in loadUsers:', error);
      return [];
    }
  }

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

  static async resetAuction(): Promise<boolean> {
    try {
      await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const { data: users } = await supabase.from('users').select('*');
      if (users) {
        for (const user of users) {
          if (user.role === 'USER') {
            await supabase.from('users').update({ balance: 10000 }).eq('id', user.id);
          }
        }
      }

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

  /**
   * RPC: Place a bid for a player
   * This handles all validation and timer extension logic server-side
   */
  static async placeBidRpc(
    playerId: string,
    userId: string,
    amount: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('place_bid', {
        p_player_id: playerId,
        p_user_id: userId,
        p_amount: amount,
      });

      if (error) {
        console.error('place_bid RPC error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error in placeBidRpc:', error);
      return { success: false, error: error.message || 'Failed to place bid' };
    }
  }

  /**
   * RPC: Extend auction time
   * This adds seconds to the current time_remaining
   */
  static async extendAuctionTimeRpc(
    seconds: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('extend_auction_time', {
        p_seconds: seconds,
      });

      if (error) {
        console.error('extend_auction_time RPC error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error in extendAuctionTimeRpc:', error);
      return { success: false, error: error.message || 'Failed to extend time' };
    }
  }

  /**
   * RPC: Settle the current player
   * This determines the winner, updates balances, and transitions to result state
   */
  static async settlePlayerRpc(
    playerId: string
  ): Promise<{
    success: boolean;
    error: string | null;
    winner_user_id: string | null;
    winning_amount: number | null;
  }> {
    try {
      const { data, error } = await supabase.rpc('settle_player', {
        p_player_id: playerId,
      });

      if (error) {
        console.error('settle_player RPC error:', error);
        return {
          success: false,
          error: error.message,
          winner_user_id: null,
          winning_amount: null,
        };
      }

      return {
        success: true,
        error: null,
        winner_user_id: data?.winner_user_id || null,
        winning_amount: data?.winning_amount || null,
      };
    } catch (error: any) {
      console.error('Error in settlePlayerRpc:', error);
      return {
        success: false,
        error: error.message || 'Failed to settle player',
        winner_user_id: null,
        winning_amount: null,
      };
    }
  }
}