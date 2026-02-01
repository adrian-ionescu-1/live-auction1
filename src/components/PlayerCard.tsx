// src/components/PlayerCard.tsx

'use client';

import { Player } from '@/types/auction.types';

interface PlayerCardProps {
  player: Player;
}

function getWinrateBackground(winrate: number): string {
  if (winrate < 50) {
    return 'bg-gradient-to-br from-gray-500 to-gray-700';
  } else if (winrate < 60) {
    return 'bg-gradient-to-br from-green-800 to-green-950';
  } else if (winrate < 70) {
    return 'bg-gradient-to-br from-blue-600 to-blue-800';
  } else {
    return 'bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800';
  }
}

function getWinrateGlow(winrate: number): string {
  if (winrate >= 70) {
    return 'shadow-[0_0_30px_rgba(168,85,247,0.6)]';
  } else if (winrate >= 60) {
    return 'shadow-[0_0_20px_rgba(37,99,235,0.4)]';
  }
  return 'shadow-2xl';
}

function getWinrateLabel(winrate: number): { text: string; color: string } {
  if (winrate < 50) {
    return { text: 'BELOW AVG', color: 'text-gray-300' };
  } else if (winrate < 60) {
    return { text: 'GOOD', color: 'text-green-300' };
  } else if (winrate < 70) {
    return { text: 'GREAT', color: 'text-blue-300' };
  } else {
    return { text: 'ELITE', color: 'text-purple-300' };
  }
}

function getWinrateTextColor(winrate: number): string {
  if (winrate < 50) {
    return 'text-gray-400';
  } else if (winrate < 60) {
    return 'text-green-400';
  } else if (winrate < 70) {
    return 'text-blue-400';
  } else {
    return 'text-purple-400';
  }
}

function getWn8TextColor(wn8: number): string {
  if (wn8 < 1250) {
    return 'text-gray-400';
  } else if (wn8 < 2000) {
    return 'text-green-400';
  } else if (wn8 < 3000) {
    return 'text-blue-400';
  } else {
    return 'text-purple-400';
  }
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const bgClass = getWinrateBackground(player.winrate);
  const glowClass = getWinrateGlow(player.winrate);
  const wrLabel = getWinrateLabel(player.winrate);
  const wrTextColor = getWinrateTextColor(player.winrate);
  const wn8TextColor = getWn8TextColor(player.wn8_30d);

  return (
    <div className={`relative rounded-2xl overflow-hidden max-w-md w-full ${glowClass}`}>
      <div className={`relative h-80 ${bgClass} flex items-center justify-center`}>
        <svg
          viewBox="0 0 200 120"
          className="w-64 h-40 opacity-90"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="20" y="40" width="160" height="50" rx="8" fill="currentColor" className="text-gray-800" opacity="0.9" />
          <rect x="10" y="70" width="20" height="15" rx="3" fill="currentColor" className="text-gray-700" />
          <rect x="170" y="70" width="20" height="15" rx="3" fill="currentColor" className="text-gray-700" />
          <circle cx="30" cy="95" r="12" fill="currentColor" className="text-gray-900" />
          <circle cx="170" cy="95" r="12" fill="currentColor" className="text-gray-900" />
          <circle cx="30" cy="95" r="8" fill="currentColor" className="text-gray-600" />
          <circle cx="170" cy="95" r="8" fill="currentColor" className="text-gray-600" />
          <rect x="60" y="25" width="80" height="12" rx="6" fill="currentColor" className="text-gray-900" opacity="0.8" />
          <polygon points="140,37 180,50 180,60 140,47" fill="currentColor" className="text-gray-700" opacity="0.7" />
          <rect x="145" y="45" width="3" height="8" fill="currentColor" className="text-yellow-600" />
        </svg>

        <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-lg backdrop-blur-sm">
          <span className={`text-xs font-bold ${wrLabel.color}`}>{wrLabel.text}</span>
        </div>

        <div className="absolute top-4 right-4 bg-yellow-500 text-gray-900 font-black text-2xl px-4 py-2 rounded-full shadow-lg">
          {Math.round(player.winrate)}%
        </div>
      </div>

      <div className="bg-gray-900 p-6">
        <h2 className="text-3xl font-bold text-white mb-4 truncate">{player.name}</h2>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">WN8</p>
            <p className={`text-xl font-bold ${wn8TextColor}`}>{player.wn8_30d}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">WIN%</p>
            <p className={`text-xl font-bold ${wrTextColor}`}>{player.winrate.toFixed(1)}%</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">DMG</p>
            <p className="text-xl font-bold text-red-400">{player.avg_damage}</p>
          </div>
        </div>

        <div className="flex justify-between items-center bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-lg p-4">
          <span className="text-sm font-bold text-yellow-900 uppercase">Starting Bid</span>
          <span className="text-2xl font-black text-yellow-950">${player.basePrice}</span>
        </div>
      </div>
    </div>
  );
}