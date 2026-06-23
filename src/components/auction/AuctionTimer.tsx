'use client';

// The live phase timer (countdown / time-remaining / paused / result), pulled
// out of AuctionBoard so it can sit in the right column above the bid panel —
// keeping the player card itself higher and more visible on the page. Pure
// listener: it only reads the store.
//
// One stable card wrapper is rendered for every phase (fixed min-height, no
// per-phase remount), so the timer never collapses or "reloads" between players
// — only its inner content swaps.

import { useAuctionStore } from '@/store/auctionStore';

export default function AuctionTimer() {
  const {
    status,
    currentPlayer,
    countdown,
    timeRemaining,
    resultMessage,
  } = useAuctionStore();

  // Nothing to time before a player is on the block or once it's all over.
  if (!currentPlayer || status === 'idle' || status === 'finished') return null;

  // Never let the number go negative while we wait for the next phase to land.
  const cd = Math.max(0, countdown);
  const tr = Math.max(0, timeRemaining);

  let inner: React.ReactNode = null;
  let surface = 'bg-amber-500/15';

  if (status === 'countdown') {
    surface = 'bg-amber-500/15';
    inner = (
      <>
        <p className="mb-2 text-sm font-semibold text-amber-200">Auction Starting In</p>
        <p className="text-6xl font-extrabold tabular-nums text-zinc-100 sm:text-7xl">{cd}</p>
      </>
    );
  } else if (status === 'active') {
    surface =
      tr <= 10 ? 'bg-red-500/18 animate-pulse' : tr <= 15 ? 'bg-orange-500/16' : 'bg-emerald-500/14';
    inner = (
      <>
        <p className="mb-2 text-sm font-semibold text-zinc-200">Time Remaining</p>
        <p className="text-6xl font-extrabold tabular-nums text-zinc-100 sm:text-7xl">{tr}s</p>
      </>
    );
  } else if (status === 'paused') {
    surface = 'bg-amber-500/15';
    inner = (
      <>
        <p className="mb-2 text-sm font-semibold text-amber-200">Auction Paused</p>
        <p className="text-3xl font-extrabold text-zinc-100">⏸</p>
      </>
    );
  } else if (status === 'result') {
    // The full-screen ResultBanner shows the SOLD/UNSOLD verdict on top; this
    // keeps the timer slot occupied (for every role) so it doesn't blink out.
    surface = 'bg-cyan-500/12';
    inner = (
      <>
        <p className="mb-2 text-sm font-semibold text-cyan-200">Next player in</p>
        <p className="text-6xl font-extrabold tabular-nums text-zinc-100 sm:text-7xl">{cd}</p>
        {resultMessage && (
          <p className="mt-2 truncate text-xs text-zinc-400">{resultMessage}</p>
        )}
      </>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div
        className={`flex min-h-[168px] flex-col items-center justify-center rounded-3xl p-6 text-center ring-1 ring-white/10 transition-colors sm:min-h-[188px] sm:p-8 ${surface}`}
      >
        {inner}
      </div>
    </div>
  );
}
