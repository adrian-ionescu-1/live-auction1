// src/components/UserBalance.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function UserBalance() {
  const { currentUserId, users, logout } = useAuctionStore();

  const currentUser = users.find((u) => u.id === currentUserId);

  if (!currentUser) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between max-w-md w-full">
      <div>
        <p className="text-sm text-gray-600">Logged in as</p>
        <p className="text-xl font-bold text-gray-900">{currentUser.username}</p>
        {currentUser.role === 'ADMIN' && (
          <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
            ADMIN
          </span>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600">Balance</p>
        <p className={`text-2xl font-bold ${
          currentUser.balance === 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          ${currentUser.balance.toLocaleString()}
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="ml-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition"
      >
        Logout
      </button>
    </div>
  );
}