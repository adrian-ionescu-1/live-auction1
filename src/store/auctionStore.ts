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

    const auctionState = await AuctionEngine.getAuctionState();
    const soldPlayers = auctionState && Array.isArray(auctionState.sold_players) ? auctionState.sold_players : [];

    // Pass soldPlayers so loadUsers only marks actually-sold players as won
    const users = await AuctionEngine.loadUsers(soldPlayers);
    const players = await AuctionEngine.loadPlayers();

    if (auctionState) {
      let currentPlayer: Player | null = null;
      if (auctionState.current_player_id) {
        currentPlayer = players.find((p: Player) => p.id === auctionState.current_player_id) || null;
      }

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
    // Auction state changes
    auctionStateChannel = supabase
      .channel('auction-state-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_state' }, async (payload: any) => {
        const newState = payload.new;
        if (!newState) return;

        const currentState = get();
        let currentPlayer: Player | null = null;

        if (newState.current_player_id) {
          currentPlayer = currentState.allPlayers.find((p: Player) => p.id === newState.current_player_id) || null;
        }

        const soldPlayers = Array.isArray(newState.sold_players) ? newState.sold_players : [];
        const unsoldrPlayers = Array.isArray(newState.unsold_players) ? newState.unsold_players : [];

        // ── FIX #3: propagate reset to all clients ──
        // When the status transitions to 'idle', a reset just completed in the DB.
        // Every client must reload users so balances and wonPlayers are fresh.
        // Previously only the admin tab did a local set(); other tabs kept stale data.
        if (newState.status === 'idle') {
          const freshUsers = await AuctionEngine.loadUsers([]);
          set({ users: freshUsers });
        }

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

        // Manage timer based on status
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

        // Clear bids when player changes
        if (newState.current_player_id && newState.current_player_id !== currentState.currentPlayer?.id) {
          set({ bidHistory: [], currentHighestBid: null });
        }
      })
      .subscribe();

    // Bid changes
    bidsChannel = supabase
      .channel('bids-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bids' }, async (payload: any) => {
        const newBid = payload.new;
        const state = get();

        if (!state.currentPlayer || newBid.player_id !== state.currentPlayer.id) {
          return;
        }

        const user = state.users.find((u: User) => u.id === newBid.user_id);
        if (!user) return;

        const bid: Bid = {
          userId: newBid.user_id,
          username: user.username,
          amount: newBid.amount,
          timestamp: new Date(newBid.created_at).getTime(),
        };

        const existingBid = state.bidHistory.find(
          (b: Bid) => b.userId === bid.userId && b.amount === bid.amount && Math.abs(b.timestamp - bid.timestamp) < 1000
        );

        if (!existingBid) {
          // ── FIX #1 (timer): correct bid-time-extension logic ──
          // BUG WAS: `const newTimeRemaining = AUCTION_DURATION;`
          // That reset the timer to a full 30s on EVERY bid regardless of when
          // the bid arrived. The rule is: add 10s only when <=15s remain, cap at 30.
          const currentTime = state.timeRemaining;
          const newTimeRemaining = currentTime <= 15
            ? Math.min(currentTime + 10, AUCTION_DURATION)
            : currentTime;

          set({
            bidHistory: [...state.bidHistory, bid],
            currentHighestBid: bid,
            timeRemaining: newTimeRemaining,
          });

          await AuctionEngine.updateAuctionState({
            current_highest_bid_id: newBid.id,
            time_remaining: newTimeRemaining,
          });
        }
      })
      .subscribe();

    // Subscribe to user updates (balance changes)
    // ── FIX #1 (wonPlayers): pass soldPlayers so only truly sold players count as won ──
    usersChannel = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, async () => {
        const state = get();
        const users = await AuctionEngine.loadUsers(state.soldPlayers);
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
    const users = await AuctionEngine.loadUsers([]);
    const players = await AuctionEngine.loadPlayers();

    if (players.length === 0) {
      console.error('No players found to auction');
      return;
    }

    set({
      users,
      allPlayers: players,
      currentPlayerIndex: 0,
      currentPlayer: players[0],
      countdown: COUNTDOWN_DURATION,
      soldPlayers: [],
      unsoldrPlayers: [],
      currentRound: 1,
      roundTotalPlayers: players.length,
      roundCurrentIndex: 1,
      bidHistory: [],
      currentHighestBid: null,
    });

    await AuctionEngine.updateAuctionState({
      status: 'countdown',
      current_player_id: players[0].id,
      current_player_index: 0,
      countdown: COUNTDOWN_DURATION,
      time_remaining: AUCTION_DURATION,
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
   * Place a bid
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

    return true;
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
        isProcessingTransition = true;
        await loadNextPlayer(get, set);
        isProcessingTransition = false;
      }
      return;
    }
  },

  /**
   * Reset auction (admin only)
   *
   * FIX #3: Stop the local timer before resetting. The DB reset writes
   * auction_state LAST (after bids are deleted and balances restored),
   * so when the realtime handler fires 'idle' on other clients, all
   * underlying data is already clean. The handler then reloads users.
   */
  reset: async () => {
    const state = get();
    const currentUserId = state.currentUserId;
    const currentUserRole = state.currentUserRole;

    // Stop timer immediately — no ticks should fire during reset
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    isProcessingTransition = true;

    await AuctionEngine.resetAuction();

    // Reload for this client right away
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

    isProcessingTransition = false;
    // Realtime propagates status='idle' → other clients reload users in their handler.
  },
}));

