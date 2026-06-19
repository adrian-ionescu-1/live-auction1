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
    <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
      <h3 className="text-base font-extrabold tracking-wide text-zinc-100 mb-4">
        Recent Bids
      </h3>

      <div className="space-y-2">
        {recentBids.map((bid, index) => {
          const isLatest = index === 0;

          return (
            <div
              key={`${bid.userId}-${bid.timestamp}`}
              className={`flex justify-between items-center p-3 rounded-2xl ring-1 transition
                ${
                  isLatest
                    ? 'bg-emerald-500/12 ring-emerald-400/25 shadow-[0_0_25px_rgba(16,185,129,0.15)] animate-fade-up'
                    : 'bg-black/30 ring-white/10'
                }`}
            >
              <div className="flex items-center gap-2.5">
                {isLatest && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      isLatest ? 'text-emerald-200' : 'text-zinc-200'
                    }`}
                  >
                    {bid.username}
                  </p>

                  <p className="text-xs text-zinc-400 tabular-nums">
                    {new Date(bid.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <p
                key={bid.amount}
                className={`text-xl font-extrabold tabular-nums ${
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
