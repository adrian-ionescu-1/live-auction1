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

  const zeroBalance = currentUser.balance === 0;

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 max-w-md w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">Logged in as</p>
          <p className="text-lg font-extrabold text-zinc-100 truncate">
            {currentUser.username}
          </p>

          {currentUser.role === 'ADMIN' && (
            <span className="mt-2 inline-flex items-center rounded-full bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25 px-2.5 py-1 text-[11px] font-bold">
              ADMIN
            </span>
          )}

          {currentUser.role === 'USER' && <TargetProgress wonCount={wonCount} />}
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-zinc-400">Balance</p>
          <p
            className={`text-2xl font-extrabold tabular-nums ${
              zeroBalance ? 'text-red-200' : 'text-emerald-200'
            }`}
          >
            ${currentUser.balance.toLocaleString()}
          </p>

          {currentUser.role === 'USER' && (
            <div className="mt-1 text-xs text-zinc-400 space-y-0.5">
              <div>
                Reserved:{' '}
                <span className="font-semibold text-zinc-200 tabular-nums">
                  ${reserved.toLocaleString()}
                </span>
              </div>
              <div>
                Spendable:{' '}
                <span className="font-semibold text-zinc-200 tabular-nums">
                  ${spendable.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-zinc-300 hover:text-zinc-100
                     font-semibold py-2 px-4 transition active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
