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
   * Start auction (admin only)
   */
  startAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') {
      console.error('Only admin can start auction');
      return;
    }

    const players = await AuctionEngine.loadPlayers();
    if (players.length === 0) {
      console.error('No players available for auction');
      return;
    }

    set({
      allPlayers: players,
      currentPlayerIndex: 0,
      currentPlayer: players[0],
      countdown: COUNTDOWN_DURATION,
      currentRound: 1,
      roundTotalPlayers: players.length,
      roundCurrentIndex: 1,
    });

    await AuctionEngine.updateAuctionState({
      status: 'countdown',
      current_player_id: players[0].id,
      current_player_index: 0,
      countdown: COUNTDOWN_DURATION,
      current_round: 1,
      round_total_players: players.length,
      round_current_index: 1,
    });
  },

  /**
   * Pause auction (admin only)
   */
  pauseAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') {
      console.error('Only admin can pause auction');
      return;
    }

    await AuctionEngine.updateAuctionState({ status: 'paused' });
  },

  /**
   * Resume auction (admin only)
   */
  resumeAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') {
      console.error('Only admin can resume auction');
      return;
    }

    await AuctionEngine.updateAuctionState({ status: 'active' });
  },

  /**
   * Place a bid (users only)
   */
  placeBid: async (amount: number): Promise<boolean> => {
    const state = get();

    if (state.currentUserRole !== 'USER') {
      console.error('Only users can place bids');
      return false;
    }

    if (state.status !== 'active') {
      console.error('Auction is not active');
      return false;
    }

    if (!state.currentPlayer) {
      console.error('No current player');
      return false;
    }

    const currentUser = state.users.find((u: User) => u.id === state.currentUserId);
    if (!currentUser) {
      console.error('User not found');
      return false;
    }

    if (currentUser.balance < amount) {
      console.error('Insufficient balance');
      return false;
    }

    const currentHighestBid = state.currentHighestBid;
    if (currentHighestBid && amount <= currentHighestBid.amount) {
      console.error('Bid must be higher than current highest bid');
      return false;
    }

    const minBid = currentHighestBid ? currentHighestBid.amount + 10 : state.currentPlayer.basePrice;
    if (amount < minBid) {
      console.error(`Bid must be at least $${minBid}`);
      return false;
    }

    const bidId = await AuctionEngine.saveBid(state.currentPlayer.id, currentUser.id, amount);
    if (!bidId) {
      console.error('Failed to save bid');
      return false;
    }

    const newBid: Bid = {
      userId: currentUser.id,
      username: currentUser.username,
      amount,
      timestamp: Date.now(),
    };

    set({
      currentHighestBid: newBid,
      bidHistory: [...state.bidHistory, newBid],
    });

    await AuctionEngine.updateAuctionState({
      current_highest_bid_id: bidId,
      time_remaining: AUCTION_DURATION,
    });

    return true;
  },

  /**
   * Initialize realtime subscriptions
   */
  initializeRealtime: () => {
    const state = get();

    // Auction State Channel
    auctionStateChannel = supabase
      .channel('auction_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_state',
        },
        async (payload: any) => {
          const newState = payload.new;
          if (!newState) return;

          const currentState = get();
          let currentPlayer: Player | null = null;

          if (newState.current_player_id) {
            currentPlayer = currentState.allPlayers.find((p: Player) => p.id === newState.current_player_id) || null;
          }

          const soldPlayers = Array.isArray(newState.sold_players) ? newState.sold_players : [];
          const unsoldrPlayers = Array.isArray(newState.unsold_players) ? newState.unsold_players : [];

          set({
            status: newState.status as AuctionStatus,
            currentPlayerIndex: newState.current_player_index,
            currentPlayer,
            countdown: newState.countdown,
            timeRemaining: newState.time_remaining,
            currentRound: newState.current_round,
            roundTotalPlayers: newState.round_total_players,
            roundCurrentIndex: newState.round_current_index,
            soldPlayers,
            unsoldrPlayers,
          });

          if (newState.status === 'countdown' || newState.status === 'active' || newState.status === 'result') {
            if (!timerInterval) {
              timerInterval = setInterval(() => {
                get().tick();
              }, 1000);
            }
          } else if (newState.status === 'idle' || newState.status === 'paused' || newState.status === 'finished') {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
          }

          if (newState.current_player_id && newState.current_player_id !== currentState.currentPlayer?.id) {
            set({ bidHistory: [], currentHighestBid: null });
          }
        }
      )
      .subscribe();

    // Bids Channel
    bidsChannel = supabase
      .channel('bids_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        },
        async (payload: any) => {
          const newBid = payload.new;
          const currentState = get();

          if (!currentState.currentPlayer || newBid.player_id !== currentState.currentPlayer.id) {
            return;
          }

          const user = currentState.users.find((u: User) => u.id === newBid.user_id);
          if (!user) return;

          const bid: Bid = {
            userId: newBid.user_id,
            username: user.username,
            amount: newBid.amount,
            timestamp: new Date(newBid.created_at).getTime(),
          };

          const existingBid = currentState.bidHistory.find(
            (b: Bid) => b.userId === bid.userId && b.amount === bid.amount && Math.abs(b.timestamp - bid.timestamp) < 1000
          );

          if (!existingBid) {
            set({
              bidHistory: [...currentState.bidHistory, bid],
            });

            if (!currentState.currentHighestBid || bid.amount > currentState.currentHighestBid.amount) {
              set({ currentHighestBid: bid });
            }
          }
        }
      )
      .subscribe();

    // Users Channel
    usersChannel = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        async () => {
          const users = await AuctionEngine.loadUsers();
          set({ users });
        }
      )
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
   * Timer tick
   */
  tick: async () => {
    if (isProcessingTransition) return;

    const state = get();

    if (state.status === 'countdown') {
      if (state.countdown > 1) {
        await AuctionEngine.updateAuctionState({ countdown: state.countdown - 1 });
      } else {
        await AuctionEngine.updateAuctionState({
          status: 'active',
          countdown: 0,
          time_remaining: AUCTION_DURATION,
        });
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
    const state = get();
    const currentUserId = state.currentUserId;
    const currentUserRole = state.currentUserRole;
    
    await AuctionEngine.resetAuction();
    
    const users = await AuctionEngine.loadUsers();
    const players = await AuctionEngine.loadPlayers();
    
    set({
      users,
      currentUserId,
      currentUserRole,
      allPlayers: players,
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
    await AuctionEngine.updateAuctionState({
      status: 'finished',
      current_player_id: null,
      current_player_index: -1,
    });

    set({
      currentPlayer: null,
      currentPlayerIndex: -1,
      status: 'finished',
    });

    return;
  }

  // Check if we need to start re-auction round
  const currentRoundPlayers =
    state.currentRound === 1
      ? state.allPlayers.filter((p: Player) => !soldPlayerIds.has(p.id) && !unsoldPlayerIds.has(p.id))
      : state.allPlayers.filter((p: Player) => unsoldPlayerIds.has(p.id) && !soldPlayerIds.has(p.id));

  if (currentRoundPlayers.length === 0) {
    // Start new round with unsold players
    const unsoldPlayers = state.allPlayers.filter((p: Player) => unsoldPlayerIds.has(p.id));

    if (unsoldPlayers.length === 0) {
      // No more players - finish
      await AuctionEngine.updateAuctionState({
        status: 'finished',
        current_player_id: null,
        current_player_index: -1,
      });

      set({
        currentPlayer: null,
        currentPlayerIndex: -1,
        status: 'finished',
      });

      return;
    }

    // Start re-auction round
    const nextPlayer = unsoldPlayers[0];
    const newRound = state.currentRound + 1;

    set({
      currentPlayer: nextPlayer,
      currentPlayerIndex: 0,
      currentRound: newRound,
      roundTotalPlayers: unsoldPlayers.length,
      roundCurrentIndex: 1,
      bidHistory: [],
      currentHighestBid: null,
      unsoldrPlayers: [],
    });

    await AuctionEngine.updateAuctionState({
      status: 'countdown',
      current_player_id: nextPlayer.id,
      current_player_index: 0,
      countdown: COUNTDOWN_DURATION,
      current_round: newRound,
      round_total_players: unsoldPlayers.length,
      round_current_index: 1,
      unsold_players: [],
    });
  } else {
    // Continue current round
    const nextPlayer = currentRoundPlayers[0];
    const newIndex = state.currentPlayerIndex + 1;
    const newRoundIndex = state.roundCurrentIndex + 1;

    set({
      currentPlayer: nextPlayer,
      currentPlayerIndex: newIndex,
      roundCurrentIndex: newRoundIndex,
      bidHistory: [],
      currentHighestBid: null,
    });

    await AuctionEngine.updateAuctionState({
      status: 'countdown',
      current_player_id: nextPlayer.id,
      current_player_index: newIndex,
      countdown: COUNTDOWN_DURATION,
      round_current_index: newRoundIndex,
    });
  }
}