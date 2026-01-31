// src/store/auctionStore.ts

import { create } from 'zustand';
import { AuctionState, Player, User, Bid, WonPlayer, UserRole, AuctionStatus } from '@/types/auction.types';
import { supabase } from '@/lib/supabase';
import { AuctionEngine } from '@/services/auctionEngine';
import type { RealtimeChannel } from '@supabase/supabase-js';

const COUNTDOWN_DURATION = 3;
const AUCTION_DURATION = 30;
const RESULT_DISPLAY_DURATION = 3;

let auctionStateChannel: RealtimeChannel | null = null;
let bidsChannel: RealtimeChannel | null = null;
let usersChannel: RealtimeChannel | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let isProcessingTransition = false;

interface AuctionStoreState extends AuctionState {
  login: (userId: string, role: UserRole) => Promise<void>;
  logout: () => void;
  startAuction: () => Promise<void>;
  pauseAuction: () => Promise<void>;
  resumeAuction: () => Promise<void>;
  placeBid: (amount: number) => Promise<boolean>;
  tick: () => Promise<void>;
  reset: () => Promise<void>;
  initializeRealtime: () => void;
  cleanupRealtime: () => void;
}

export const useAuctionStore = create<AuctionStoreState>((set, get) => ({
  // Initial state
  users: [],
  currentUserId: null,
  currentUserRole: null,
  allPlayers: [],
  currentPlayerIndex: -1,
  currentPlayer: null,
  soldPlayers: [],
  unsoldrPlayers: [],
  status: 'idle',
  countdown: COUNTDOWN_DURATION,
  timeRemaining: AUCTION_DURATION,
  currentHighestBid: null,
  bidHistory: [],
  resultMessage: null,
  currentRound: 1,
  roundTotalPlayers: 0,
  roundCurrentIndex: 0,

  /**
   * Login user and load current auction state
   */
  login: async (userId: string, role: UserRole) => {
    set({ currentUserId: userId, currentUserRole: role });

    // Load users and players
    const users = await AuctionEngine.loadUsers();
    const players = await AuctionEngine.loadPlayers();
    const auctionState = await AuctionEngine.getAuctionState();

    if (auctionState) {
      let currentPlayer: Player | null = null;
      if (auctionState.current_player_id) {
        currentPlayer = players.find((p: Player) => p.id === auctionState.current_player_id) || null;
      }

      const soldPlayers = Array.isArray(auctionState.sold_players) ? auctionState.sold_players : [];
      const unsoldrPlayers = Array.isArray(auctionState.unsold_players) ? auctionState.unsold_players : [];

      set({
        users,
        allPlayers: players,
        status: auctionState.status as AuctionStatus,
        currentPlayerIndex: auctionState.current_player_index,
        currentPlayer,
        countdown: auctionState.countdown,
        timeRemaining: auctionState.time_remaining,
        currentRound: auctionState.current_round,
        roundTotalPlayers: auctionState.round_total_players,
        roundCurrentIndex: auctionState.round_current_index,
        soldPlayers,
        unsoldrPlayers,
      });
    }
  },

  /**
   * Logout current user
   */
  logout: () => {
    get().cleanupRealtime();
    set({
      currentUserId: null,
      currentUserRole: null,
      users: [],
      allPlayers: [],
      currentPlayerIndex: -1,
      currentPlayer: null,
      soldPlayers: [],
      unsoldrPlayers: [],
      status: 'idle',
      countdown: COUNTDOWN_DURATION,
      timeRemaining: AUCTION_DURATION,
      currentHighestBid: null,
      bidHistory: [],
      resultMessage: null,
      currentRound: 1,
      roundTotalPlayers: 0,
      roundCurrentIndex: 0,
    });
  },

  /**
   * Initialize realtime subscriptions
   */
  initializeRealtime: () => {
    get().cleanupRealtime();

    // Subscribe to auction_state changes
    auctionStateChannel = supabase
      .channel('auction-state-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, async (payload) => {
        const newState = payload.new as any;
        const state = get();

        // Find current player
        let currentPlayer: Player | null = null;
        if (newState.current_player_id) {
          currentPlayer = state.allPlayers.find((p) => p.id === newState.current_player_id) || null;
          
          // If player not in local state, fetch from database
          if (!currentPlayer) {
            const { data } = await supabase.from('players').select('*').eq('id', newState.current_player_id).single();
            if (data) {
              currentPlayer = {
                id: data.id,
                name: data.name,
                role: data.role,
                rating: data.rating,
                image: data.image,
                basePrice: data.base_price,
              };
            }
          }
        }

        // Load current highest bid and bid history
        let currentHighestBid: Bid | null = null;
        let bidHistory: Bid[] = [];

        if (newState.current_highest_bid_id && currentPlayer) {
          const { data: allBids } = await supabase
            .from('bids')
            .select('*, users(username)')
            .eq('player_id', currentPlayer.id)
            .order('created_at', { ascending: true });

          if (allBids && allBids.length > 0) {
            bidHistory = allBids.map((bid: any) => ({
              userId: bid.user_id,
              username: bid.users?.username || 'Unknown',
              amount: bid.amount,
              timestamp: new Date(bid.created_at).getTime(),
            }));
            currentHighestBid = bidHistory[bidHistory.length - 1];
          }
        } else if (newState.status === 'countdown') {
          // Clear bids when new player countdown starts
          bidHistory = [];
          currentHighestBid = null;
        }

        const soldPlayers = Array.isArray(newState.sold_players) ? newState.sold_players : [];
        const unsoldrPlayers = Array.isArray(newState.unsold_players) ? newState.unsold_players : [];

        set({
          status: newState.status,
          currentPlayerIndex: newState.current_player_index,
          currentPlayer,
          timeRemaining: newState.time_remaining,
          countdown: newState.countdown,
          currentHighestBid,
          bidHistory,
          currentRound: newState.current_round,
          roundTotalPlayers: newState.round_total_players,
          roundCurrentIndex: newState.round_current_index,
          soldPlayers,
          unsoldrPlayers,
        });

        // Start/stop timer based on status
        if (['countdown', 'active', 'result'].includes(newState.status)) {
          if (!timerInterval) {
            timerInterval = setInterval(() => get().tick(), 1000);
          }
        } else {
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
        }
      })
      .subscribe();

    // Subscribe to new bids
    bidsChannel = supabase
      .channel('bids-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, async (payload) => {
        const newBid = payload.new as any;
        const state = get();

        // Only process if bid is for current player
        if (newBid.player_id === state.currentPlayer?.id) {
          const { data: userData } = await supabase.from('users').select('username').eq('id', newBid.user_id).single();

          const bid: Bid = {
            userId: newBid.user_id,
            username: userData?.username || 'Unknown',
            amount: newBid.amount,
            timestamp: new Date(newBid.created_at).getTime(),
          };

          // Add time if bid placed in last 15 seconds
          const newTimeRemaining = state.timeRemaining <= 15 ? Math.min(state.timeRemaining + 10, 30) : state.timeRemaining;

          set({
            currentHighestBid: bid,
            bidHistory: [...state.bidHistory, bid],
            timeRemaining: newTimeRemaining,
          });

          // Update auction state with new time
          await AuctionEngine.updateAuctionState({
            current_highest_bid_id: newBid.id,
            time_remaining: newTimeRemaining,
          });
        }
      })
      .subscribe();

    // Subscribe to user updates (balance changes)
    usersChannel = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, async () => {
        const users = await AuctionEngine.loadUsers();
        set({ users });
      })
      .subscribe();
  },

  /**
   * Cleanup realtime subscriptions
   */
  cleanupRealtime: () => {
    if (auctionStateChannel) {
      supabase.removeChannel(auctionStateChannel);
      auctionStateChannel = null;
    }
    if (bidsChannel) {
      supabase.removeChannel(bidsChannel);
      bidsChannel = null;
    }
    if (usersChannel) {
      supabase.removeChannel(usersChannel);
      usersChannel = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  },

  /**
   * Start auction (admin only)
   */
  startAuction: async () => {
    const users = await AuctionEngine.loadUsers();
    const players = await AuctionEngine.loadPlayers();

    if (players.length === 0) {
      console.error('No players to auction');
      return;
    }

    set({
      users,
      allPlayers: players,
      soldPlayers: [],
      unsoldrPlayers: [],
      bidHistory: [],
      currentHighestBid: null,
      currentRound: 1,
      roundTotalPlayers: players.length,
      roundCurrentIndex: 1,
    });

    await AuctionEngine.updateAuctionState({
      status: 'countdown',
      current_player_id: players[0].id,
      current_player_index: 0,
      countdown: COUNTDOWN_DURATION,
      time_remaining: AUCTION_DURATION,
      current_highest_bid_id: null,
      current_round: 1,
      round_total_players: players.length,
      round_current_index: 1,
      sold_players: [],
      unsold_players: [],
    });
  },

  /**
   * Pause auction (admin only)
   */
  pauseAuction: async () => {
    await AuctionEngine.updateAuctionState({ status: 'paused' });
  },

  /**
   * Resume auction (admin only)
   */
  resumeAuction: async () => {
    await AuctionEngine.updateAuctionState({ status: 'active' });
  },

  /**
   * Place a bid (users only)
   */
  placeBid: async (amount: number): Promise<boolean> => {
    const state = get();
    const user = state.users.find((u) => u.id === state.currentUserId);

    // Validation
    if (!user || user.role !== 'USER' || !state.currentPlayer || state.status !== 'active') {
      return false;
    }

    const minBid = state.currentHighestBid ? state.currentHighestBid.amount + 1 : state.currentPlayer.basePrice;

    if (amount < minBid || amount > user.balance) {
      return false;
    }

    // Save bid to database
    const bidId = await AuctionEngine.saveBid(state.currentPlayer.id, user.id, amount);
    return bidId !== null;
  },

  /**
   * Timer tick (called every second)
   */
  tick: async () => {
    if (isProcessingTransition) return;

    const state = get();

    if (state.status === 'countdown') {
      if (state.countdown > 1) {
        await AuctionEngine.updateAuctionState({ countdown: state.countdown - 1 });
      } else {
        await AuctionEngine.updateAuctionState({ status: 'active', countdown: 0 });
      }
      return;
    }

    if (state.status === 'active') {
      if (state.timeRemaining > 1) {
        await AuctionEngine.updateAuctionState({ time_remaining: state.timeRemaining - 1 });
      } else {
        // Time's up - end current auction
        isProcessingTransition = true;
        await endCurrentAuction(get, set);
        isProcessingTransition = false;
      }
      return;
    }

    if (state.status === 'result') {
      if (state.countdown > 1) {
        await AuctionEngine.updateAuctionState({ countdown: state.countdown - 1 });
      } else {
        // Result display finished - load next player
        isProcessingTransition = true;
        await loadNextPlayer(get, set);
        isProcessingTransition = false;
      }
      return;
    }
  },

  /**
   * Reset auction (admin only)
   */
  reset: async () => {
    get().cleanupRealtime();
    await AuctionEngine.resetAuction();
    
    const users = await AuctionEngine.loadUsers();
    set({
      users,
      currentUserId: null,
      currentUserRole: null,
      allPlayers: [],
      currentPlayerIndex: -1,
      currentPlayer: null,
      soldPlayers: [],
      unsoldrPlayers: [],
      status: 'idle',
      countdown: COUNTDOWN_DURATION,
      timeRemaining: AUCTION_DURATION,
      currentHighestBid: null,
      bidHistory: [],
      resultMessage: null,
      currentRound: 1,
      roundTotalPlayers: 0,
      roundCurrentIndex: 0,
    });
  },
}));

