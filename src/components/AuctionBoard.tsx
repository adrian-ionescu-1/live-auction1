// src/components/AuctionBoard.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';
import PlayerCard from './PlayerCard';

export default function AuctionBoard() {
  const { status, currentPlayer, countdown, timeRemaining } = useAuctionStore();

  if (!currentPlayer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-700 mb-4">
            {status === 'idle' ? 'Waiting for auction to start...' : 'Loading...'}
          </h2>
          {status === 'idle' && (
            <p className="text-gray-500">Admin will start the auction soon</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Countdown or Timer */}
      <div className="w-full max-w-md">
        {status === 'countdown' && countdown > 0 && (
          <div className="bg-yellow-400 text-gray-900 rounded-xl p-8 text-center shadow-lg">
            <p className="text-lg font-semibold mb-2">Auction Starting In</p>
            <p className="text-7xl font-bold">{countdown}</p>
          </div>
        )}

        {status === 'active' && (
          <div className={`rounded-xl p-8 text-center shadow-lg ${
            timeRemaining <= 10
              ? 'bg-red-500 text-white animate-pulse'
              : timeRemaining <= 15
              ? 'bg-orange-500 text-white'
              : 'bg-green-500 text-white'
          }`}>
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
      </div>

      {/* Player Card */}
      <PlayerCard player={currentPlayer} />

      {/* Player Progress */}
      <div className="w-full max-w-md bg-white rounded-lg p-4 shadow">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Auction Progress</span>
          <span>Player {useAuctionStore.getState().currentPlayerIndex + 1} of {useAuctionStore.getState().allPlayers.length}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${
                ((useAuctionStore.getState().currentPlayerIndex + 1) /
                  useAuctionStore.getState().allPlayers.length) *
                100
              }%`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}