// src/store/auctionStore.ts

import { create } from 'zustand';
import { AuctionState, Player, User, Bid, WonPlayer } from '@/types/auction.types';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const COUNTDOWN_DURATION = 3;
const AUCTION_DURATION = 30;
const RESULT_DISPLAY_DURATION = 3;

let auctionStateChannel: RealtimeChannel | null = null;
let bidsChannel: RealtimeChannel | null = null;
let timerInterval: NodeJS.Timeout | null = null;

interface AuctionStoreState extends AuctionState {
  selectUser: (userId: string) => void;
  startAuction: () => Promise<void>;
  pauseAuction: () => Promise<void>;
  resumeAuction: () => Promise<void>;
  placeBid: (amount: number) => Promise<boolean>;
  tick: () => void;
  reset: () => Promise<void>;
  initializeRealtime: () => void;
  cleanupRealtime: () => void;
}

async function loadUsersWithWonPlayers(): Promise<User[]> {
  const { data: usersData } = await supabase.from('users').select('*');
  if (!usersData) return [];

  const { data: bidsData } = await supabase
    .from('bids')
    .select('*, players(id, name)')
    .order('amount', { ascending: false });

  const { data: playersData } = await supabase.from('players').select('*');

  const winningBidsByPlayer: Record<string, { user_id: string; amount: number; player_name: string }> = {};

  if (bidsData) {
    for (const bid of bidsData) {
      if (!winningBidsByPlayer[bid.player_id]) {
        winningBidsByPlayer[bid.player_id] = {
          user_id: bid.user_id,
          amount: bid.amount,
          player_name: (bid.players as any)?.name || 'Unknown Player',
        };
      }
    }
  }

  const userWonPlayersMap: Record<string, WonPlayer[]> = {};
  
  Object.entries(winningBidsByPlayer).forEach(([playerId, winData]) => {
    if (!userWonPlayersMap[winData.user_id]) {
      userWonPlayersMap[winData.user_id] = [];
    }
    userWonPlayersMap[winData.user_id].push({
      playerId,
      playerName: winData.player_name,
      amount: winData.amount,
    });
  });

  const users: User[] = usersData.map((u: any) => ({
    id: u.id,
    username: u.username,
    balance: u.balance,
    isAdmin: u.is_admin,
    wonPlayers: userWonPlayersMap[u.id] || [],
  }));

  return users;
}