/**
 * End current player auction
 */
async function endCurrentAuction(get: any, set: any) {
  const state = get();
  const winner = state.currentHighestBid;
  const player = state.currentPlayer!;

  let resultMessage = `${player.name} - `;
  let updatedSoldPlayers = [...state.soldPlayers];
  let updatedUnsoldPlayers = [...state.unsoldrPlayers];

  if (winner) {
    // Player was sold
    resultMessage += `SOLD to ${winner.username} for $${winner.amount.toLocaleString()}!`;

    if (!updatedSoldPlayers.includes(player.id)) {
      updatedSoldPlayers.push(player.id);
    }
    updatedUnsoldPlayers = updatedUnsoldPlayers.filter((id: string) => id !== player.id);

    // Update user balance
    const user = state.users.find((u: User) => u.id === winner.userId);
    if (user) {
      const newBalance = user.balance - winner.amount;
      await AuctionEngine.updateUserBalance(user.id, newBalance);

      const wonPlayer: WonPlayer = {
        playerId: player.id,
        playerName: player.name,
        amount: winner.amount,
      };

      const updatedUsers = state.users.map((u: User) =>
        u.id === winner.userId ? { ...u, balance: newBalance, wonPlayers: [...u.wonPlayers, wonPlayer] } : u
      );

      set({ users: updatedUsers });
    }
  } else {
    // Player was unsold - add to re-auction queue
    resultMessage += 'UNSOLD - will re-auction';

    if (!updatedUnsoldPlayers.includes(player.id)) {
      updatedUnsoldPlayers.push(player.id);
    }
    updatedSoldPlayers = updatedSoldPlayers.filter((id: string) => id !== player.id);
  }

  set({
    soldPlayers: updatedSoldPlayers,
    unsoldrPlayers: updatedUnsoldPlayers,
    resultMessage,
  });

  // Update database
  await AuctionEngine.updateAuctionState({
    status: 'result',
    countdown: RESULT_DISPLAY_DURATION,
    sold_players: updatedSoldPlayers,
    unsold_players: updatedUnsoldPlayers,
  });
}

