// src/components/UserSelector.tsx

'use client';

import { useEffect, useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import { AuctionEngine } from '@/services/auctionEngine';

export default function UserSelector() {
  const { users, currentUserId, selectUser } = useAuctionStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      if (users.length === 0) {
        const loadedUsers = await AuctionEngine.loadUsers();
        useAuctionStore.setState({ users: loadedUsers });
      }
      setLoading(false);
    };

    loadUsers();
  }, [users.length]);

  if (currentUserId) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Loading...</h1>
          <p className="text-gray-600">Fetching users from database</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">No users found in database</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
          Live Auction System
        </h1>
        <p className="text-gray-600 mb-8 text-center">Select your user to continue</p>

        <div className="grid grid-cols-2 gap-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => selectUser(user.id)}
              className={`p-6 rounded-xl border-2 transition hover:scale-105 ${
                user.isAdmin
                  ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 hover:border-purple-600'
                  : 'border-blue-300 bg-blue-50 hover:border-blue-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={`text-xl font-bold ${
                    user.isAdmin ? 'text-purple-700' : 'text-blue-700'
                  }`}
                >
                  {user.username}
                </h3>
                {user.isAdmin && (
                  <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                Balance: <span className="font-semibold">${user.balance.toLocaleString()}</span>
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}