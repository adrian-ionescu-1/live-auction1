// src/components/AdminUserCards.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function AdminUserCards() {
  const { currentUserRole, users } = useAuctionStore();

  if (currentUserRole !== 'ADMIN') {
    return null;
  }

  const regularUsers = users.filter((u) => u.role === 'USER');

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 w-full">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">User Squad Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {regularUsers.map((user) => {
          const wonPlayers = user.wonPlayers || [];
          const totalSpent = wonPlayers.reduce((sum, p) => sum + (p?.amount || 0), 0);

          return (
            <div key={user.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition">
              <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-100">
                <h4 className="text-xl font-bold text-blue-700">{user.username}</h4>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Balance</p>
                  <p className="text-lg font-bold text-green-600">${(user.balance || 0).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Players Won ({wonPlayers.length})</p>
                {wonPlayers.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {wonPlayers.map((playerWon, index) => (
                      <div key={`${playerWon?.playerId || index}-${index}`} className="bg-blue-50 rounded-lg p-2 text-sm">
                        <p className="font-semibold text-gray-800">{playerWon?.playerName || 'Unknown Player'}</p>
                        <p className="text-xs text-gray-600">
                          Bought for: <span className="font-bold text-green-600">${(playerWon?.amount || 0).toLocaleString()}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No players yet</p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t-2 border-gray-100">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-lg font-bold text-red-600">${totalSpent.toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}