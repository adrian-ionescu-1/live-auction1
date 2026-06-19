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
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-scale-in rounded-3xl bg-black/35 p-6 text-center ring-1 ring-white/10 backdrop-blur-sm sm:p-8">
        <div className="mb-4">
          <h2 className="animate-pop bg-gradient-to-r from-emerald-300 via-emerald-200 to-cyan-300 bg-clip-text text-4xl font-extrabold text-transparent drop-shadow-[0_0_25px_rgba(16,185,129,0.35)] sm:text-5xl">
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
