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
//    READ-ONLY.  None of them write back to the database.  They
//    only call set() to update local Zustand state.
//
// 5. TIME EXTENSION: extendTime() calls the extend_auction_time RPC.
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

const COUNTDOWN_DURATION  = 3;
const AUCTION_DURATION    = 30;
const RESULT_DISPLAY_DURATION = 3;

// Module-level channel refs and timer (one per browser tab)
let auctionStateChannel: RealtimeChannel | null = null;
let bidsChannel:         RealtimeChannel | null = null;
let usersChannel:        RealtimeChannel | null = null;
let timerInterval:       ReturnType<typeof setInterval> | null = null;

// Prevents the admin tick from re-entering during an async transition
let isProcessingTransition = false;

interface AuctionStoreState extends AuctionState {
  login:            (userId: string, role: UserRole) => Promise<void>;
  logout:           () => void;
  startAuction:    () => Promise<void>;
  pauseAuction:    () => Promise<void>;
  resumeAuction:   () => Promise<void>;
  placeBid:        (amount: number) => Promise<{ success: boolean; error: string | null }>;
  extendTime:      (seconds: number) => Promise<{ success: boolean; error: string | null }>;
  tick:            () => Promise<void>;
  reset:           () => Promise<void>;
  initializeRealtime: () => void;
  cleanupRealtime:    () => void;
}