// ─────────────────────────────────────────────────────────
// endCurrentAuction
// ─────────────────────────────────────────────────────────
async function endCurrentAuction(get: any, set: any) {
  const state = get();
  const winner = state.currentHighestBid;
  const player = state.currentPlayer!;

  let resultMessage = `${player.name} - `;
  let updatedSoldPlayers = [...state.soldPlayers];
  let updatedUnsoldPlayers = [...state.unsoldrPlayers];

  if (winner) {
    resultMessage += `SOLD to ${winner.username} for $${winner.amount.toLocaleString()}!`;

    if (!updatedSoldPlayers.includes(player.id)) {
      updatedSoldPlayers.push(player.id);
    }
    updatedUnsoldPlayers = updatedUnsoldPlayers.filter((id: string) => id !== player.id);

    // ── FIX #1 (budget): read winner balance fresh from DB before deducting ──
    // BUG WAS: used state.users which could be stale. The usersChannel realtime
    // handler calls loadUsers() which previously counted ALL bidded players as
    // "won" — so balances got recomputed wrong. Two fixes combined:
    //   (a) loadUsers now receives soldPlayers and only marks sold players as won.
    //   (b) We read fresh from DB here so we always deduct from the real balance.
    const freshUsers = await AuctionEngine.loadUsers(updatedSoldPlayers);
    const freshWinner = freshUsers.find((u: User) => u.id === winner.userId);

    if (freshWinner) {
      const newBalance = freshWinner.balance - winner.amount;
      await AuctionEngine.updateUserBalance(freshWinner.id, newBalance);

      // Build updated users list from the fresh snapshot, then apply this sale on top
      const updatedUsers = freshUsers.map((u: User) =>
        u.id === winner.userId
          ? {
              ...u,
              balance: newBalance,
              wonPlayers: [
                ...u.wonPlayers,
                { playerId: player.id, playerName: player.name, amount: winner.amount } as WonPlayer,
              ],
            }
          : u
      );
      set({ users: updatedUsers });
    }
  } else {
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

  await AuctionEngine.updateAuctionState({
    status: 'result',
    countdown: RESULT_DISPLAY_DURATION,
    sold_players: updatedSoldPlayers,
    unsold_players: updatedUnsoldPlayers,
  });
}

// ─────────────────────────────────────────────────────────
// loadNextPlayer
//
// FIX #2: Rewrote the sequencing logic entirely.
//
// OLD logic computed "currentRoundPlayers" by set-filtering allPlayers against
// sold & unsold. This broke because:
//   • In round 1 it filtered for "not sold AND not unsold", which excluded any
//     player that had already gone unsold — so it could never find them again.
//   • When starting a re-auction round it cleared unsoldrPlayers to [].
//     So for the 2nd+ player in that re-auction, the unsold set was empty and
//     it kept trying to start new rounds → infinite loop / stuck.
//
// NEW logic uses a simple explicit walk:
//   1. Walk forward in allPlayers from currentPlayerIndex+1. Skip sold & already-
//      queued-as-unsold players. If found → continue round 1 sequence.
//   2. If nothing left in original sequence, look at the unsold queue.
//      If empty → finished. If not → start (or continue) a re-auction round.
//   3. The unsold queue is NEVER cleared mid-auction. Players are only removed
//      from it when they finally get sold (in endCurrentAuction).
// ─────────────────────────────────────────────────────────
async function loadNextPlayer(get: any, set: any) {
  const state = get();
  const soldSet = new Set(state.soldPlayers);
  const unsoldList: string[] = state.unsoldrPlayers;

  // ── STEP 1: try to continue the original player sequence ──
  let nextPlayer: Player | null = null;
  let nextIndex = -1;

  for (let i = state.currentPlayerIndex + 1; i < state.allPlayers.length; i++) {
    const candidate = state.allPlayers[i];
    // Skip: already sold, or already sitting in the unsold queue from a prior iteration
    if (!soldSet.has(candidate.id) && !unsoldList.includes(candidate.id)) {
      nextPlayer = candidate;
      nextIndex = i;
      break;
    }
  }

  if (nextPlayer) {
    // Still players left in the original sequence — continue round 1
    const newRoundCurrentIndex = state.roundCurrentIndex + 1;

    set({
      currentPlayer: nextPlayer,
      currentPlayerIndex: nextIndex,
      roundCurrentIndex: newRoundCurrentIndex,
      bidHistory: [],
      currentHighestBid: null,
    });

    await AuctionEngine.updateAuctionState({
      status: 'countdown',
      current_player_id: nextPlayer.id,
      current_player_index: nextIndex,
      countdown: COUNTDOWN_DURATION,
      time_remaining: AUCTION_DURATION,
      current_highest_bid_id: null,
      round_current_index: newRoundCurrentIndex,
    });
    return;
  }

  // ── STEP 2: original sequence done. Check unsold queue. ──
  // Strip out any that got sold during a previous re-auction pass
  const activeUnsold = unsoldList.filter((id: string) => !soldSet.has(id));

  if (activeUnsold.length === 0) {
    // Nothing left → auction finished
    await AuctionEngine.updateAuctionState({
      status: 'finished',
      current_player_id: null,
      current_player_index: -1,
    });
    set({ currentPlayer: null, currentPlayerIndex: -1, status: 'finished' });
    return;
  }

  // ── STEP 3: pick the next unsold player ──
  // Determine whether we start a brand-new re-auction round or continue one.
  let newRound = state.currentRound;
  let newRoundTotal = state.roundTotalPlayers;
  let newRoundIndex: number;
  let queueIndex: number;

  const isNewRound =
    state.currentRound === 1 ||                          // original sequence just ended
    state.roundCurrentIndex >= state.roundTotalPlayers;  // current re-auction round done

  if (isNewRound) {
    newRound = state.currentRound + 1;
    newRoundTotal = activeUnsold.length;
    newRoundIndex = 1;
    queueIndex = 0;
  } else {
    // Continue current re-auction round: advance to next item in activeUnsold
    newRoundIndex = state.roundCurrentIndex + 1;
    const currentIdx = activeUnsold.indexOf(state.currentPlayer?.id || '');
    queueIndex = currentIdx + 1;

    // Safety: if we somehow walked past the end, start a new round
    if (queueIndex >= activeUnsold.length) {
      newRound = state.currentRound + 1;
      newRoundTotal = activeUnsold.length;
      newRoundIndex = 1;
      queueIndex = 0;
    }
  }

  nextPlayer = state.allPlayers.find((p: Player) => p.id === activeUnsold[queueIndex]) || null;

  if (!nextPlayer) {
    // Safety net — should never happen
    await AuctionEngine.updateAuctionState({ status: 'finished', current_player_id: null, current_player_index: -1 });
    set({ currentPlayer: null, currentPlayerIndex: -1, status: 'finished' });
    return;
  }

  nextIndex = state.allPlayers.findIndex((p: Player) => p.id === nextPlayer!.id);

  set({
    currentPlayer: nextPlayer,
    currentPlayerIndex: nextIndex,
    currentRound: newRound,
    roundTotalPlayers: newRoundTotal,
    roundCurrentIndex: newRoundIndex,
    bidHistory: [],
    currentHighestBid: null,
    // unsoldrPlayers intentionally NOT cleared — must persist until players are sold
  });

  await AuctionEngine.updateAuctionState({
    status: 'countdown',
    current_player_id: nextPlayer.id,
    current_player_index: nextIndex,
    countdown: COUNTDOWN_DURATION,
    time_remaining: AUCTION_DURATION,
    current_highest_bid_id: null,
    current_round: newRound,
    round_total_players: newRoundTotal,
    round_current_index: newRoundIndex,
    // unsold_players left untouched in DB — endCurrentAuction manages it
  });
}