/**
 * Load next player (or finish auction)
 */
async function loadNextPlayer(get: any, set: any) {
  const state = get();

  const soldPlayerIds = new Set(state.soldPlayers);
  const unsoldPlayerIds = new Set(state.unsoldrPlayers);

  // Check if all players are sold
  const remainingPlayers = state.allPlayers.filter((p: Player) => !soldPlayerIds.has(p.id));

  if (remainingPlayers.length === 0) {
    // Auction complete
    await AuctionEngine.updateAuctionState({ status: 'finished' });
    set({ status: 'finished', resultMessage: 'Auction completed! All players sold.' });
    return;
  }

  let nextPlayer: Player | null = null;
  let nextIndex = -1;
  let isStartingReauction = false;

  // First, try to find next unsold player in sequential order
  for (let i = state.currentPlayerIndex + 1; i < state.allPlayers.length; i++) {
    const player = state.allPlayers[i];
    if (!soldPlayerIds.has(player.id)) {
      nextPlayer = player;
      nextIndex = i;
      break;
    }
  }

  // If no sequential player found, check re-auction queue
  if (!nextPlayer && unsoldPlayerIds.size > 0) {
    isStartingReauction = true;

    for (const unsoldId of Array.from(unsoldPlayerIds)) {
      const player = state.allPlayers.find((p: Player) => p.id === unsoldId);
      if (player && !soldPlayerIds.has(player.id)) {
        nextPlayer = player;
        nextIndex = state.allPlayers.findIndex((p: Player) => p.id === unsoldId);

        // Remove from unsold queue
        const updatedUnsoldPlayers = state.unsoldrPlayers.filter((id: string) => id !== unsoldId);
        set({ unsoldrPlayers: updatedUnsoldPlayers });
        break;
      }
    }
  }

  // If still no player found, auction is complete
  if (!nextPlayer) {
    await AuctionEngine.updateAuctionState({ status: 'finished' });
    set({ status: 'finished', resultMessage: 'Auction completed! All players sold.' });
    return;
  }

  // Calculate round progress
  let newRoundCurrentIndex = state.roundCurrentIndex + 1;
  let newRound = state.currentRound;
  let newRoundTotalPlayers = state.roundTotalPlayers;

  if (isStartingReauction) {
    // Starting a new re-auction round
    newRound = state.currentRound + 1;
    newRoundTotalPlayers = unsoldPlayerIds.size;
    newRoundCurrentIndex = 1;
  } else if (newRoundCurrentIndex > state.roundTotalPlayers) {
    // Finished current round, starting new one
    newRound = state.currentRound + 1;
    newRoundTotalPlayers = unsoldPlayerIds.size;
    newRoundCurrentIndex = 1;
  }

  set({
    bidHistory: [],
    currentHighestBid: null,
    currentRound: newRound,
    roundTotalPlayers: newRoundTotalPlayers,
    roundCurrentIndex: newRoundCurrentIndex,
  });

  // Update database to start next player
  await AuctionEngine.updateAuctionState({
    status: 'countdown',
    current_player_id: nextPlayer.id,
    current_player_index: nextIndex,
    countdown: COUNTDOWN_DURATION,
    time_remaining: AUCTION_DURATION,
    current_highest_bid_id: null,
    current_round: newRound,
    round_total_players: newRoundTotalPlayers,
    round_current_index: newRoundCurrentIndex,
  });
}