export const useAuctionStore = create<AuctionStoreState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────
  users:               [],
  currentUserId:       null,
  currentUserRole:     null,
  allPlayers:          [],
  currentPlayerIndex:  -1,
  currentPlayer:       null,
  soldPlayers:         [],
  unsoldrPlayers:      [],
  status:              'idle',
  countdown:           COUNTDOWN_DURATION,
  timeRemaining:       AUCTION_DURATION,
  currentHighestBid:   null,
  bidHistory:          [],
  resultMessage:       null,
  currentRound:        1,
  roundTotalPlayers:   0,
  roundCurrentIndex:   0,

  // ── login ──────────────────────────────────────────────────
  login: async (userId: string, role: UserRole) => {
    set({ currentUserId: userId, currentUserRole: role });

    // Persist for page-refresh survival
    sessionStorage.setItem('auction_user_id', userId);
    sessionStorage.setItem('auction_user_role', role);

    // Read auction state first so we know which players are sold
    const auctionState = await AuctionEngine.getAuctionState();
    const soldPlayerIds: string[] = auctionState?.sold_players ?? [];

    // Now load users (passing soldPlayerIds so wonPlayers is accurate)
    const users   = await AuctionEngine.loadUsers(soldPlayerIds);
    const players = await AuctionEngine.loadPlayers();

    if (auctionState) {
      let currentPlayer: Player | null = null;
      if (auctionState.current_player_id) {
        currentPlayer =
          players.find((p: Player) => p.id === auctionState.current_player_id) || null;
      }

      const soldPlayers   = Array.isArray(auctionState.sold_players)   ? auctionState.sold_players   : [];
      const unsoldrPlayers = Array.isArray(auctionState.unsold_players) ? auctionState.unsold_players : [];

      set({
        users,
        allPlayers:          players,
        status:              auctionState.status as AuctionStatus,
        currentPlayerIndex:  auctionState.current_player_index,
        currentPlayer,
        countdown:           auctionState.countdown,
        timeRemaining:       auctionState.time_remaining,
        currentRound:        auctionState.current_round,
        roundTotalPlayers:   auctionState.round_total_players,
        roundCurrentIndex:   auctionState.round_current_index,
        soldPlayers,
        unsoldrPlayers,
      });
    } else {
      set({ users, allPlayers: players });
    }
  },

  // ── logout ─────────────────────────────────────────────────
  logout: () => {
    sessionStorage.removeItem('auction_user_id');
    sessionStorage.removeItem('auction_user_role');

    get().cleanupRealtime();
    set({
      currentUserId:     null,
      currentUserRole:   null,
      users:             [],
      allPlayers:        [],
      currentPlayerIndex: -1,
      currentPlayer:     null,
      soldPlayers:       [],
      unsoldrPlayers:    [],
      status:            'idle',
      countdown:         COUNTDOWN_DURATION,
      timeRemaining:     AUCTION_DURATION,
      currentHighestBid: null,
      bidHistory:        [],
      resultMessage:     null,
      currentRound:      1,
      roundTotalPlayers: 0,
      roundCurrentIndex: 0,
    });
  },

  // ── initializeRealtime ─────────────────────────────────────
  // All three channels are READ-ONLY: they only call set().
  initializeRealtime: () => {
    // ── auction_state channel ──
    auctionStateChannel = supabase
      .channel('auction-state-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_state' },
        (payload: any) => {
          const newState = payload.new;
          if (!newState) return;

          const currentState = get();

          let currentPlayer: Player | null = null;
          if (newState.current_player_id) {
            currentPlayer =
              currentState.allPlayers.find(
                (p: Player) => p.id === newState.current_player_id
              ) || null;
          }

          const soldPlayers   = Array.isArray(newState.sold_players)   ? newState.sold_players   : [];
          const unsoldrPlayers = Array.isArray(newState.unsold_players) ? newState.unsold_players : [];

          set({
            status:              newState.status as AuctionStatus,
            currentPlayerIndex:  newState.current_player_index,
            currentPlayer,
            countdown:           newState.countdown,
            timeRemaining:       newState.time_remaining,
            currentRound:        newState.current_round,
            roundTotalPlayers:   newState.round_total_players,
            roundCurrentIndex:   newState.round_current_index,
            soldPlayers,
            unsoldrPlayers,
          });

          // ── Timer management (ADMIN only) ──
          // Start or stop the tick interval based on the new status.
          // Non-admin clients never start a timer (tick() returns
          // immediately for them, but we skip the interval entirely
          // to avoid unnecessary polling).
          const role = get().currentUserRole;
          if (role === 'ADMIN') {
            const ticking = newState.status === 'countdown' ||
                            newState.status === 'active'    ||
                            newState.status === 'result';

            if (ticking && !timerInterval) {
              timerInterval = setInterval(() => {
                get().tick();
              }, 1000);
            } else if (!ticking && timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
          }

          // ── Clear bid history when the active player changes ──
          if (
            newState.current_player_id &&
            newState.current_player_id !== currentState.currentPlayer?.id
          ) {
            set({ bidHistory: [], currentHighestBid: null });
          }

          // ── On reset (idle with empty sold array) reload users ──
          if (newState.status === 'idle' && soldPlayers.length === 0) {
            AuctionEngine.loadUsers([]).then((users) => {
              set({ users });
            });
          }
        }
      )
      .subscribe();

    // ── bids channel (READ-ONLY) ──
    // We only update local bidHistory and currentHighestBid.
    // We do NOT write back to auction_state — the place_bid RPC
    // already handled the timer reset atomically.
    bidsChannel = supabase
      .channel('bids-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload: any) => {
          const newBid  = payload.new;
          const state   = get();

          // Ignore bids for players other than the current one
          if (!state.currentPlayer || newBid.player_id !== state.currentPlayer.id) {
            return;
          }

          const user = state.users.find((u: User) => u.id === newBid.user_id);
          if (!user) return;

          const bid: Bid = {
            userId:   newBid.user_id,
            username:  user.username,
            amount:    Number(newBid.amount),
            timestamp: new Date(newBid.created_at).getTime(),
          };

          // Deduplicate: ignore if we already have this exact bid
          const duplicate = state.bidHistory.find(
            (b: Bid) =>
              b.userId === bid.userId &&
              b.amount === bid.amount &&
              Math.abs(b.timestamp - bid.timestamp) < 1000
          );
          if (duplicate) return;

          set({
            bidHistory:        [...state.bidHistory, bid],
            currentHighestBid: bid,  // this bid is always the new highest (RPC enforced)
          });
        }
      )
      .subscribe();

    // ── users channel (READ-ONLY) ──
    // Re-fetches the full users list whenever any user row changes.
    usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        () => {
          const state = get();
          const soldPlayerIds = state.soldPlayers || [];
          AuctionEngine.loadUsers(soldPlayerIds).then((users) => {
            set({ users });
          });
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
    const soldPlayerIds: string[] = [];
    const users   = await AuctionEngine.loadUsers(soldPlayerIds);
    const players = await AuctionEngine.loadPlayers();

    if (players.length === 0) {
      console.error('No players found to auction');
      return;
    }

    set({
      users,
      allPlayers:          players,
      currentPlayerIndex:  0,
      currentPlayer:       players[0],
      countdown:           COUNTDOWN_DURATION,
      soldPlayers:         [],
      unsoldrPlayers:      [],
      currentRound:        1,
      roundTotalPlayers:   players.length,
      roundCurrentIndex:   1,
      bidHistory:          [],
      currentHighestBid:   null,
    });

    await AuctionEngine.updateAuctionState({
      status:               'countdown',
      current_player_id:    players[0].id,
      current_player_index: 0,
      countdown:            COUNTDOWN_DURATION,
      time_remaining:       AUCTION_DURATION,
      current_round:        1,
      round_total_players:  players.length,
      round_current_index:  1,
      sold_players:         [],
      unsold_players:       [],
    });
  },

  // ── pauseAuction (admin only) ──────────────────────────────
  pauseAuction: async () => {
    await AuctionEngine.updateAuctionState({ status: 'paused' });
  },

  // ── resumeAuction (admin only) ─────────────────────────────
  resumeAuction: async () => {
    await AuctionEngine.updateAuctionState({ status: 'active' });
  },

  // ── placeBid ───────────────────────────────────────────────
  // Calls the place_bid RPC.  All validation is server-side.
  // Returns { success, error } so the UI can show feedback.
  placeBid: async (amount: number): Promise<{ success: boolean; error: string | null }> => {
    const state = get();

    // Quick client-side pre-checks (UX only — the RPC re-validates)
    if (state.currentUserRole !== 'USER') {
      return { success: false, error: 'Only users can place bids' };
    }
    if (state.status !== 'active') {
      return { success: false, error: 'Auction is not active' };
    }
    if (!state.currentPlayer) {
      return { success: false, error: 'No current player' };
    }
    if (!state.currentUserId) {
      return { success: false, error: 'Not logged in' };
    }

    // Call the atomic RPC
    const result = await AuctionEngine.placeBidRpc(
      state.currentPlayer.id,
      state.currentUserId,
      amount
    );

    return result;
  },

  // ── extendTime (admin only) ────────────────────────────────
  extendTime: async (seconds: number): Promise<{ success: boolean; error: string | null }> => {
    const state = get();
    if (state.currentUserRole !== 'ADMIN') {
      return { success: false, error: 'Only admins can extend time' };
    }

    const result = await AuctionEngine.extendAuctionTimeRpc(seconds);
    // The realtime auction_state channel will push the updated
    // time_remaining to this (and every other) client automatically.
    return result;
  },

  // ── tick (ADMIN ONLY) ──────────────────────────────────────
  // This is the single authoritative timer driver.
  // Non-admin clients never reach the logic below.
  tick: async () => {
    const state = get();

    // ── GUARD: only ADMIN ticks ──
    if (state.currentUserRole !== 'ADMIN') return;

    // ── GUARD: prevent re-entrant async transitions ──
    if (isProcessingTransition) return;

    // ── countdown phase ──
    if (state.status === 'countdown') {
      if (state.countdown > 1) {
        await AuctionEngine.updateAuctionState({
          countdown: state.countdown - 1,
        });
      } else {
        // Countdown finished → go active
        await AuctionEngine.updateAuctionState({
          status:         'active',
          countdown:      0,
          time_remaining: AUCTION_DURATION,
        });
      }
      return;
    }

    // ── active phase ──
    if (state.status === 'active') {
      if (state.timeRemaining > 1) {
        await AuctionEngine.updateAuctionState({
          time_remaining: state.timeRemaining - 1,
        });
      } else {
        // Time's up — settle the player via atomic RPC
        isProcessingTransition = true;
        await settleCurrentPlayer(get, set);
        isProcessingTransition = false;
      }
      return;
    }

    // ── result phase ──
    if (state.status === 'result') {
      if (state.countdown > 1) {
        await AuctionEngine.updateAuctionState({
          countdown: state.countdown - 1,
        });
      } else {
        // Result display finished → load next player (or finish)
        isProcessingTransition = true;
        await loadNextPlayer(get, set);
        isProcessingTransition = false;
      }
      return;
    }
  },

  // ── reset (admin only) ─────────────────────────────────────
  reset: async () => {
    const state = get();
    const { currentUserId, currentUserRole } = state;

    await AuctionEngine.resetAuction();

    const users   = await AuctionEngine.loadUsers([]);
    const players = await AuctionEngine.loadPlayers();

    set({
      users,
      currentUserId,
      currentUserRole,
      allPlayers:          players,
      currentPlayerIndex:  -1,
      currentPlayer:       null,
      soldPlayers:         [],
      unsoldrPlayers:      [],
      status:              'idle',
      countdown:           COUNTDOWN_DURATION,
      timeRemaining:       AUCTION_DURATION,
      currentHighestBid:   null,
      bidHistory:          [],
      resultMessage:       null,
      currentRound:        1,
      roundTotalPlayers:   0,
      roundCurrentIndex:   0,
    });
  },
}));

