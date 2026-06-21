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
        battles: Number(p.battles) || 0,
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
   * Load all users with their wonPlayers.
   * IMPORTANT: wonPlayers is derived from players.sold_to_user_id / sold_amount (server-truth),
   * not from bids, so it stays correct under high bid volume and re-auctions.
   *
   * @param soldPlayerIds - optional list of sold player IDs (e.g. from auction_state.sold_players).
   * When provided and non-empty, the query is restricted to those IDs for faster loading.
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

      // Source of truth: players table fields set by settle_player
      let soldQuery = supabase
        .from('players')
        .select('id, name, sold_to_user_id, sold_amount')
        .not('sold_to_user_id', 'is', null);

      if (soldPlayerIds.length > 0) {
        soldQuery = soldQuery.in('id', soldPlayerIds);
      }

      const { data: soldPlayersData, error: soldError } = await soldQuery;

      if (soldError) {
        console.error('Error loading sold players:', soldError);
      }

      const userWonPlayersMap: Record<string, WonPlayer[]> = {};

      for (const p of soldPlayersData || []) {
        const uid = p.sold_to_user_id as string | null;
        if (!uid) continue;

        if (!userWonPlayersMap[uid]) userWonPlayersMap[uid] = [];
        userWonPlayersMap[uid].push({
          playerId: p.id as string,
          playerName: (p.name as string) || 'Unknown Player',
          amount: Number(p.sold_amount) || 0,
        });
      }

      return (usersData || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        balance: u.balance,
        role: u.role,
        wonPlayers: userWonPlayersMap[u.id] || [],
        banned: !!u.banned,
        profileId: u.profile_id ?? null,
      }));
    } catch (error) {
      console.error('Error in loadUsers:', error);
      return [];
    }
  }

  /**
   * RPC: a signed-in Discord member with the 'bidder' role joins the auction.
   * Returns the participant (users) id to log in with. Budget starts at 0 — the
   * admin sets it.
   */
  static async enterAuctionAsMember(): Promise<{
    success: boolean;
    userId: string | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await supabase.rpc('enter_auction_as_member');
      if (error) {
        return { success: false, userId: null, error: error.message };
      }
      if (data && typeof data === 'object') {
        return {
          success: data.success === true,
          userId: data.user_id ?? null,
          error: data.error ?? null,
        };
      }
      return { success: false, userId: null, error: 'Unexpected response' };
    } catch (error: any) {
      return { success: false, userId: null, error: error.message ?? 'Failed to join' };
    }
  }

  /** Admin: ban / unban an auction participant. */
  static async setParticipantBanned(userId: string, banned: boolean): Promise<boolean> {
    const { error } = await supabase.rpc('admin_set_user_banned', {
      p_user_id: userId,
      p_banned: banned,
    });
    if (error) {
      console.error('Error setting participant ban:', error);
      return false;
    }
    return true;
  }

  /** Admin: set an auction participant's budget. */
  static async setParticipantBalance(userId: string, balance: number): Promise<boolean> {
    const { error } = await supabase.rpc('admin_set_user_balance', {
      p_user_id: userId,
      p_balance: Math.max(0, Math.round(balance)),
    });
    if (error) {
      console.error('Error setting participant balance:', error);
      return false;
    }
    return true;
  }

  static async updateUserBalance(userId: string, newBalance: number): Promise<boolean> {
    try {
      const { error } = await supabase.from('users').update({ balance: newBalance }).eq('id', userId);

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

  // Optional legacy helper (kept for compatibility). Bids should normally be placed via RPC.
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
      const { data, error } = await supabase.from('auction_state').select('*').limit(1).single();

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

  /**
   * Reset the live event via the admin_reset_event RPC: every member's budget
   * goes back to the event reserve, bids + sold markers are cleared and the room
   * returns to idle. The reserve/cleanup logic lives server-side (single source
   * of truth) — no client-side balance math here.
   */
  static async resetAuction(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('admin_reset_event');
      if (error) {
        console.error('admin_reset_event RPC error:', error);
        return false;
      }
      if (data && typeof data === 'object' && data.success === false) {
        console.error('admin_reset_event failed:', data.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error resetting auction:', error);
      return false;
    }
  }

  /**
   * RPC: Place a bid for a player
   * Calls the Supabase place_bid RPC function which handles validation and timer extension.
   */
  static async placeBidRpc(
    playerId: string,
    userId: string,
    amount: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!playerId || !userId || !amount || amount <= 0) {
        return {
          success: false,
          error: 'Invalid parameters: playerId, userId, and amount are required',
        };
      }

      const { data, error } = await supabase.rpc('place_bid', {
        p_player_id: playerId,
        p_user_id: userId,
        p_amount: amount,
      });

      if (error) {
        console.error('place_bid RPC error:', error);
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object') {
        return {
          success: data.success === true,
          error: data.error || null,
        };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error in placeBidRpc:', error);
      return { success: false, error: error.message || 'Failed to place bid' };
    }
  }

  /**
   * RPC: Extend auction time
   * Adds seconds to the current time_remaining
   */
  static async extendAuctionTimeRpc(
    seconds: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (!seconds || seconds <= 0) {
        return { success: false, error: 'Invalid seconds parameter' };
      }

      const { data, error } = await supabase.rpc('extend_auction_time', {
        p_seconds: seconds,
      });

      if (error) {
        console.error('extend_auction_time RPC error:', error);
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object') {
        return {
          success: data.success === true,
          error: data.error || null,
        };
      }

      return { success: true, error: null };
    } catch (error: any) {
      console.error('Error in extendAuctionTimeRpc:', error);
      return { success: false, error: error.message || 'Failed to extend time' };
    }
  }

  /**
   * RPC: Settle the current player
   * Determines the winner, updates balances, and transitions to result state
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
      if (!playerId) {
        console.error('settlePlayerRpc: playerId is required');
        return {
          success: false,
          error: 'Player ID is required',
          winner_user_id: null,
          winning_amount: null,
        };
      }

      console.log('Calling settle_player RPC for player:', playerId);

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

      if (data && typeof data === 'object') {
        return {
          success: data.success === true,
          error: data.error || null,
          winner_user_id: data.winner_user_id || null,
          winning_amount: data.winning_amount ? Number(data.winning_amount) : null,
        };
      }

      return {
        success: false,
        error: 'Unexpected response format from settle_player RPC',
        winner_user_id: null,
        winning_amount: null,
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