export const useAuctionStore = create<AuctionStoreState>((set, get) => ({
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

  initializeRealtime: () => {
    // Cleanup existing subscriptions
    get().cleanupRealtime();

    // Subscribe to auction_state changes
    auctionStateChannel = supabase
      .channel('auction-state-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'auction_state',
        },
        async (payload) => {
          const newState = payload.new as any;
          const state = get();

          let currentPlayer: Player | null = null;
          if (newState.current_player_id) {
            const player = state.allPlayers.find(p => p.id === newState.current_player_id);
            if (player) {
              currentPlayer = player;
            } else {
              const { data } = await supabase
                .from('players')
                .select('*')
                .eq('id', newState.current_player_id)
                .single();
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

          let currentHighestBid: Bid | null = null;
          if (newState.current_highest_bid_id) {
            const { data: bidData } = await supabase
              .from('bids')
              .select('*, users(username)')
              .eq('id', newState.current_highest_bid_id)
              .single();
            
            if (bidData) {
              currentHighestBid = {
                userId: bidData.user_id,
                username: (bidData.users as any)?.username || 'Unknown',
                amount: bidData.amount,
                timestamp: new Date(bidData.created_at).getTime(),
              };
            }
          }

          set({
            status: newState.status,
            currentPlayerIndex: newState.current_player_index,
            currentPlayer,
            timeRemaining: newState.time_remaining,
            countdown: newState.countdown,
            currentHighestBid,
          });

          // Start/stop timer based on status
          if (newState.status === 'countdown' || newState.status === 'active' || newState.status === 'result') {
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

    // Subscribe to bids changes
    bidsChannel = supabase
      .channel('bids-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        },
        async (payload) => {
          const newBid = payload.new as any;
          const state = get();

          if (newBid.player_id === state.currentPlayer?.id) {
            const { data: userData } = await supabase
              .from('users')
              .select('username')
              .eq('id', newBid.user_id)
              .single();

            const bid: Bid = {
              userId: newBid.user_id,
              username: userData?.username || 'Unknown',
              amount: newBid.amount,
              timestamp: new Date(newBid.created_at).getTime(),
            };

            set({
              currentHighestBid: bid,
              bidHistory: [...state.bidHistory, bid],
            });

            // Update auction_state with new highest bid
            const { data: auctionStateData } = await supabase
              .from('auction_state')
              .select('*')
              .limit(1)
              .single();

            if (auctionStateData) {
              await supabase
                .from('auction_state')
                .update({
                  current_highest_bid_id: newBid.id,
                  time_remaining: Math.max(state.timeRemaining, 10),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', auctionStateData.id);
            }
          }
        }
      )
      .subscribe();
  },

  cleanupRealtime: () => {
    if (auctionStateChannel) {
      supabase.removeChannel(auctionStateChannel);
      auctionStateChannel = null;
    }
    if (bidsChannel) {
      supabase.removeChannel(bidsChannel);
      bidsChannel = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  },

  selectUser: async (userId: string) => {
    set({ currentUserId: userId });
    const users = await loadUsersWithWonPlayers();
    set({ users });
  },

  startAuction: async () => {
    const state = get();

    // Load users with won players
    const users = await loadUsersWithWonPlayers();

    // Load players
    const { data: playersData } = await supabase.from('players').select('*');
    const players: Player[] = (playersData || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      rating: p.rating,
      image: p.image,
      basePrice: p.base_price,
    }));

    if (players.length === 0 || users.length === 0) {
      console.error('Failed to load data from Supabase');
      return;
    }

    set({
      users,
      allPlayers: players,
      soldPlayers: [],
      unsoldrPlayers: [],
      bidHistory: [],
    });

    // Update auction_state to start
    const { data: auctionStateData } = await supabase
      .from('auction_state')
      .select('*')
      .limit(1)
      .single();

    if (auctionStateData) {
      await supabase
        .from('auction_state')
        .update({
          status: 'countdown',
          current_player_id: players[0].id,
          current_player_index: 0,
          countdown: COUNTDOWN_DURATION,
          time_remaining: AUCTION_DURATION,
          current_highest_bid_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionStateData.id);
    }
  },

  pauseAuction: async () => {
    const { data: auctionStateData } = await supabase
      .from('auction_state')
      .select('*')
      .limit(1)
      .single();

    if (auctionStateData && auctionStateData.status === 'active') {
      await supabase
        .from('auction_state')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionStateData.id);
    }
  },

  resumeAuction: async () => {
    const { data: auctionStateData } = await supabase
      .from('auction_state')
      .select('*')
      .limit(1)
      .single();

    if (auctionStateData && auctionStateData.status === 'paused') {
      await supabase
        .from('auction_state')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionStateData.id);
    }
  },

  placeBid: async (amount: number): Promise<boolean> => {
    const state = get();
    const user = state.users.find((u) => u.id === state.currentUserId);

    if (!user || !state.currentPlayer || state.status !== 'active') {
      return false;
    }

    const minBid = state.currentHighestBid 
      ? state.currentHighestBid.amount + 1 
      : state.currentPlayer.basePrice;

    if (amount < minBid || amount > user.balance) {
      return false;
    }

    const { error } = await supabase.from('bids').insert({
      player_id: state.currentPlayer.id,
      user_id: user.id,
      amount: amount,
    });

    if (error) {
      console.error('Failed to save bid:', error);
      return false;
    }

    return true;
  },

  tick: async () => {
    const state = get();

    if (state.status === 'countdown') {
      if (state.countdown > 1) {
        const { data: auctionStateData } = await supabase
          .from('auction_state')
          .select('*')
          .limit(1)
          .single();

        if (auctionStateData) {
          await supabase
            .from('auction_state')
            .update({
              countdown: state.countdown - 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', auctionStateData.id);
        }
      } else {
        const { data: auctionStateData } = await supabase
          .from('auction_state')
          .select('*')
          .limit(1)
          .single();

        if (auctionStateData) {
          await supabase
            .from('auction_state')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', auctionStateData.id);
        }
      }
      return;
    }

    if (state.status === 'active') {
      if (state.timeRemaining > 1) {
        const { data: auctionStateData } = await supabase
          .from('auction_state')
          .select('*')
          .limit(1)
          .single();

        if (auctionStateData) {
          await supabase
            .from('auction_state')
            .update({
              time_remaining: state.timeRemaining - 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', auctionStateData.id);
        }
      } else {
        // End auction
        await endCurrentAuction(get, set);
      }
      return;
    }

    if (state.status === 'result') {
      if (state.countdown > 1) {
        const { data: auctionStateData } = await supabase
          .from('auction_state')
          .select('*')
          .limit(1)
          .single();

        if (auctionStateData) {
          await supabase
            .from('auction_state')
            .update({
              countdown: state.countdown - 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', auctionStateData.id);
        }
      } else {
        await loadNextPlayer(get, set);
      }
      return;
    }
  },

  reset: async () => {
    get().cleanupRealtime();

    // Delete all bids
    await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Reset user balances
    const { data: usersData } = await supabase.from('users').select('*');
    if (usersData) {
      for (const user of usersData) {
        await supabase
          .from('users')
          .update({ balance: 10000 })
          .eq('id', user.id);
      }
    }

    // Reset auction_state
    const { data: auctionStateData } = await supabase
      .from('auction_state')
      .select('*')
      .limit(1)
      .single();

    if (auctionStateData) {
      await supabase
        .from('auction_state')
        .update({
          status: 'idle',
          current_player_id: null,
          current_player_index: -1,
          countdown: COUNTDOWN_DURATION,
          time_remaining: AUCTION_DURATION,
          current_highest_bid_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionStateData.id);
    }

    // Load users with reset balances
    const users = await loadUsersWithWonPlayers();

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

async function endCurrentAuction(get: any, set: any) {
  const state = get();
  const winner = state.currentHighestBid;
  const player = state.currentPlayer!;

  let resultMessage = `${player.name} - `;
  let updatedSoldPlayers = state.soldPlayers;
  let updatedUnsoldPlayers = state.unsoldrPlayers;

  if (winner) {
    resultMessage += `SOLD to ${winner.username} for $${winner.amount.toLocaleString()}!`;
    updatedSoldPlayers = [...state.soldPlayers, player.id];

    // Update user balance
    const user = state.users.find((u: User) => u.id === winner.userId);
    if (user) {
      const newBalance = user.balance - winner.amount;
      await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', user.id);

      const wonPlayer: WonPlayer = {
        playerId: player.id,
        playerName: player.name,
        amount: winner.amount,
      };

      set({
        users: state.users.map((u: User) =>
          u.id === winner.userId ? { ...u, balance: newBalance, wonPlayers: [...u.wonPlayers, wonPlayer] } : u
        ),
      });
    }
  } else {
    resultMessage += 'UNSOLD';
    updatedUnsoldPlayers = [...state.unsoldrPlayers, player.id];
  }

  set({
    soldPlayers: updatedSoldPlayers,
    unsoldrPlayers: updatedUnsoldPlayers,
    resultMessage,
  });

  const { data: auctionStateData } = await supabase
    .from('auction_state')
    .select('*')
    .limit(1)
    .single();

  if (auctionStateData) {
    await supabase
      .from('auction_state')
      .update({
        status: 'result',
        countdown: RESULT_DISPLAY_DURATION,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionStateData.id);
  }
}

async function loadNextPlayer(get: any, set: any) {
  const state = get();

  const nextIndex = state.currentPlayerIndex + 1;

  if (nextIndex >= state.allPlayers.length) {
    const { data: auctionStateData } = await supabase
      .from('auction_state')
      .select('*')
      .limit(1)
      .single();

    if (auctionStateData) {
      await supabase
        .from('auction_state')
        .update({
          status: 'finished',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auctionStateData.id);
    }

    set({
      resultMessage: 'Auction completed! All players sold.',
    });
    return;
  }

  const nextPlayer = state.allPlayers[nextIndex];

  set({
    bidHistory: [],
  });

  const { data: auctionStateData } = await supabase
    .from('auction_state')
    .select('*')
    .limit(1)
    .single();

  if (auctionStateData) {
    await supabase
      .from('auction_state')
      .update({
        status: 'countdown',
        current_player_id: nextPlayer.id,
        current_player_index: nextIndex,
        countdown: COUNTDOWN_DURATION,
        time_remaining: AUCTION_DURATION,
        current_highest_bid_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auctionStateData.id);
  }
}