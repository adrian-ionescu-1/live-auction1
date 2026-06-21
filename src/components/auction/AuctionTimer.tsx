'use client';

// The live phase timer (countdown / time-remaining / paused / result), pulled
// out of AuctionBoard so it can sit in the right column above the bid panel —
// keeping the player card itself higher and more visible on the page. Pure
// listener: it only reads the store.

import { useAuctionStore } from '@/store/auctionStore';

export default function AuctionTimer() {
  const {
    status,
    currentPlayer,
    countdown,
    timeRemaining,
    currentUserRole,
    resultMessage,
  } = useAuctionStore();

  // Nothing to time before a player is on the block or once it's all over.
  if (!currentPlayer || status === 'idle' || status === 'finished') return null;

  return (
    <div className="w-full max-w-md animate-fade-up">
      {status === 'countdown' && countdown > 0 && (
        <div className="rounded-3xl p-6 text-center ring-1 ring-white/10 sm:p-8 bg-amber-500/15">
          <p className="text-sm font-semibold text-amber-200 mb-2">Auction Starting In</p>
          <p className="text-6xl font-extrabold text-zinc-100 tabular-nums sm:text-7xl">
            {countdown}
          </p>
        </div>
      )}

      {status === 'active' && (
        <div
          className={`rounded-3xl p-6 text-center ring-1 ring-white/10 sm:p-8 transition ${
            timeRemaining <= 10
              ? 'bg-red-500/18 animate-pulse'
              : timeRemaining <= 15
              ? 'bg-orange-500/16'
              : 'bg-emerald-500/14'
          }`}
        >
          <p className="text-sm font-semibold text-zinc-200 mb-2">Time Remaining</p>
          <p className="text-6xl font-extrabold text-zinc-100 tabular-nums sm:text-7xl">
            {timeRemaining}s
          </p>
        </div>
      )}

      {status === 'paused' && (
        <div className="rounded-3xl p-6 text-center ring-1 ring-white/10 sm:p-8 bg-amber-500/15">
          <p className="text-sm font-semibold text-amber-200 mb-2">Auction Paused</p>
          <p className="text-3xl font-extrabold text-zinc-100">⏸</p>
        </div>
      )}

      {status === 'result' && currentUserRole !== 'ADMIN' && (
        <div className="rounded-3xl p-6 text-center ring-1 ring-white/10 sm:p-8 bg-cyan-500/12">
          <p className="text-sm font-semibold text-cyan-200 mb-2">Result</p>
          <p className="text-base text-zinc-100">{resultMessage}</p>
        </div>
      )}
    </div>
  );
}
