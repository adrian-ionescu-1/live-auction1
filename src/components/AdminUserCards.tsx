// src/components/AdminUserCards.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';
import TargetProgress from '@/components/TargetProgress';
import { TARGET_PLAYERS, calcReserve } from '@/config/auctionRules';

export default function AdminUserCards() {
  const { currentUserRole, users } = useAuctionStore();

  if (currentUserRole !== 'ADMIN') {
    return null;
  }

  const regularUsers = users.filter((u) => u.role === 'USER');

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 w-full">
      <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mb-6">
        User Squad Overview
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {regularUsers.map((user) => {
          const wonPlayers = user.wonPlayers || [];
          const wonCount = wonPlayers.length;

          const totalSpent = wonPlayers.reduce((sum, p) => sum + (p?.amount || 0), 0);

          const remainingSlots = Math.max(0, TARGET_PLAYERS - wonCount);
          const reserved = calcReserve(remainingSlots);
          const balance = user.balance || 0;
          const spendable = Math.max(0, balance - reserved);

          const completed = wonCount >= TARGET_PLAYERS;

          return (
            <div
              key={user.id}
              className={`rounded-2xl p-4 transition ring-1 ${
                completed
                  ? 'bg-emerald-500/5 ring-emerald-400/25'
                  : 'bg-black/25 ring-white/10 hover:ring-white/20'
              }`}
            >
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-white/10 gap-3">
                <div className="min-w-0">
                  <h4 className="text-lg font-bold text-zinc-100 truncate">
                    {user.username}
                  </h4>

                  {completed && (
                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25">
                      Target completed
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-zinc-400">Balance</p>
                  <p className="text-lg font-extrabold text-emerald-200">
                    ${balance.toLocaleString()}
                  </p>

                  <div className="mt-1 text-xs text-zinc-400 space-y-0.5">
                    <div>
                      Reserved:{' '}
                      <span className="font-semibold text-zinc-200">
                        ${reserved.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      Spendable:{' '}
                      <span className="font-semibold text-zinc-200">
                        ${spendable.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target progress */}
              <TargetProgress wonCount={wonCount} />

              {/* Players won list */}
              <div className="mt-3">
                <p className="text-sm font-semibold text-zinc-300 mb-2">
                  Players Won ({wonPlayers.length})
                </p>

                {wonPlayers.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {wonPlayers.map((playerWon, index) => (
                      <div
                        key={`${playerWon?.playerId || index}-${index}`}
                        className="rounded-xl p-2 text-sm bg-white/5 ring-1 ring-white/10"
                      >
                        <p className="font-semibold text-zinc-100">
                          {playerWon?.playerName || 'Unknown Player'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          Bought for:{' '}
                          <span className="font-bold text-emerald-200">
                            ${(playerWon?.amount || 0).toLocaleString()}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No players yet</p>
                )}
              </div>

              {/* Total spent */}
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-zinc-400">Total Spent</p>
                  <p className="text-lg font-extrabold text-red-200">
                    ${totalSpent.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
