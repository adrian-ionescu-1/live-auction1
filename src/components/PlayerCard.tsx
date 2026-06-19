'use client';

import { Player } from '@/types/auction.types';

interface PlayerCardProps {
  player: Player;
}

function getWinrateBackground(winrate: number): string {
  if (winrate < 50) {
    return 'bg-gradient-to-br from-zinc-700/70 to-zinc-950';
  } else if (winrate < 60) {
    return 'bg-gradient-to-br from-emerald-700/40 to-emerald-950';
  } else if (winrate < 70) {
    return 'bg-gradient-to-br from-cyan-600/35 to-cyan-950';
  } else {
    return 'bg-gradient-to-br from-fuchsia-600/35 via-fuchsia-800/30 to-zinc-950';
  }
}

function getWinrateGlow(winrate: number): string {
  if (winrate >= 70) {
    return 'shadow-[0_0_40px_rgba(236,72,153,0.22)]';
  } else if (winrate >= 60) {
    return 'shadow-[0_0_30px_rgba(34,211,238,0.18)]';
  } else if (winrate >= 50) {
    return 'shadow-[0_0_26px_rgba(16,185,129,0.16)]';
  }
  return 'shadow-[0_0_24px_rgba(0,0,0,0.45)]';
}

function getWinrateLabel(winrate: number): { text: string; color: string } {
  if (winrate < 50) {
    return { text: 'BELOW AVG', color: 'text-zinc-300' };
  } else if (winrate < 60) {
    return { text: 'GOOD', color: 'text-emerald-200' };
  } else if (winrate < 70) {
    return { text: 'GREAT', color: 'text-cyan-200' };
  } else {
    return { text: 'ELITE', color: 'text-fuchsia-200' };
  }
}

function getWinrateTextColor(winrate: number): string {
  if (winrate < 50) return 'text-zinc-300';
  if (winrate < 60) return 'text-emerald-200';
  if (winrate < 70) return 'text-cyan-200';
  return 'text-fuchsia-200';
}

function getWn8TextColor(wn8: number): string {
  if (wn8 < 1250) return 'text-zinc-300';
  if (wn8 < 2000) return 'text-emerald-200';
  if (wn8 < 3000) return 'text-cyan-200';
  return 'text-fuchsia-200';
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const bgClass = getWinrateBackground(player.winrate);
  const glowClass = getWinrateGlow(player.winrate);
  const wrLabel = getWinrateLabel(player.winrate);
  const wrTextColor = getWinrateTextColor(player.winrate);
  const wn8TextColor = getWn8TextColor(player.wn8_30d);

  return (
    <div
      className={`group relative w-full max-w-md animate-fade-up overflow-hidden rounded-3xl ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 ${glowClass}`}
    >
      {/* Top / Visual */}
      <div className={`relative h-72 sm:h-80 ${bgClass} flex items-center justify-center`}>
        {/* dark vignette for readability */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#00000000_0%,#00000080_70%,#000000cc_100%)]" />

        {/* Shine sweep on hover */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition duration-700 group-hover:translate-x-full" />

        {/* Military Olive Tank */}
        <svg
          viewBox="0 0 200 120"
          className="relative h-40 w-64 animate-float drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Hull */}
          <rect
            x="20"
            y="40"
            width="160"
            height="50"
            rx="10"
            fill="#4b5320"
          />
          <rect
            x="20"
            y="40"
            width="160"
            height="50"
            rx="10"
            stroke="#6b7425"
            strokeWidth="2"
          />

          {/* Side blocks */}
          <rect x="10" y="70" width="20" height="15" rx="4" fill="#3f4618" />
          <rect x="170" y="70" width="20" height="15" rx="4" fill="#3f4618" />

          {/* Wheels */}
          <circle cx="30" cy="95" r="12" fill="#2f3412" />
          <circle cx="170" cy="95" r="12" fill="#2f3412" />
          <circle cx="30" cy="95" r="7.5" fill="#6b7425" />
          <circle cx="170" cy="95" r="7.5" fill="#6b7425" />

          {/* Turret */}
          <rect x="60" y="25" width="80" height="12" rx="6" fill="#4b5320" />
          <rect
            x="60"
            y="25"
            width="80"
            height="12"
            rx="6"
            stroke="#6b7425"
            strokeWidth="2"
          />

          {/* Barrel */}
          <polygon
            points="140,37 180,50 180,60 140,47"
            fill="#3f4618"
          />

          {/* Small metallic detail */}
          <rect
            x="146"
            y="46"
            width="4"
            height="10"
            rx="2"
            fill="#fbbf24"
          />
        </svg>

        {/* Label */}
        <div className="absolute top-4 left-4 rounded-xl bg-black/35 ring-1 ring-white/10 px-3 py-1 backdrop-blur-sm">
          <span className={`text-[11px] font-extrabold tracking-wide ${wrLabel.color}`}>
            {wrLabel.text}
          </span>
        </div>

        {/* Winrate bubble */}
        <div className="absolute top-4 right-4 rounded-full bg-amber-500/20 ring-1 ring-amber-400/25 text-amber-200 font-black text-2xl px-4 py-2 shadow-lg backdrop-blur-sm">
          {Math.round(player.winrate)}%
        </div>
      </div>

      {/* Bottom / Stats */}
      <div className="bg-black/35 backdrop-blur-sm p-6">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 mb-4 truncate">
          {player.name}
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl p-3 text-center bg-white/5 ring-1 ring-white/10">
            <p className="text-[11px] text-zinc-500 mb-1">WN8</p>
            <p className={`text-xl font-extrabold ${wn8TextColor} tabular-nums`}>
              {player.wn8_30d}
            </p>
          </div>

          <div className="rounded-2xl p-3 text-center bg-white/5 ring-1 ring-white/10">
            <p className="text-[11px] text-zinc-500 mb-1">WIN%</p>
            <p className={`text-xl font-extrabold ${wrTextColor} tabular-nums`}>
              {player.winrate.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-2xl p-3 text-center bg-white/5 ring-1 ring-white/10">
            <p className="text-[11px] text-zinc-500 mb-1">DMG</p>
            <p className="text-xl font-extrabold text-red-200 tabular-nums">
              {player.avg_damage}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center rounded-2xl p-4 bg-gradient-to-r from-amber-500/20 to-amber-400/15 ring-1 ring-amber-400/20">
          <span className="text-sm font-extrabold text-amber-200 uppercase tracking-wide">
            Starting Bid
          </span>
          <span className="text-2xl font-black text-zinc-100 tabular-nums">
            ${player.basePrice}
          </span>
        </div>
      </div>
    </div>
  );
}
