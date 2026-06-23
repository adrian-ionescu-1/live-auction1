'use client';

import { useAuctionStore } from '@/store/auctionStore';
import Flag from '@/components/community/Flag';

interface ResultsViewProps {
  onClose: () => void;
}

export default function ResultsView({ onClose }: ResultsViewProps) {
  const { users, currentUserId } = useAuctionStore();

  // Each member only sees their own result — not the whole field's squads.
  const me = users.find((u) => u.id === currentUserId);
  const wonPlayers = me?.wonPlayers ?? [];
  const totalSpent = wonPlayers.reduce((sum, p) => sum + p.amount, 0);

  return (
    /* fixed overlay — same z / backdrop pattern used by ResultBanner & ConfirmDialog */
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm">

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
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 mb-2">
              🎉 Auction Complete! 🎉
            </h1>
            <p className="mx-auto max-w-md text-sm sm:text-base text-zinc-300">
              The event is closed. Here&apos;s the squad you walked away with.
            </p>
          </div>

          {/* the current member's personal card */}
          {me ? (
            <div className="animate-fade-up rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 shadow-[0_0_60px_rgba(16,185,129,0.12)]">
              <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-2xl font-extrabold text-zinc-100">
                <Flag code={me.flag} className="h-5 w-auto shrink-0" />
                <span className="truncate">{me.username}</span>
              </h2>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl bg-black/25 px-3 py-3 text-center ring-1 ring-white/10">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Players</div>
                  <div className="text-xl font-extrabold text-zinc-100 tabular-nums">
                    {wonPlayers.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-black/25 px-3 py-3 text-center ring-1 ring-white/10">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Spent</div>
                  <div className="text-xl font-extrabold text-red-200 tabular-nums">
                    ${totalSpent.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-2xl bg-black/25 px-3 py-3 text-center ring-1 ring-white/10">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">Remaining</div>
                  <div className="text-xl font-extrabold text-emerald-200 tabular-nums">
                    ${me.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              {wonPlayers.length > 0 ? (
                <div className="mt-5 pt-5 border-t border-white/10">
                  <p className="mb-3 text-sm font-semibold text-zinc-300">Your squad:</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {wonPlayers.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 ring-1 ring-white/5"
                      >
                        <span className="truncate text-sm text-zinc-200">{p.playerName}</span>
                        <span className="shrink-0 text-sm text-zinc-400 tabular-nums">
                          ${p.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-5 pt-5 border-t border-white/10 text-center text-sm text-zinc-400">
                  You didn&apos;t win any players in this auction.
                </p>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-zinc-400">
              Your results aren&apos;t available.
            </p>
          )}

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
