// src/components/ResultsView.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function ResultsView() {
  const { users, currentUserRole } = useAuctionStore();

  const regularUsers = users.filter((u) => u.role === 'USER');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">🎉 Auction Complete! 🎉</h1>
          <p className="text-2xl text-gray-600">All players have been auctioned</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Final Results</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularUsers
              .sort((a, b) => {
                const aSpent = a.wonPlayers.reduce((sum, p) => sum + p.amount, 0);
                const bSpent = b.wonPlayers.reduce((sum, p) => sum + p.amount, 0);
                return bSpent - aSpent;
              })
              .map((user, index) => {
                const wonPlayers = user.wonPlayers || [];
                const totalSpent = wonPlayers.reduce((sum, p) => sum + p.amount, 0);

                return (
                  <div key={user.id} className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {index === 0 && <span className="text-3xl">🥇</span>}
                        {index === 1 && <span className="text-3xl">🥈</span>}
                        {index === 2 && <span className="text-3xl">🥉</span>}
                        <h3 className="text-2xl font-bold text-blue-700">{user.username}</h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Players Won:</span>
                        <span className="text-xl font-bold text-gray-900">{wonPlayers.length}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Spent:</span>
                        <span className="text-xl font-bold text-red-600">${totalSpent.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="text-xl font-bold text-green-600">${user.balance.toLocaleString()}</span>
                      </div>
                    </div>

                    {wonPlayers.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-100">
                        <p className="text-sm font-semibold text-gray-600 mb-2">Squad:</p>
                        <div className="space-y-1">
                          {wonPlayers.map((p, i) => (
                            <p key={i} className="text-sm text-gray-700">
                              • {p.playerName} <span className="text-gray-500">(${p.amount})</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {currentUserRole === 'ADMIN' && (
            <div className="mt-12 text-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg transition shadow-lg text-lg"
              >
                Start New Auction
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}