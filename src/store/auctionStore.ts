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
// 4. REALTIME: Channels are READ-ONLY. Only explicit RPC/updates write.
//
// 5. TIME EXTENSION: place_bid_core updates auction_state.time_remaining.
//    The realtime auction_state channel propagates the new time_remaining.
// ───────────────────────────────────────────────────────────────

import { create } from 'zustand';
import {
  AuctionState,
  Player,
  Bid,
  UserRole,
  AuctionStatus,
} from '@/types/auction.types';
import { supabase } from '@/lib/supabase';
import { AuctionEngine } from '@/services/auctionEngine';
import type { RealtimeChannel } from '@supabase/supabase-js';

const COUNTDOWN_DURATION = 3;
const AUCTION_DURATION = 30;

// Module-level channel refs (one per browser tab)
let auctionStateChannel: RealtimeChannel | null = null;
let bidsChannel: RealtimeChannel | null = null;
let usersChannel: RealtimeChannel | null = null;
let playersChannel: RealtimeChannel | null = null;

// Universal deadline clock — runs on EVERY client (not just the admin). It only
// computes the displayed countdown from phase_ends_at and, when the deadline
// passes, asks the server to advance the phase (auction_tick RPC).
let clockInterval: ReturnType<typeof setInterval> | null = null;

// Throttle for the server-side phase advance so many clients don't spam it.
let lastTickCallAt = 0;
let tickInFlight = false;

// Ask the server to advance the auction phase. Idempotent + globally locked
// server-side, so it is safe for any/all clients to call near a deadline.
async function driveAuctionTick() {
  const now = Date.now();
  if (tickInFlight || now - lastTickCallAt < 1000) return;
  lastTickCallAt = now;
  tickInFlight = true;
  try {
    await supabase.rpc('auction_tick');
  } catch (e) {
    console.error('auction_tick error:', e);
  } finally {
    tickInFlight = false;
  }
}

// Human-readable outcome shown when a player is settled (SOLD / UNSOLD).
function buildOutcomeMessage(
  playerName: string,
  isSold: boolean,
  winningBid: Bid | null
): string {
  if (isSold) {
    return winningBid
      ? `${playerName} — SOLD to ${winningBid.username} for $${winningBid.amount.toLocaleString()}`
      : `${playerName} — SOLD`;
  }
  return `${playerName} — UNSOLD · no bids, goes back to re-auction`;
}

interface AuctionStoreState extends AuctionState {
  // Server deadline for the current phase (ms epoch), used to render the timer
  // locally so it never depends on a single browser tab ticking.
  phaseEndsAt: number | null;
  login: (userId: string, role: UserRole) => Promise<void>;
  logout: () => void;
  startAuction: () => Promise<void>;
  pauseAuction: () => Promise<void>;
  resumeAuction: () => Promise<void>;
  placeBid: (amount: number) => Promise<{ success: boolean; error: string | null }>;
  extendTime: (seconds: number) => Promise<{ success: boolean; error: string | null }>;
  reset: () => Promise<void>;
  dismissResults: () => void;
  reconcile: () => Promise<void>;
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
  phaseEndsAt: null,
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
        phaseEndsAt: auctionState.phase_ends_at
          ? new Date(auctionState.phase_ends_at).getTime()
          : null,

        // bid history is driven by bidsChannel (no re-fetch here)
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
      phaseEndsAt: null,
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

          const nextPhaseEndsAt =
            typeof newState.phase_ends_at === 'string'
              ? new Date(newState.phase_ends_at).getTime()
              : null;

          // Build the SOLD/UNSOLD outcome message when entering the result phase.
          const nextSoldPlayers = (newState.sold_players as string[]) ?? state.soldPlayers;
          let nextResultMessage = state.resultMessage;
          if (nextStatus === 'result' && currentPlayer) {
            const isSold = nextSoldPlayers.includes(currentPlayer.id);
            nextResultMessage = buildOutcomeMessage(
              currentPlayer.name,
              isSold,
              state.currentHighestBid
            );
          } else if (nextStatus === 'countdown') {
            nextResultMessage = null;
          }

          set((s) => ({
            status: nextStatus,
            currentPlayerIndex: (newState.current_player_index as number) ?? s.currentPlayerIndex,
            currentPlayer,
            timeRemaining: (newState.time_remaining as number) ?? s.timeRemaining,
            countdown: (newState.countdown as number) ?? s.countdown,
            phaseEndsAt: nextPhaseEndsAt,
            resultMessage: nextResultMessage,
            currentRound: (newState.current_round as number) ?? s.currentRound,
            roundTotalPlayers: (newState.round_total_players as number) ?? s.roundTotalPlayers,
            roundCurrentIndex: (newState.round_current_index as number) ?? s.roundCurrentIndex,
            soldPlayers: (newState.sold_players as string[]) ?? s.soldPlayers,
            unsoldrPlayers: (newState.unsold_players as string[]) ?? s.unsoldrPlayers,

            // bids are driven by bidsChannel
            bidHistory: shouldClearBids ? [] : s.bidHistory,
            currentHighestBid: shouldClearBids ? null : s.currentHighestBid,
          }));
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

