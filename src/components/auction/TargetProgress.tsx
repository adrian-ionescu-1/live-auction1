'use client';

import { DEFAULT_TARGET_PLAYERS } from '@/config/auctionRules';

export default function TargetProgress({
  wonCount,
  target = DEFAULT_TARGET_PLAYERS,
}: {
  wonCount: number;
  target?: number;
}) {
  const safeTarget = target > 0 ? target : DEFAULT_TARGET_PLAYERS;
  const clamped = Math.min(Math.max(wonCount, 0), safeTarget);
  const pct = (clamped / safeTarget) * 100;

  const completed = clamped >= safeTarget;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-400">Target</span>
        <span
          className={`font-extrabold ${
            completed ? 'text-emerald-200' : 'text-zinc-200'
          }`}
        >
          {clamped}/{safeTarget}
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden mt-1 bg-white/5 ring-1 ring-white/10">
        <div
          className={`h-full transition-all ${
            completed
              ? 'bg-gradient-to-r from-emerald-400/70 to-emerald-500/60'
              : 'bg-gradient-to-r from-emerald-400/55 via-cyan-400/55 to-fuchsia-400/45'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
