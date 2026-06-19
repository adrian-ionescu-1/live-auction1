// src/components/UserSelector.tsx

'use client';

import { useEffect, useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import { AuctionEngine } from '@/services/auctionEngine';
import { UserRole } from '@/types/auction.types';

export default function UserSelector() {
  const { users, currentUserId, login } = useAuctionStore();
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm p-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 mb-3">
            Loading...
          </h1>
          <p className="text-zinc-400">Fetching users from database</p>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm p-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-red-200 mb-3">
            Error
          </h1>
          <p className="text-zinc-400">No users found in database</p>
        </div>
      </div>
    );
  }

  const handleUserSelect = async (userId: string, role: UserRole) => {
    await login(userId, role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-up rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm p-6 sm:p-8">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 mb-2 text-center">
          Live{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
            Auction System
          </span>
        </h1>
        <p className="text-zinc-400 mb-8 text-center">
          Select your user to continue
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {users.map((user, idx) => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user.id, user.role)}
              style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
              className={`group animate-fade-up rounded-3xl p-6 ring-1 transition hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60
                ${
                  user.role === 'ADMIN'
                    ? 'bg-fuchsia-500/10 ring-fuchsia-400/20 hover:bg-fuchsia-500/15'
                    : 'bg-cyan-500/10 ring-cyan-400/20 hover:bg-cyan-500/15'
                }`}
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <h3 className="text-lg sm:text-xl font-extrabold text-zinc-100 truncate">
                  {user.username}
                </h3>

                {user.role === 'ADMIN' && (
                  <span className="shrink-0 rounded-full bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25 px-2 py-1 text-[11px] font-bold">
                    ADMIN
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-400">
                Balance:{' '}
                <span className="font-semibold text-zinc-200 tabular-nums">
                  ${user.balance.toLocaleString()}
                </span>
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
