'use client';

import { useEffect } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import PlayerCard from './PlayerCard';

export default function AuctionBoard() {
  const {
    status,
    currentPlayer,
    currentRound,
    roundTotalPlayers,
    roundCurrentIndex,
    currentUserRole,
    liveEvent,
    initializeRealtime,
    cleanupRealtime,
  } = useAuctionStore();

  useEffect(() => {
    initializeRealtime();

    // FIX F3: anti-drift heartbeat. Realtime can drop events under load (Free
    // tier), so periodically — and whenever the tab regains focus — re-read the
    // DB to repair stale balances / "won X of Y" / highest bid.
    const heartbeat = setInterval(() => {
      useAuctionStore.getState().reconcile();
    }, 5000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        useAuctionStore.getState().reconcile();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisible);
      cleanupRealtime();
    };
  }, [initializeRealtime, cleanupRealtime]);

  if (!currentPlayer) {
    let message: string;
    let sub: string | null = null;

    if (status === 'finished') {
      message = 'Auction finished';
      sub =
        currentUserRole === 'ADMIN'
          ? 'Use Reset Auction to start a new one'
          : 'Waiting for the admin to start a new auction…';
    } else if (status === 'idle') {
      message = 'Waiting for auction to start...';
      sub = 'Admin will start the auction soon';
    } else {
      message = 'Loading...';
    }

    return (
      <div className="flex min-h-[300px] items-center justify-center sm:min-h-[400px]">
        <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10 sm:p-8">
          <h2 className="mb-3 text-2xl font-extrabold text-zinc-100 sm:text-3xl">
            {message}
          </h2>
          {sub && <p className="text-sm text-zinc-400 sm:text-base">{sub}</p>}
        </div>
      </div>
    );
  }

  // The card's "Starting Bid" mirrors the live event's opening bid; only fall
  // back to the player's stored base price when the event doesn't set one.
  const startingBid =
    liveEvent && liveEvent.bidStart > 0 ? liveEvent.bidStart : currentPlayer.basePrice;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PlayerCard player={currentPlayer} startingBid={startingBid} />

      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 [animation-delay:120ms]">
        <div className="flex justify-between text-sm text-zinc-400 mb-2">
          <span>
            {currentRound === 1
              ? 'Initial Auction'
              : `Re-auction Round ${currentRound - 1}`}
          </span>
          <span className="text-zinc-300">
            Player {roundCurrentIndex} of {roundTotalPlayers}
          </span>
        </div>

        <div className="h-2 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10">
          <div
            className="h-full transition-all bg-gradient-to-r from-emerald-400/55 via-cyan-400/55 to-fuchsia-400/45"
            style={{ width: `${(roundCurrentIndex / roundTotalPlayers) * 100}%` }}
          />
        </div>

        {currentRound > 1 && (
          <p className="text-xs text-zinc-500 mt-2 text-center">
            Auctioning unsold players
          </p>
        )}
      </div>
    </div>
  );
}
