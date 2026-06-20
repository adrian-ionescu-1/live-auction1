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
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-4xl animate-scale-in overflow-y-auto rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm">

        {/* close button — top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full
                     bg-white/5 ring-1 ring-white/10 text-zinc-300 hover:text-zinc-100
                     hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-label="Close"
        >
          ❌
        </button>

        <div className="p-6 sm:p-10">
          {/* header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-100 mb-2">
              🎉 Auction Complete! 🎉
            </h1>
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-300">
              Everyone reached their target. Any leftover players were handed out randomly
              (free, one per member per round) per the auction rules. This event is now closed.
            </p>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100 mb-6 text-center">
            Final Results
          </h2>

          {/* user cards grid — identical content as before */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {regularUsers
              .sort((a, b) => {
                const aSpent = a.wonPlayers.reduce((sum, p) => sum + p.amount, 0);
                const bSpent = b.wonPlayers.reduce((sum, p) => sum + p.amount, 0);
                return bSpent - aSpent;
              })
              .map((user, index) => {
                const wonPlayers = user.wonPlayers || [];
                const totalSpent = wonPlayers.reduce((sum, p) => sum + p.amount, 0);

                const podiumGlow =
                  index === 0
                    ? 'shadow-[0_0_60px_rgba(16,185,129,0.14)]'
                    : index === 1
                    ? 'shadow-[0_0_60px_rgba(34,211,238,0.12)]'
                    : index === 2
                    ? 'shadow-[0_0_60px_rgba(236,72,153,0.10)]'
                    : '';

                return (
                  <div
                    key={user.id}
                    style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
                    className={`group relative animate-fade-up rounded-3xl p-6 transition
                      bg-white/5 ring-1 ring-white/10 hover:-translate-y-1 hover:bg-white/10 ${podiumGlow}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {index === 0 && <span className="text-3xl">🥇</span>}
                        {index === 1 && <span className="text-3xl">🥈</span>}
                        {index === 2 && <span className="text-3xl">🥉</span>}
                        <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-100 truncate">
                          {user.username}
                        </h3>
                      </div>

                      <span className="shrink-0 rounded-full bg-black/30 ring-1 ring-white/10 px-3 py-1 text-[11px] text-zinc-300">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Players Won:</span>
                        <span className="text-xl font-extrabold text-zinc-100 tabular-nums">
                          {wonPlayers.length}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Total Spent:</span>
                        <span className="text-xl font-extrabold text-red-200 tabular-nums">
                          ${totalSpent.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Remaining:</span>
                        <span className="text-xl font-extrabold text-emerald-200 tabular-nums">
                          ${user.balance.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {wonPlayers.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm font-semibold text-zinc-300 mb-2">
                          Squad:
                        </p>

                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {wonPlayers.map((p, i) => (
                            <p key={i} className="text-sm text-zinc-300">
                              • {p.playerName}{' '}
                              <span className="text-zinc-500 tabular-nums">
                                (${p.amount})
                              </span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* return to dashboard */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={onClose}
              className="rounded-2xl bg-emerald-500/20 px-6 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              ← Back to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
