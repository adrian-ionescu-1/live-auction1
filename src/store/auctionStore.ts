// src/store/auctionStore.ts
//
// ─── ARCHITECTURE RULES enforced in this file ─────────────────
//
// 1. TIMER: Only the ADMIN client runs setInterval.  All other roles
//    are pure listeners.  tick() guards itself at the top.
//
// 2. BIDS: placeBid() calls the place_bid RPC — it does NOT insert
//    a row directly.  The RPC is the single source of truth for bid
//    validation and timer reset.
//
// 3. SETTLE: When time runs out the admin-only tick calls
//    settle_player RPC.  No client-side balance math anywhere.
//
// 4. REALTIME: All three channels (auction_state, bids, users) are
//    READ-ONLY.  None of them write back to the database (except the
//    admin tick & explicit updateAuctionState calls).
//
// 5. TIME EXTENSION: place_bid_core updates auction_state.time_remaining.
//    The realtime auction_state channel propagates the new
//    time_remaining to every client automatically.
// ───────────────────────────────────────────────────────────────

import { create } from 'zustand';
import {
  AuctionState,
  Player,
  User,
  Bid,
  UserRole,
  AuctionStatus,
} from '@/types/auction.types';
import { supabase } from '@/lib/supabase';
import { AuctionEngine } from '@/services/auctionEngine';
import type { RealtimeChannel } from '@supabase/supabase-js';

const COUNTDOWN_DURATION = 3;
const AUCTION_DURATION = 30;

// Module-level channel refs and timer (one per browser tab)
let auctionStateChannel: RealtimeChannel | null = null;
let bidsChannel: RealtimeChannel | null = null;
let usersChannel: RealtimeChannel | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;

// Prevents the admin tick from re-entering during an async transition
let isProcessingTransition = false;

interface AuctionStoreState extends AuctionState {
  login: (userId: string, role: UserRole) => Promise<void>;
  logout: () => void;
  startAuction: () => Promise<void>;
  pauseAuction: () => Promise<void>;
  resumeAuction: () => Promise<void>;
  placeBid: (amount: number) => Promise<{ success: boolean; error: string | null }>;
  extendTime: (seconds: number) => Promise<{ success: boolean; error: string | null }>;
  tick: () => Promise<void>;
  reset: () => Promise<void>;
  dismissResults: () => void;
  initializeRealtime: () => void;
  cleanupRealtime: () => void;
}