// ──────────────────────────────────────────────────────────────
// HELPER: settleCurrentPlayer
// Called by the admin tick when time_remaining hits 0.
// Delegates all balance/winner logic to the settle_player RPC.
// ──────────────────────────────────────────────────────────────
async function settleCurrentPlayer(get: any, set: any) {
  const state  = get();
  const player = state.currentPlayer;
  if (!player) return;

  // Call the atomic RPC — it handles winner detection, balance
  // decrement, and auction_state transition in one transaction.
  const result = await AuctionEngine.settlePlayerRpc(player.id);

  if (result.error) {
    console.error('settle_player RPC error:', result.error);
    return;
  }

  // Build the result message for the UI
  let resultMessage: string;
  if (result.winner_user_id) {
    const winner = state.users.find((u: User) => u.id === result.winner_user_id);
    const winnerName = winner?.username ?? 'Unknown';
    resultMessage = `${player.name} - SOLD to ${winnerName} for $${Number(result.winning_amount).toLocaleString()}!`;
  } else {
    resultMessage = `${player.name} - UNSOLD - will re-auction`;
  }

  // The RPC already wrote status='result' and updated sold/unsold arrays
  // in auction_state.  The realtime channel will push that to all clients.
  // We just set the local resultMessage (it's UI-only, not persisted).
  set({ resultMessage });
}

