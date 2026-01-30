// src/store/auctionStore.ts

import { create } from 'zustand';
import { AuctionState, Player, User } from '@/types/auction.types';
import { AuctionEngine, auctionEngine } from '@/services/auctionEngine';

const COUNTDOWN_DURATION = 3;
const AUCTION_DURATION = 30;
const RESULT_DISPLAY_DURATION = 3;

export const useAuctionStore = create<AuctionState>((set, get) => ({
  // Initial state
  users: AuctionEngine.initializeUsers(),
  currentUserId: null,
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

  // Select user (login)
  selectUser: (userId: string) => {
    set({ currentUserId: userId });
  },

  // Start auction
  startAuction: async () => {
    const state = get();
    
    // Load players if not loaded
    let players = state.allPlayers;
    if (players.length === 0) {
      players = await AuctionEngine.loadPlayers();
      set({ allPlayers: players });
    }

    // Reset state for new auction
    set({
      currentPlayerIndex: 0,
      currentPlayer: players[0],
      soldPlayers: [],
      unsoldrPlayers: [],
      status: 'countdown',
      countdown: COUNTDOWN_DURATION,
      timeRemaining: AUCTION_DURATION,
      currentHighestBid: null,
      bidHistory: [],
      resultMessage: null,
    });

    // Start countdown
    startCountdown();
  },

  // Pause auction
  pauseAuction: () => {
    const state = get();
    if (state.status === 'active') {
      auctionEngine.pauseTimer();
      set({ status: 'paused' });
    }
  },

  // Resume auction
  resumeAuction: () => {
    const state = get();
    if (state.status === 'paused') {
      auctionEngine.resumeTimer(() => get().tick());
      set({ status: 'active' });
    }
  },

  // Place bid
  placeBid: (amount: number): boolean => {
    const state = get();
    const user = state.users.find((u) => u.id === state.currentUserId);

    // Validate bid
    const validation = AuctionEngine.canPlaceBid(
      user,
      amount,
      state.currentHighestBid,
      state.status
    );

    if (!validation.valid) {
      console.error('Bid rejected:', validation.reason);
      return false;
    }

    // Process bid
    const { bid, newTimeRemaining } = AuctionEngine.processBid(
      user!.id,
      user!.username,
      amount,
      state.timeRemaining
    );

    // Update state
    set({
      currentHighestBid: bid,
      bidHistory: [...state.bidHistory, bid],
      timeRemaining: newTimeRemaining,
    });

    return true;
  },

  // Tick (called every second)
  tick: () => {
    const state = get();

    // Handle countdown
    if (state.status === 'countdown') {
      if (state.countdown > 0) {
        set({ countdown: state.countdown - 1 });
      } else {
        // Countdown finished, start auction
        auctionEngine.startTimer(() => get().tick());
        set({ status: 'active' });
      }
      return;
    }

    // Handle active auction
    if (state.status === 'active') {
      if (state.timeRemaining > 0) {
        set({ timeRemaining: state.timeRemaining - 1 });
      } else {
        // Time's up - end auction
        endCurrentAuction();
      }
      return;
    }

    // Handle result display
    if (state.status === 'result') {
      if (state.countdown > 0) {
        set({ countdown: state.countdown - 1 });
      } else {
        // Result display finished, load next player
        loadNextPlayer();
      }
      return;
    }
  },

  // Reset auction
  reset: () => {
    auctionEngine.stopTimer();
    set({
      users: AuctionEngine.initializeUsers(),
      currentUserId: null,
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
    });
  },
}));

// Helper: Start countdown
function startCountdown() {
  const countdownInterval = setInterval(() => {
    const state = useAuctionStore.getState();
    if (state.status === 'countdown') {
      state.tick();
    } else {
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// Helper: End current auction
function endCurrentAuction() {
  const state = useAuctionStore.getState();
  auctionEngine.stopTimer();

  const winner = state.currentHighestBid;
  const player = state.currentPlayer!;

  // Generate result message
  const resultMessage = AuctionEngine.generateResultMessage(player, winner);

  // Update users and tracking
  let updatedUsers = state.users;
  let updatedSoldPlayers = state.soldPlayers;
  let updatedUnsoldPlayers = state.unsoldrPlayers;

  if (winner) {
    // Deduct balance from winner and add player to their won list
    updatedUsers = AuctionEngine.deductBalanceAndAddPlayer(
      state.users,
      winner.userId,
      winner.amount,
      player
    );
    // Mark player as sold
    updatedSoldPlayers = [...state.soldPlayers, player.id];
  } else {
    // No bids - mark as unsold for re-auction
    updatedUnsoldPlayers = [...state.unsoldrPlayers, player.id];
  }

  useAuctionStore.setState({
    users: updatedUsers,
    soldPlayers: updatedSoldPlayers,
    unsoldrPlayers: updatedUnsoldPlayers,
    status: 'result',
    countdown: RESULT_DISPLAY_DURATION,
    resultMessage,
  });

  // Start result countdown
  startResultCountdown();
}

// Helper: Start result countdown
function startResultCountdown() {
  const resultInterval = setInterval(() => {
    const state = useAuctionStore.getState();
    if (state.status === 'result') {
      state.tick();
    } else {
      clearInterval(resultInterval);
    }
  }, 1000);
}

// Helper: Load next player
function loadNextPlayer() {
  const state = useAuctionStore.getState();

  // Get next player index
  const { nextIndex, isFinished } = AuctionEngine.getNextPlayerIndex(
    state.currentPlayerIndex,
    state.allPlayers,
    state.soldPlayers,
    state.unsoldrPlayers
  );

  if (isFinished) {
    // Auction finished
    auctionEngine.stopTimer();
    useAuctionStore.setState({
      status: 'finished',
      resultMessage: 'Auction completed! All players sold.',
    });
    return;
  }

  // Remove player from unsold list if it was there
  const nextPlayer = state.allPlayers[nextIndex];
  const updatedUnsoldPlayers = state.unsoldrPlayers.filter((id) => id !== nextPlayer.id);

  // Load next player
  useAuctionStore.setState({
    currentPlayerIndex: nextIndex,
    currentPlayer: nextPlayer,
    unsoldrPlayers: updatedUnsoldPlayers,
    status: 'countdown',
    countdown: COUNTDOWN_DURATION,
    timeRemaining: AUCTION_DURATION,
    currentHighestBid: null,
    bidHistory: [],
    resultMessage: null,
  });

  // Start countdown for next player
  startCountdown();
}