export const useAuctionStore = create<AuctionStoreState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────
  users: [],
  currentUserId: null,
  currentUserRole: null,
  allPlayers: [],
  currentPlayerIndex: -1,
  currentPlayer: null,
  soldPlayers: [],
  unsoldrPlayers: [], // keep the existing typo to avoid breaking UI
  status: 'idle',
  countdown: COUNTDOWN_DURATION,
  timeRemaining: AUCTION_DURATION,
  currentHighestBid: null,
  bidHistory: [],
  resultMessage: null,
  currentRound: 1,
  roundTotalPlayers: 0,
  roundCurrentIndex: 0,

  // ── login ──────────────────────────────────────────────────
  login: async (userId: string, role: UserRole) => {
    set({ currentUserId: userId, currentUserRole: role });

    sessionStorage.setItem('auction_user_id', userId);
    sessionStorage.setItem('auction_user_role', role);

    const auctionState = await AuctionEngine.getAuctionState();
    const soldPlayerIds: string[] = auctionState?.sold_players ?? [];

    const users = await AuctionEngine.loadUsers(soldPlayerIds);
    const players = await AuctionEngine.loadPlayers();

    if (auctionState) {
      let currentPlayer: Player | null = null;
      if (auctionState.current_player_id) {
        currentPlayer = players.find((p) => p.id === auctionState.current_player_id) ?? null;
      }

      set({
        users,
        allPlayers: players,
        currentPlayerIndex: auctionState.current_player_index ?? -1,
        currentPlayer,
        soldPlayers: auctionState.sold_players ?? [],
        unsoldrPlayers: auctionState.unsold_players ?? [],
        status: (auctionState.status as AuctionStatus) ?? 'idle',
        countdown: auctionState.countdown ?? COUNTDOWN_DURATION,
        timeRemaining: auctionState.time_remaining ?? AUCTION_DURATION,

        // IMPORTANT: bid history is driven by bidsChannel (no re-fetch here)
        currentHighestBid: null,
        bidHistory: [],

        currentRound: auctionState.current_round ?? 1,
        roundTotalPlayers: auctionState.round_total_players ?? 0,
        roundCurrentIndex: auctionState.round_current_index ?? 0,
      });
    } else {
      set({ users, allPlayers: players });
    }

    get().initializeRealtime();
  },

  // ── logout ─────────────────────────────────────────────────
  logout: () => {
    get().cleanupRealtime();
    sessionStorage.removeItem('auction_user_id');
    sessionStorage.removeItem('auction_user_role');

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

  // ── initializeRealtime ─────────────────────────────────────
  initializeRealtime: () => {
    get().cleanupRealtime();

    // 1) AUCTION STATE CHANNEL (authoritative status/timer/player)
    auctionStateChannel = supabase
      .channel('auction-state-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_state' },
        async (payload) => {
          const newState = payload.new as Record<string, unknown>;
          const state = get();

          const nextPlayerId =
            typeof newState.current_player_id === 'string'
              ? (newState.current_player_id as string)
              : null;

          // Build currentPlayer from allPlayers (fallback: one fetch if missing)
          let currentPlayer: Player | null = null;
          if (nextPlayerId) {
            const local = state.allPlayers.find((p) => p.id === nextPlayerId);
            if (local) {
              currentPlayer = local;
            } else {
              const { data } = await supabase
                .from('players')
                .select('*')
                .eq('id', nextPlayerId)
                .single();

              if (data) {
                currentPlayer = {
                  id: data.id,
                  name: data.name || 'Unknown Player',
                  wn8_30d: Number(data.wn8_30d) || 0,
                  winrate: Number(data.winrate) || 0,
                  avg_damage: Number(data.avg_damage) || 0,
                  basePrice: Number(data.base_price) || 100,
                };
              }
            }
          }

          const nextStatus = (newState.status as AuctionStatus) ?? state.status;

          // Clear bid UI when player changes or countdown begins
          const prevPlayerId = state.currentPlayer?.id ?? null;
          const playerChanged = nextPlayerId !== prevPlayerId;
          const shouldClearBids = playerChanged || nextStatus === 'countdown';

          set((s) => ({
            status: nextStatus,
            currentPlayerIndex:
              (newState.current_player_index as number) ?? s.currentPlayerIndex,
            currentPlayer,
            timeRemaining: (newState.time_remaining as number) ?? s.timeRemaining,
            countdown: (newState.countdown as number) ?? s.countdown,
            currentRound: (newState.current_round as number) ?? s.currentRound,
            roundTotalPlayers:
              (newState.round_total_players as number) ?? s.roundTotalPlayers,
            roundCurrentIndex:
              (newState.round_current_index as number) ?? s.roundCurrentIndex,
            soldPlayers: (newState.sold_players as string[]) ?? s.soldPlayers,
            unsoldrPlayers: (newState.unsold_players as string[]) ?? s.unsoldrPlayers,

            // bids are driven by bidsChannel
            bidHistory: shouldClearBids ? [] : s.bidHistory,
            currentHighestBid: shouldClearBids ? null : s.currentHighestBid,
          }));

          // Admin timer loop control (use role, not users list)
          const isAdmin = get().currentUserRole === 'ADMIN';

          if (
            isAdmin &&
            (nextStatus === 'countdown' ||
              nextStatus === 'active' ||
              nextStatus === 'result')
          ) {
            if (!timerInterval) {
              timerInterval = setInterval(() => {
                get().tick();
              }, 1000);
            }
          } else {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
          }
        }
      )
      .subscribe();

    // 2) BIDS CHANNEL (append-only UI stream; NO auction_state writes!)
    bidsChannel = supabase
      .channel('bids-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        async (payload) => {
          const newBid = payload.new as Record<string, unknown>;
          const currentPlayer = get().currentPlayer;

          if (!currentPlayer) return;
          if (newBid.player_id !== currentPlayer.id) return;

          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', newBid.user_id)
            .single();

          const bid: Bid = {
            userId: newBid.user_id as string,
            username: userData?.username || 'Unknown',
            amount: newBid.amount as number,
            timestamp: new Date(newBid.created_at as string).getTime(),
          };

          // Functional update avoids stale snapshots under high throughput
          set((s) => ({
            currentHighestBid: bid,
            bidHistory: [...s.bidHistory, bid],
          }));
        }
      )
      .subscribe();

    // 3) USERS CHANNEL (light updates only; no heavy recompute)
    usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          const updatedUser = payload.new as Record<string, unknown>;
          set((s) => ({
            users: s.users.map((u) =>
              u.id === (updatedUser.id as string)
                ? {
                    ...u,
                    username: updatedUser.username as string,
                    balance: updatedUser.balance as number,
                    role: updatedUser.role as UserRole,
                  }
                : u
            ),
          }));
        }
      )
      .subscribe();
  },

  // ── cleanupRealtime ────────────────────────────────────────
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

  // ── startAuction (admin only) ──────────────────────────────
  startAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') return;
    if (state.status !== 'idle') return;

    const players = state.allPlayers;
    if (players.length === 0) {
      alert('No players found in database');
      return;
    }

    const firstPlayer = players[0];

    await AuctionEngine.updateAuctionState({
      status: 'countdown',
      current_player_id: firstPlayer.id,
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

  // ── pauseAuction (admin only) ──────────────────────────────
  pauseAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') return;
    if (state.status !== 'active') return;

    await AuctionEngine.updateAuctionState({ status: 'paused' });
  },

  // ── resumeAuction (admin only) ─────────────────────────────
  resumeAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') return;
    if (state.status !== 'paused') return;

    await AuctionEngine.updateAuctionState({ status: 'active' });
  },

  // ── placeBid (user/admin) ──────────────────────────────────
  placeBid: async (amount: number) => {
    const state = get();
    if (state.status !== 'active') return { success: false, error: 'Auction is not active' };
    if (!state.currentPlayer) return { success: false, error: 'No current player' };
    if (!state.currentUserId) return { success: false, error: 'Not logged in' };

    return await AuctionEngine.placeBidRpc(state.currentPlayer.id, state.currentUserId, amount);
  },

  // ── extendTime (admin only) ────────────────────────────────
  extendTime: async (seconds: number) => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') {
      return { success: false, error: 'Only admins can extend time' };
    }
    return await AuctionEngine.extendAuctionTimeRpc(seconds);
  },

  // ── tick (ADMIN ONLY) ──────────────────────────────────────
  tick: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') return;
    if (isProcessingTransition) return;

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
        isProcessingTransition = true;
        await settleCurrentPlayer(get, set);
        isProcessingTransition = false;
      }
      return;
    }

    if (state.status === 'result') {
      if (state.countdown > 1) {
        await AuctionEngine.updateAuctionState({ countdown: state.countdown - 1 });
      } else {
        isProcessingTransition = true;
        await loadNextPlayer(get, set);
        isProcessingTransition = false;
      }
    }
  },

  // ── reset (admin only) ─────────────────────────────────────
  reset: async () => {
    const state = get();
    const { currentUserId, currentUserRole } = state;

    await AuctionEngine.resetAuction();

    const users = await AuctionEngine.loadUsers([]);
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

  // ── dismissResults ─────────────────────────────────────────
  dismissResults: () => {
    set({ status: 'idle' });
  },
}));

