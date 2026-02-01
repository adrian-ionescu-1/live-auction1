// src/services/auctionEngine.ts
//
// All mutation of auction state goes through Supabase RPC functions.
// This file contains NO direct INSERT/UPDATE of bids, users, or
// auction_state (except the bulk operations in resetAuction which
// are admin-only and sequential-by-design).
//
// RPCs guarantee atomicity via PostgreSQL transactions:
//   place_bid          — validates + inserts bid + resets timer
//   settle_player      — finds winner, decrements balance, marks sold/unsold
//   extend_auction_time — adds seconds to time_remaining

import { Player, User, WonPlayer } from '@/types/auction.types';
import { supabase } from '@/lib/supabase';

export class AuctionEngine {
  // ─── READ OPERATIONS ──────────────────────────────────────────

  /**
   * Load all players from database, ordered by creation time.
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
        basePrice: Number(p.base_price),
      }));
    } catch (error) {
      console.error('Error in loadPlayers:', error);
      return [];
    }
  }

  /**
   * Load all users with their won players.
   *
   * @param soldPlayerIds — only players in this array are treated as won.
   *   Pass the sold_players array from auction_state. Bids on players
   *   that are still being auctioned or went unsold are ignored.
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

      const soldSet = new Set(soldPlayerIds);

      // Fetch all bids joined with player names
      const { data: bidsData } = await supabase
        .from('bids')
        .select('*, players(id, name)')
        .order('created_at', { ascending: true });

      // Determine winning bid per sold player (highest amount wins)
      const winningBidsByPlayer: Record<
        string,
        { user_id: string; amount: number; player_name: string }
      > = {};

      if (bidsData) {
        const processed = new Set<string>();
        for (const bid of bidsData) {
          if (processed.has(bid.player_id)) continue;
          processed.add(bid.player_id);

          // Only count bids for players that have actually been sold
          if (!soldSet.has(bid.player_id)) continue;

          const allForPlayer = bidsData.filter(
            (b: any) => b.player_id === bid.player_id
          );
          const highest = allForPlayer.reduce((max: any, cur: any) =>
            cur.amount > max.amount ? cur : max
          );

          winningBidsByPlayer[bid.player_id] = {
            user_id: highest.user_id,
            amount: Number(highest.amount),
            player_name: (highest.players as any)?.name || 'Unknown Player',
          };
        }
      }

      // Map won players → users
      const wonMap: Record<string, WonPlayer[]> = {};
      Object.entries(winningBidsByPlayer).forEach(([playerId, win]) => {
        if (!wonMap[win.user_id]) wonMap[win.user_id] = [];
        wonMap[win.user_id].push({
          playerId,
          playerName: win.player_name,
          amount: win.amount,
        });
      });

      // Balance is the source of truth from the DB row
      return (usersData || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        balance: Number(u.balance),
        role: u.role,
        wonPlayers: wonMap[u.id] || [],
      }));
    } catch (error) {
      console.error('Error in loadUsers:', error);
      return [];
    }
  }

  /**
   * Get the single auction_state row.
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
   * Generic auction_state update (used by admin for start/pause/resume/
   * countdown transitions and loadNextPlayer).  Mutations that need
   * atomicity (bid, settle, extend) use RPCs instead.
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

  // ─── ATOMIC RPC CALLS ─────────────────────────────────────────

  /**
   * Place a bid atomically via RPC.
   * The PostgreSQL function validates everything inside a single
   * transaction: status, current highest bid, user balance, then
   * inserts the bid and resets the timer.
   *
   * Returns { success, error, bid_id }
   */
  static async placeBidRpc(
    playerId: string,
    userId: string,
    amount: number
  ): Promise<{ success: boolean; error: string | null; bid_id?: string }> {
    try {
      const { data, error } = await supabase.rpc('place_bid', {
        p_player_id: playerId,
        p_user_id: userId,
        p_amount: amount,
      });

      if (error) {
        console.error('RPC place_bid error:', error);
        return { success: false, error: error.message };
      }

      return data as { success: boolean; error: string | null; bid_id?: string };
    } catch (error: any) {
      console.error('Error in placeBidRpc:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * Settle the current player atomically via RPC.
   * Determines the winner (or marks unsold), decrements balance,
   * and transitions to 'result' status — all in one transaction.
   *
   * Returns { winner_user_id, winning_amount, error }
   */
  static async settlePlayerRpc(
    playerId: string
  ): Promise<{ winner_user_id: string | null; winning_amount: number | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('settle_player', {
        p_player_id: playerId,
      });

      if (error) {
        console.error('RPC settle_player error:', error);
        return { winner_user_id: null, winning_amount: null, error: error.message };
      }

      return data as { winner_user_id: string | null; winning_amount: number | null; error: string | null };
    } catch (error: any) {
      console.error('Error in settlePlayerRpc:', error);
      return { winner_user_id: null, winning_amount: null, error: error?.message || 'Network error' };
    }
  }

  /**
   * Extend auction time atomically via RPC.
   * Only works when status = 'active'. Adds p_seconds to time_remaining.
   *
   * Returns { success, error }
   */
  static async extendAuctionTimeRpc(
    seconds: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('extend_auction_time', {
        p_seconds: seconds,
      });

      if (error) {
        console.error('RPC extend_auction_time error:', error);
        return { success: false, error: error.message };
      }

      return data as { success: boolean; error: string | null };
    } catch (error: any) {
      console.error('Error in extendAuctionTimeRpc:', error);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  // ─── ADMIN BULK OPERATIONS ────────────────────────────────────

  /**
   * Reset entire auction to initial state (admin only).
   *
   * Order matters: bids and balances are cleaned BEFORE auction_state
   * is set to 'idle'. That way, when the realtime event fires and other
   * clients reload users, they see clean data.
   */
  static async resetAuction(): Promise<boolean> {
    try {
      // 1. Delete all bids
      await supabase
        .from('bids')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. Reset all USER balances to 10000
      const { data: users } = await supabase.from('users').select('*');
      if (users) {
        for (const user of users) {
          if (user.role === 'USER') {
            await supabase
              .from('users')
              .update({ balance: 10000 })
              .eq('id', user.id);
          }
        }
      }

      // 3. Reset auction_state LAST — triggers realtime event
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