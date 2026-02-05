'use client';

import { TARGET_PLAYERS } from '@/config/auctionRules';

export default function TargetProgress({ wonCount }: { wonCount: number }) {
  const clamped = Math.min(Math.max(wonCount, 0), TARGET_PLAYERS);
  const pct = (clamped / TARGET_PLAYERS) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span className="font-semibold">Target</span>
        <span className={`font-bold ${clamped >= TARGET_PLAYERS ? 'text-green-700' : 'text-gray-700'}`}>
          {clamped}/{TARGET_PLAYERS}
        </span>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
        <div
          className="h-2 bg-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