// ──────────────────────────────────────────────────────────────
// HELPER: settleCurrentPlayer
// ──────────────────────────────────────────────────────────────
async function settleCurrentPlayer(
  get: () => AuctionStoreState,
  set: (state: any) => void
) {
  const state = get();
  const player = state.currentPlayer;
  if (!player) return;

  const result = await AuctionEngine.settlePlayerRpc(player.id);

  if (result.error) {
    console.error('settle_player RPC error:', result.error);
    return;
  }

  let resultMessage: string;
  if (result.winner_user_id) {
    const winner = state.users.find((u: User) => u.id === result.winner_user_id);
    const winnerName = winner?.username ?? 'Unknown';
    resultMessage = `${player.name} - SOLD to ${winnerName} for $${Number(
      result.winning_amount
    ).toLocaleString()}!`;
  } else {
    resultMessage = `${player.name} - UNSOLD - will re-auction`;
  }

  set({ resultMessage });
}

// ──────────────────────────────────────────────────────────────
// HELPER: loadNextPlayer
// ──────────────────────────────────────────────────────────────
async function loadNextPlayer(
  get: () => AuctionStoreState,
  set: (state: any) => void
) {
  const state = get();

  const soldPlayerIds = new Set(state.soldPlayers);
  const unsoldPlayerIds = new Set(state.unsoldrPlayers);

  const remainingPlayers = state.allPlayers.filter((p: Player) => !soldPlayerIds.has(p.id));

  if (remainingPlayers.length === 0) {
    await AuctionEngine.updateAuctionState({ status: 'finished' });
    set({ resultMessage: 'Auction completed! All players auctioned.', status: 'finished' });
    return;
  }

  let nextPlayer: Player | null = null;
  let nextIndex = -1;
  let isStartingReauction = false;

  for (let i = state.currentPlayerIndex + 1; i < state.allPlayers.length; i++) {
    const player = state.allPlayers[i];
    if (!soldPlayerIds.has(player.id)) {
      nextPlayer = player;
      nextIndex = i;
      break;
    }
  }

  if (!nextPlayer && unsoldPlayerIds.size > 0) {
    isStartingReauction = true;

    for (const unsoldId of Array.from(unsoldPlayerIds)) {
      const player = state.allPlayers.find((p: Player) => p.id === unsoldId);
      if (player && !soldPlayerIds.has(player.id)) {
        nextPlayer = player;
        nextIndex = state.allPlayers.findIndex((p: Player) => p.id === unsoldId);

        const updatedUnsoldPlayers = state.unsoldrPlayers.filter((id: string) => id !== unsoldId);

        // update local + DB so all clients stay in sync
        set({ unsoldrPlayers: updatedUnsoldPlayers });
        await AuctionEngine.updateAuctionState({ unsold_players: updatedUnsoldPlayers });

        break;
      }
    }
  }

  if (!nextPlayer) {
    await AuctionEngine.updateAuctionState({ status: 'finished' });
    set({ resultMessage: 'Auction completed! All players auctioned.', status: 'finished' });
    return;
  }

  let newRoundCurrentIndex = state.roundCurrentIndex + 1;
  let newRound = state.currentRound;
  let newRoundTotalPlayers = state.roundTotalPlayers;

  if (isStartingReauction) {
    newRound = state.currentRound + 1;
    newRoundTotalPlayers = unsoldPlayerIds.size;
    newRoundCurrentIndex = 1;
  }

  if (newRoundCurrentIndex > state.roundTotalPlayers && !isStartingReauction) {
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