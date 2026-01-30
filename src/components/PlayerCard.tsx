// src/components/PlayerCard.tsx

'use client';

import { Player } from '@/types/auction.types';

interface PlayerCardProps {
  player: Player;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
      {/* Player Image */}
      <div className="relative h-80 bg-gradient-to-br from-blue-500 to-purple-600">
        <img
          src={player.image}
          alt={player.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 font-bold text-xl px-4 py-2 rounded-full">
          {player.rating}
        </div>
      </div>

      {/* Player Info */}
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{player.name}</h2>
        <p className="text-lg text-gray-600 mb-4">{player.role}</p>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Base Price</span>
          <span className="text-xl font-bold text-green-600">
            ${player.basePrice.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}