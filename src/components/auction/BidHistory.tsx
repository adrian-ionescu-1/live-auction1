'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function BidHistory() {
  const { bidHistory } = useAuctionStore();

  if (bidHistory.length === 0) {
    return null;
  }

  // Show only last 5 bids
  const recentBids = bidHistory.slice(-5).reverse();

  return (
    <div className="w-full max-w-md animate-fade-up overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm lg:max-w-none">
      {/* Header */}
      <div className="relative border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-fuchsia-500/5 to-transparent px-4 py-3 sm:px-5">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex items-center gap-2">
          <span aria-hidden>📡</span>
          <h3 className="text-sm font-extrabold tracking-wide text-zinc-100">
            Live bids
          </h3>
        </div>
      </div>

      <div className="space-y-2 p-3 sm:p-4">
        {recentBids.map((bid, index) => {
          const isLatest = index === 0;

          return (
            <div
              key={`${bid.userId}-${bid.timestamp}`}
              className={`flex items-center justify-between gap-2 rounded-2xl p-2.5 ring-1 transition sm:p-3 ${
                isLatest
                  ? 'bg-emerald-500/12 ring-emerald-400/25 shadow-[0_0_25px_rgba(16,185,129,0.15)] animate-fade-up'
                  : 'bg-black/30 ring-white/10'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {isLatest && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                )}
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-semibold ${
                      isLatest ? 'text-emerald-200' : 'text-zinc-200'
                    }`}
                  >
                    {bid.username}
                  </p>
                  <p className="text-[11px] tabular-nums text-zinc-500">
                    {new Date(bid.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <p
                key={bid.amount}
                className={`shrink-0 text-lg font-extrabold tabular-nums sm:text-xl ${
                  isLatest ? 'text-emerald-300 animate-pop' : 'text-zinc-300'
                }`}
              >
                ${bid.amount.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
