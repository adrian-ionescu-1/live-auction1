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
let usersChannel: RealtimeChannel | null = null;
let timerInterval: NodeJS.Timeout | null = null;
let isProcessingTransition = false;

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
    .order('created_at', { ascending: true });

  const { data: playersData } = await supabase.from('players').select('*');

  const winningBidsByPlayer: Record<string, { user_id: string; amount: number; player_name: string }> = {};

  if (bidsData && playersData) {
    const playerIds = new Set<string>();
    
    for (const bid of bidsData) {
      if (!playerIds.has(bid.player_id)) {
        const allBidsForPlayer = bidsData.filter(b => b.player_id === bid.player_id);
        const highestBid = allBidsForPlayer.reduce((max, current) => 
          current.amount > max.amount ? current : max
        );
        
        winningBidsByPlayer[bid.player_id] = {
          user_id: highestBid.user_id,
          amount: highestBid.amount,
          player_name: (highestBid.players as any)?.name || 'Unknown Player',
        };
        
        playerIds.add(bid.player_id);
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
  currentRound: 1,
  roundTotalPlayers: 0,
  roundCurrentIndex: 0,

  initializeRealtime: () => {
    get().cleanupRealtime();

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
          let bidHistory: Bid[] = state.bidHistory;
          
          if (newState.current_highest_bid_id && currentPlayer) {
            const { data: allBids } = await supabase
              .from('bids')
              .select('*, users(username)')
              .eq('player_id', currentPlayer.id)
              .order('created_at', { ascending: true });
            
            if (allBids && allBids.length > 0) {
              bidHistory = allBids.map(bid => ({
                userId: bid.user_id,
                username: (bid.users as any)?.username || 'Unknown',
                amount: bid.amount,
                timestamp: new Date(bid.created_at).getTime(),
              }));
              
              currentHighestBid = bidHistory[bidHistory.length - 1];
            }
          } else if (newState.status === 'countdown') {
            bidHistory = [];
            currentHighestBid = null;
          }

          set({
            status: newState.status,
            currentPlayerIndex: newState.current_player_index,
            currentPlayer,
            timeRemaining: newState.time_remaining,
            countdown: newState.countdown,
            currentHighestBid,
            bidHistory,
          });

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

            const newTimeRemaining = state.timeRemaining <= 15 
              ? Math.min(state.timeRemaining + 10, 30) 
              : state.timeRemaining;

            set({
              currentHighestBid: bid,
              bidHistory: [...state.bidHistory, bid],
              timeRemaining: newTimeRemaining,
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
                  current_highest_bid_id: newBid.id,
                  time_remaining: newTimeRemaining,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', auctionStateData.id);
            }
          }
        }
      )
      .subscribe();

    usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        async () => {
          const users = await loadUsersWithWonPlayers();
          set({ users });
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
    if (usersChannel) {
      supabase.removeChannel(usersChannel);
      usersChannel = null;
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
    const users = await loadUsersWithWonPlayers();

    const { data: playersData } = await supabase.from('players').select('*').order('created_at', { ascending: true });
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
      currentHighestBid: null,
      currentRound: 1,
      roundTotalPlayers: players.length,
      roundCurrentIndex: 1,
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
    if (isProcessingTransition) return;
    
    const state = get();
    const { data: auctionStateData } = await supabase
      .from('auction_state')
      .select('*')
      .limit(1)
      .single();

    if (!auctionStateData) return;

    if (state.status === 'countdown') {
      if (state.countdown > 1) {
        await supabase
          .from('auction_state')
          .update({
            countdown: state.countdown - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', auctionStateData.id);
      } else {
        await supabase
          .from('auction_state')
          .update({
            status: 'active',
            countdown: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', auctionStateData.id);
      }
      return;
    }

    if (state.status === 'active') {
      if (state.timeRemaining > 1) {
        await supabase
          .from('auction_state')
          .update({
            time_remaining: state.timeRemaining - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', auctionStateData.id);
      } else {
        isProcessingTransition = true;
        await endCurrentAuction(get, set);
        isProcessingTransition = false;
      }
      return;
    }

    if (state.status === 'result') {
      if (state.countdown > 1) {
        await supabase
          .from('auction_state')
          .update({
            countdown: state.countdown - 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', auctionStateData.id);
      } else {
        isProcessingTransition = true;
        await loadNextPlayer(get, set);
        isProcessingTransition = false;
      }
      return;
    }
  },

  reset: async () => {
    get().cleanupRealtime();

    await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data: usersData } = await supabase.from('users').select('*');
    if (usersData) {
      for (const user of usersData) {
        await supabase
          .from('users')
          .update({ balance: 10000 })
          .eq('id', user.id);
      }
    }

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
      currentRound: 1,
      roundTotalPlayers: 0,
      roundCurrentIndex: 0,
    });
  },
}));

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

      const updatedUsers = state.users.map((u: User) =>
        u.id === winner.userId ? { ...u, balance: newBalance, wonPlayers: [...u.wonPlayers, wonPlayer] } : u
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
  
  const soldPlayerIds = new Set(state.soldPlayers);
  const unsoldPlayerIds = new Set(state.unsoldrPlayers);
  
  let nextPlayer: Player | null = null;
  let nextIndex = -1;
  let isStartingReauction = false;

  const remainingPlayers = state.allPlayers.filter(
    (p: Player) => !soldPlayerIds.has(p.id)
  );

  if (remainingPlayers.length === 0) {
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
      resultMessage: 'Auction completed! All players auctioned.',
      status: 'finished',
    });
    return;
  }

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
        set({ unsoldrPlayers: updatedUnsoldPlayers });
        break;
      }
    }
  }

  if (!nextPlayer) {
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
      resultMessage: 'Auction completed! All players auctioned.',
      status: 'finished',
    });
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