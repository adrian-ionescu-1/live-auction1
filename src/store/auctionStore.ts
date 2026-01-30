// src/store/auctionStore.ts

import { create } from 'zustand';
import { AuctionState, Player, User } from '@/types/auction.types';
import { AuctionEngine, auctionEngine } from '@/services/auctionEngine';

const COUNTDOWN_DURATION = 3;
const AUCTION_DURATION = 30;
const RESULT_DISPLAY_DURATION = 3;

export const useAuctionStore = create<AuctionState>((set, get) => ({
  users: [],
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

  selectUser: (userId: string) => {
    set({ currentUserId: userId });
  },

  startAuction: async () => {
    const state = get();
    
    let players = state.allPlayers;
    let users = state.users;

    if (players.length === 0) {
      players = await AuctionEngine.loadPlayers();
    }

    if (users.length === 0) {
      users = await AuctionEngine.loadUsers();
    }

    if (players.length === 0 || users.length === 0) {
      console.error('Failed to load data from Supabase');
      return;
    }

    set({
      users,
      allPlayers: players,
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

    startCountdown();
  },

  pauseAuction: () => {
    const state = get();
    if (state.status === 'active') {
      auctionEngine.pauseTimer();
      set({ status: 'paused' });
    }
  },

  resumeAuction: () => {
    const state = get();
    if (state.status === 'paused') {
      auctionEngine.resumeTimer(() => get().tick());
      set({ status: 'active' });
    }
  },

  placeBid: async (amount: number): Promise<boolean> => {
    const state = get();
    const user = state.users.find((u) => u.id === state.currentUserId);

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

    const { bid, newTimeRemaining } = AuctionEngine.processBid(
      user!.id,
      user!.username,
      amount,
      state.timeRemaining
    );

    const saved = await AuctionEngine.saveBid(
      state.currentPlayer!.id,
      user!.id,
      amount
    );

    if (!saved) {
      console.error('Failed to save bid to Supabase');
      return false;
    }

    set({
      currentHighestBid: bid,
      bidHistory: [...state.bidHistory, bid],
      timeRemaining: newTimeRemaining,
    });

    return true;
  },

  tick: () => {
    const state = get();

    if (state.status === 'countdown') {
      if (state.countdown > 0) {
        set({ countdown: state.countdown - 1 });
      } else {
        auctionEngine.startTimer(() => get().tick());
        set({ status: 'active' });
      }
      return;
    }

    if (state.status === 'active') {
      if (state.timeRemaining > 0) {
        set({ timeRemaining: state.timeRemaining - 1 });
      } else {
        endCurrentAuction();
      }
      return;
    }

    if (state.status === 'result') {
      if (state.countdown > 0) {
        set({ countdown: state.countdown - 1 });
      } else {
        loadNextPlayer();
      }
      return;
    }
  },

  reset: async () => {
    auctionEngine.stopTimer();
    
    const resetSuccess = await AuctionEngine.resetAuction();
    if (!resetSuccess) {
      console.error('Failed to reset auction in Supabase');
    }

    const users = await AuctionEngine.loadUsers();

    set({
      users,
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

async function endCurrentAuction() {
  const state = useAuctionStore.getState();
  auctionEngine.stopTimer();

  const winner = state.currentHighestBid;
  const player = state.currentPlayer!;

  const resultMessage = AuctionEngine.generateResultMessage(player, winner);

  let updatedUsers = state.users;
  let updatedSoldPlayers = state.soldPlayers;
  let updatedUnsoldPlayers = state.unsoldrPlayers;

  if (winner) {
    updatedUsers = AuctionEngine.deductBalanceAndAddPlayer(
      state.users,
      winner.userId,
      winner.amount,
      player
    );

    const balanceUpdateSuccess = await AuctionEngine.updateUserBalance(
      winner.userId,
      updatedUsers.find((u) => u.id === winner.userId)!.balance
    );

    if (!balanceUpdateSuccess) {
      console.error('Failed to update user balance in Supabase');
    }

    updatedSoldPlayers = [...state.soldPlayers, player.id];
  } else {
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

  startResultCountdown();
}

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

function loadNextPlayer() {
  const state = useAuctionStore.getState();

  const { nextIndex, isFinished } = AuctionEngine.getNextPlayerIndex(
    state.currentPlayerIndex,
    state.allPlayers,
    state.soldPlayers,
    state.unsoldrPlayers
  );

  if (isFinished) {
    auctionEngine.stopTimer();
    useAuctionStore.setState({
      status: 'finished',
      resultMessage: 'Auction completed! All players sold.',
    });
    return;
  }

  const nextPlayer = state.allPlayers[nextIndex];
  const updatedUnsoldPlayers = state.unsoldrPlayers.filter((id) => id !== nextPlayer.id);

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

  startCountdown();
}