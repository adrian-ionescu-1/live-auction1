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
    // Determine what message to show when there is no active player.
    // 'finished' → auction ended, waiting for admin to reset.
    // 'idle'     → not started yet (or just reset).
    // anything else → transient loading state.
    let message: string;
    let sub: string | null = null;

    if (status === 'finished') {
      message = 'Auction finished';
      sub = currentUserRole === 'ADMIN'
        ? 'Use Reset Auction to start a new one'
        : 'Waiting for the admin to start a new auction…';
    } else if (status === 'idle') {
      message = 'Waiting for auction to start...';
      sub = 'Admin will start the auction soon';
    } else {
      message = 'Loading...';
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-700 mb-4">{message}</h2>
          {sub && <p className="text-gray-500">{sub}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-md">
        {status === 'countdown' && countdown > 0 && (
          <div className="bg-yellow-400 text-gray-900 rounded-xl p-8 text-center shadow-lg">
            <p className="text-lg font-semibold mb-2">Auction Starting In</p>
            <p className="text-7xl font-bold">{countdown}</p>
          </div>
        )}

        {status === 'active' && (
          <div
            className={`rounded-xl p-8 text-center shadow-lg ${
              timeRemaining <= 10
                ? 'bg-red-500 text-white animate-pulse'
                : timeRemaining <= 15
                ? 'bg-orange-500 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            <p className="text-lg font-semibold mb-2">Time Remaining</p>
            <p className="text-7xl font-bold">{timeRemaining}s</p>
          </div>
        )}

        {status === 'paused' && (
          <div className="bg-yellow-500 text-white rounded-xl p-8 text-center shadow-lg">
            <p className="text-lg font-semibold mb-2">Auction Paused</p>
            <p className="text-3xl font-bold">⏸</p>
          </div>
        )}

        {status === 'result' && currentUserRole !== 'ADMIN' && (
          <div className="bg-blue-500 text-white rounded-xl p-8 text-center shadow-lg">
            <p className="text-lg font-semibold mb-2">Result</p>
            <p className="text-xl">{useAuctionStore.getState().resultMessage}</p>
          </div>
        )}
      </div>

      <PlayerCard player={currentPlayer} />

      <div className="w-full max-w-md bg-white rounded-lg p-4 shadow">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{currentRound === 1 ? 'Initial Auction' : `Re-auction Round ${currentRound - 1}`}</span>
          <span>
            Player {roundCurrentIndex} of {roundTotalPlayers}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${(roundCurrentIndex / roundTotalPlayers) * 100}%`,
            }}
          ></div>
        </div>
        {currentRound > 1 && <p className="text-xs text-gray-500 mt-2 text-center">Auctioning unsold players</p>}
      </div>
    </div>
  );
}