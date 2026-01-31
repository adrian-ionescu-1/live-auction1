// src/components/ResultsView.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

interface ResultsViewProps {
  onClose: () => void;
}

export default function ResultsView({ onClose }: ResultsViewProps) {
  const { users } = useAuctionStore();

  const regularUsers = users.filter((u) => u.role === 'USER');

  return (
    /* fixed overlay — same z / backdrop pattern used by ResultBanner & ConfirmDialog */
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">

        {/* ❌ close button — top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 text-xl font-bold transition z-10"
          aria-label="Close"
        >
          ❌
        </button>

        <div className="p-8">
          {/* header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">🎉 Auction Complete! 🎉</h1>
            <p className="text-xl text-gray-600">All players have been auctioned</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Final Results</h2>

          {/* user cards grid — identical content as before */}
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

          {/* bottom hint */}
          <p className="text-center text-gray-500 mt-8 text-sm">
            Waiting for the admin to start a new auction…
          </p>
        </div>
      </div>
    </div>
  );
}