          // FIX F1: realtime delivery order is not guaranteed under load, so a
          // late/lower bid must not overwrite a higher one. Keep the max.
          set((s) => ({
            currentHighestBid:
              !s.currentHighestBid || bid.amount > s.currentHighestBid.amount
                ? bid
                : s.currentHighestBid,
            bidHistory: [...s.bidHistory, bid],
          }));
        }
      )
      .subscribe();

    // 3) USERS CHANNEL (light updates only)
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
                    // keep wonPlayers; playersChannel recomputes it
                    wonPlayers: u.wonPlayers,
                  }
                : u
            ),
          }));
        }
      )
      .subscribe();

    // 4) PLAYERS CHANNEL (robust realtime winners/target)
    // When a player is SOLD/UNSOLD, we refetch users via loadUsers(sold_players).
    // This avoids relying on payload.old and avoids incremental drift.
    playersChannel = supabase
      .channel('players-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players' },
        async () => {
          const auctionState = await AuctionEngine.getAuctionState();
          const soldPlayerIds: string[] = auctionState?.sold_players ?? [];

          const users = await AuctionEngine.loadUsers(soldPlayerIds);
          set({ users });
        }
      )
      .subscribe();

    // ── Universal deadline clock (all clients) ──────────────────
    // Renders the countdown locally from phase_ends_at and drives the
    // server-side phase advance when the deadline passes.
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
      const s = get();
      const ends = s.phaseEndsAt;
      if (!ends) return;

      const remainingMs = ends - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      if (s.status === 'active') {
        if (s.timeRemaining !== remainingSec) set({ timeRemaining: remainingSec });
      } else if (s.status === 'countdown' || s.status === 'result') {
        if (s.countdown !== remainingSec) set({ countdown: remainingSec });
      }

      if (
        remainingMs <= 0 &&
        (s.status === 'countdown' || s.status === 'active' || s.status === 'result')
      ) {
        void driveAuctionTick();
      }
    }, 250);
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
    if (playersChannel) {
      supabase.removeChannel(playersChannel);
      playersChannel = null;
    }
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
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

    // Server sets phase_ends_at authoritatively (no client-clock skew).
    await supabase.rpc('start_auction', {
      p_first_player_id: firstPlayer.id,
      p_total_players: players.length,
    });
  },

  // ── pauseAuction (admin only) ──────────────────────────────
  pauseAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') return;
    if (state.status !== 'active') return;

    await supabase.rpc('pause_auction');
  },

  // ── resumeAuction (admin only) ─────────────────────────────
  resumeAuction: async () => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') return;
    if (state.status !== 'paused') return;

    await supabase.rpc('resume_auction');
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
      phaseEndsAt: null,
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

  // ── reconcile (anti-drift heartbeat) ───────────────────────
  // Periodically (and on reconnect / tab focus) re-read the DB to repair any
  // realtime events dropped under load. Does NOT touch the live timer fields
  // (time_remaining / countdown) to avoid fighting the ticker.
  reconcile: async () => {
    if (!get().currentUserId) return;

    try {
      const auctionState = await AuctionEngine.getAuctionState();
      if (!auctionState) return;

      const soldPlayerIds: string[] = auctionState.sold_players ?? [];
      const users = await AuctionEngine.loadUsers(soldPlayerIds);

      // Authoritative highest bid comes from auction_state.current_highest_bid_id
      let currentHighestBid = get().currentHighestBid;
      const highestBidId = (auctionState.current_highest_bid_id as string | null) ?? null;

      if (highestBidId) {
        const { data: bidRow } = await supabase
          .from('bids')
          .select('amount, user_id, created_at')
          .eq('id', highestBidId)
          .maybeSingle();

        if (bidRow) {
          const uid = bidRow.user_id as string;
          const u = users.find((x) => x.id === uid);
          currentHighestBid = {
            userId: uid,
            username: u?.username ?? get().currentHighestBid?.username ?? 'Unknown',
            amount: bidRow.amount as number,
            timestamp: new Date(bidRow.created_at as string).getTime(),
          };
        }
      } else {
        currentHighestBid = null;
      }

      const status = (auctionState.status as AuctionStatus) ?? get().status;
      const cp = get().currentPlayer;
      let resultMessage = get().resultMessage;
      if (status === 'result' && cp) {
        const isSold = (auctionState.sold_players ?? []).includes(cp.id);
        resultMessage = buildOutcomeMessage(cp.name, isSold, currentHighestBid);
      }

      set({
        users,
        soldPlayers: auctionState.sold_players ?? [],
        unsoldrPlayers: auctionState.unsold_players ?? [],
        status,
        phaseEndsAt: auctionState.phase_ends_at
          ? new Date(auctionState.phase_ends_at).getTime()
          : null,
        resultMessage,
        currentRound: auctionState.current_round ?? get().currentRound,
        roundTotalPlayers: auctionState.round_total_players ?? get().roundTotalPlayers,
        roundCurrentIndex: auctionState.round_current_index ?? get().roundCurrentIndex,
        currentHighestBid,
      });
    } catch (e) {
      console.error('reconcile error:', e);
    }
  },
}));