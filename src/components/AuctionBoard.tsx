// src/components/AuctionBoard.tsx

'use client';

import { useEffect } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import PlayerCard from './PlayerCard';

export default function AuctionBoard() {
  const {
    status,
    currentPlayer,
    countdown,
    timeRemaining,
    currentRound,
    roundTotalPlayers,
    roundCurrentIndex,
    currentUserRole,
    initializeRealtime,
    cleanupRealtime,
  } = useAuctionStore();

  useEffect(() => {
    initializeRealtime();
    return () => {
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

  const resultMessage = useAuctionStore.getState().resultMessage;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="w-full max-w-md animate-fade-up">
        {status === 'countdown' && countdown > 0 && (
          <div className="rounded-3xl p-8 text-center ring-1 ring-white/10 bg-amber-500/15">
            <p className="text-sm font-semibold text-amber-200 mb-2">
              Auction Starting In
            </p>
            <p className="text-7xl font-extrabold text-zinc-100 tabular-nums">
              {countdown}
            </p>
          </div>
        )}

        {status === 'active' && (
          <div
            className={`rounded-3xl p-8 text-center ring-1 ring-white/10 transition ${
              timeRemaining <= 10
                ? 'bg-red-500/18 animate-pulse'
                : timeRemaining <= 15
                ? 'bg-orange-500/16'
                : 'bg-emerald-500/14'
            }`}
          >
            <p className="text-sm font-semibold text-zinc-200 mb-2">
              Time Remaining
            </p>
            <p className="text-7xl font-extrabold text-zinc-100 tabular-nums">
              {timeRemaining}s
            </p>
          </div>
        )}

        {status === 'paused' && (
          <div className="rounded-3xl p-8 text-center ring-1 ring-white/10 bg-amber-500/15">
            <p className="text-sm font-semibold text-amber-200 mb-2">
              Auction Paused
            </p>
            <p className="text-3xl font-extrabold text-zinc-100">⏸</p>
          </div>
        )}

        {status === 'result' && currentUserRole !== 'ADMIN' && (
          <div className="rounded-3xl p-8 text-center ring-1 ring-white/10 bg-cyan-500/12">
            <p className="text-sm font-semibold text-cyan-200 mb-2">Result</p>
            <p className="text-base text-zinc-100">{resultMessage}</p>
          </div>
        )}
      </div>

      <PlayerCard player={currentPlayer} />

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
