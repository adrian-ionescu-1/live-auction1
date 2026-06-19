'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function ResultBanner() {
  const { status, currentPlayer, currentHighestBid, soldPlayers, resultMessage, countdown } =
    useAuctionStore();

  if (status !== 'result') {
    return null;
  }

  // Derive the outcome from server-truth state so it is correct on every client.
  const isSold = currentPlayer
    ? soldPlayers.includes(currentPlayer.id)
    : !!currentHighestBid;

  const pct = ((3 - countdown) / 3) * 100;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-scale-in">
      <div
        className={`relative rounded-3xl bg-[length:200%_200%] p-px animate-gradient-pan ${
          isSold
            ? "bg-gradient-to-br from-emerald-400/50 via-cyan-400/30 to-emerald-400/50 shadow-[0_0_90px_rgba(16,185,129,0.22)]"
            : "bg-gradient-to-br from-amber-400/50 via-orange-400/30 to-amber-400/50 shadow-[0_0_90px_rgba(251,191,36,0.18)]"
        }`}
      >
      <div className="relative overflow-hidden rounded-[23px] bg-black/60 p-6 text-center ring-1 ring-white/5 backdrop-blur-md sm:p-8">
        {/* Celebratory radial burst behind the verdict */}
        <span
          className={`pointer-events-none absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 rounded-full blur-2xl animate-glow-pulse ${
            isSold ? "bg-emerald-400/20" : "bg-amber-400/15"
          }`}
        />
        <div className="relative mb-4">
          {isSold ? (
            <h2 className="animate-pop bg-gradient-to-r from-emerald-300 via-emerald-200 to-cyan-300 bg-clip-text text-4xl font-extrabold text-transparent drop-shadow-[0_0_25px_rgba(16,185,129,0.35)] sm:text-5xl">
              SOLD!
            </h2>
          ) : (
            <h2 className="animate-pop bg-gradient-to-r from-amber-300 via-amber-200 to-orange-300 bg-clip-text text-4xl font-extrabold text-transparent drop-shadow-[0_0_25px_rgba(251,191,36,0.30)] sm:text-5xl">
              UNSOLD
            </h2>
          )}
        </div>

        {isSold && currentPlayer && currentHighestBid ? (
          <p className="mb-6 text-lg text-zinc-100 sm:text-2xl">
            <span className="font-extrabold">{currentPlayer.name}</span> goes to{' '}
            <span className="font-extrabold text-emerald-300">{currentHighestBid.username}</span>{' '}
            for{' '}
            <span className="font-extrabold tabular-nums text-emerald-300">
              ${currentHighestBid.amount.toLocaleString()}
            </span>
          </p>
        ) : !isSold && currentPlayer ? (
          <p className="mb-6 text-lg text-zinc-100 sm:text-2xl">
            <span className="font-extrabold">{currentPlayer.name}</span> received no bids —{' '}
            <span className="font-semibold text-amber-200">goes back to re-auction</span>
          </p>
        ) : (
          <p className="mb-6 text-lg text-zinc-100 sm:text-2xl">{resultMessage}</p>
        )}

        <div className="text-zinc-400">
          <p className="text-sm sm:text-lg">
            Next player in <span className="font-semibold text-zinc-200 tabular-nums">{countdown}</span> seconds...
          </p>

          <div className="mt-4 h-2 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10">
            <div
              className="h-full transition-all duration-1000 bg-gradient-to-r from-emerald-400/55 via-cyan-400/55 to-fuchsia-400/45"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
