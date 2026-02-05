'use client';

import { useAuctionStore } from '@/store/auctionStore';
import TargetProgress from '@/components/TargetProgress';
import { TARGET_PLAYERS, calcReserve } from '@/config/auctionRules';

export default function UserBalance() {
  const { currentUserId, users, logout } = useAuctionStore();
  const currentUser = users.find((u) => u.id === currentUserId);

  if (!currentUser) return null;

  const wonCount = currentUser.wonPlayers?.length ?? 0;
  const remainingSlots = Math.max(0, TARGET_PLAYERS - wonCount);
  const reserved = calcReserve(remainingSlots);
  const spendable = Math.max(0, currentUser.balance - reserved);

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between max-w-md w-full">
      <div className="min-w-0">
        <p className="text-sm text-gray-600">Logged in as</p>
        <p className="text-xl font-bold text-gray-900 truncate">{currentUser.username}</p>

        {currentUser.role === 'ADMIN' && (
          <span className="bg-yellow-400 text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
            ADMIN
          </span>
        )}

        {currentUser.role === 'USER' && (
          <TargetProgress wonCount={wonCount} />
        )}
      </div>

      <div className="text-right ml-4">
        <p className="text-sm text-gray-600">Balance</p>
        <p className={`text-2xl font-bold ${currentUser.balance === 0 ? 'text-red-600' : 'text-green-600'}`}>
          ${currentUser.balance.toLocaleString()}
        </p>

        {currentUser.role === 'USER' && (
          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
            <div>Reserved: <span className="font-bold">${reserved.toLocaleString()}</span></div>
            <div>Spendable: <span className="font-bold">${spendable.toLocaleString()}</span></div>
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="ml-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition"
      >
        Logout
      </button>
    </div>
  );
}