// ──────────────────────────────────────────────────────────────
// HELPER: loadNextPlayer
// Called by the admin tick after the result display countdown ends.
// Determines which player is next, or finishes the auction.
// ──────────────────────────────────────────────────────────────
async function loadNextPlayer(get: any, set: any) {
  const state = get();

  const soldPlayerIds   = new Set(state.soldPlayers);
  const unsoldPlayerIds = new Set(state.unsoldrPlayers);

  // ── Are all players sold? → finish ──
  const remainingPlayers = state.allPlayers.filter(
    (p: Player) => !soldPlayerIds.has(p.id)
  );

  if (remainingPlayers.length === 0) {
    await AuctionEngine.updateAuctionState({
      status:               'finished',
      current_player_id:    null,
      current_player_index: -1,
    });
    set({
      currentPlayer:       null,
      currentPlayerIndex:  -1,
      status:              'finished',
    });
    return;
  }

  // ── Determine which players belong to the current round ──
  const currentRoundPlayers =
    state.currentRound === 1
      ? // Round 1: players not yet sold AND not yet unsold (i.e. not yet auctioned)
        state.allPlayers.filter(
          (p: Player) => !soldPlayerIds.has(p.id) && !unsoldPlayerIds.has(p.id)
        )
      : // Re-auction rounds: players that are unsold and not yet sold
        state.allPlayers.filter(
          (p: Player) => unsoldPlayerIds.has(p.id) && !soldPlayerIds.has(p.id)
        );

  if (currentRoundPlayers.length === 0) {
    // Current round exhausted → start a new round with unsold players
    const unsoldPlayers = state.allPlayers.filter((p: Player) =>
      unsoldPlayerIds.has(p.id)
    );

    if (unsoldPlayers.length === 0) {
      // Nothing left to auction → finish
      await AuctionEngine.updateAuctionState({
        status:               'finished',
        current_player_id:    null,
        current_player_index: -1,
      });
      set({
        currentPlayer:       null,
        currentPlayerIndex:  -1,
        status:              'finished',
      });
      return;
    }

    // Start re-auction round
    const nextPlayer = unsoldPlayers[0];
    const newRound   = state.currentRound + 1;

    set({
      currentPlayer:       nextPlayer,
      currentPlayerIndex:  0,
      currentRound:        newRound,
      roundTotalPlayers:   unsoldPlayers.length,
      roundCurrentIndex:   1,
      bidHistory:          [],
      currentHighestBid:   null,
      unsoldrPlayers:      [],
    });

    await AuctionEngine.updateAuctionState({
      status:               'countdown',
      current_player_id:    nextPlayer.id,
      current_player_index: 0,
      countdown:            COUNTDOWN_DURATION,
      current_round:        newRound,
      round_total_players:  unsoldPlayers.length,
      round_current_index:  1,
      unsold_players:       [],
    });
  } else {
    // Continue current round with next player
    const nextPlayer    = currentRoundPlayers[0];
    const newIndex      = state.currentPlayerIndex + 1;
    const newRoundIndex = state.roundCurrentIndex + 1;

    set({
      currentPlayer:       nextPlayer,
      currentPlayerIndex:  newIndex,
      roundCurrentIndex:   newRoundIndex,
      bidHistory:          [],
      currentHighestBid:   null,
    });

    await AuctionEngine.updateAuctionState({
      status:               'countdown',
      current_player_id:    nextPlayer.id,
      current_player_index: newIndex,
      countdown:            COUNTDOWN_DURATION,
      round_current_index:  newRoundIndex,
    });
  }
}