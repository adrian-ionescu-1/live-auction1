// src/components/ResultBanner.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function ResultBanner() {
  const { status, resultMessage, countdown } = useAuctionStore();

  if (status !== 'result') {
    return null;
  }

  const pct = ((3 - countdown) / 3) * 100;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl text-center rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm p-8 animate-pulse">
        <div className="mb-4">
          <h2 className="text-5xl font-extrabold text-emerald-300 mb-2">
            SOLD!
          </h2>
        </div>

        <p className="text-lg sm:text-2xl text-zinc-100 mb-6">
          {resultMessage}
        </p>

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
  );
}
