'use client';

import { useAuctionStore } from '@/store/auctionStore';
import TargetProgress from './TargetProgress';
import {
  DEFAULT_TARGET_PLAYERS,
  DEFAULT_RESERVE_PER_PLAYER,
  calcReserve,
} from '@/config/auctionRules';

// The bidder's budget panel: balance, reserve, spendable and target progress.
// Identity + log out live in the top-right account menu, so they're not here.
// Admins don't see this panel (it isn't rendered for them).
export default function UserBalance() {
  const { currentUserId, users, liveEvent } = useAuctionStore();
  const currentUser = users.find((u) => u.id === currentUserId);

  if (!currentUser) return null;

  const target = liveEvent?.playerLimit ?? DEFAULT_TARGET_PLAYERS;
  const reservePerPlayer = liveEvent?.reservePerPlayer ?? DEFAULT_RESERVE_PER_PLAYER;

  const wonCount = currentUser.wonPlayers?.length ?? 0;
  const remainingSlots = Math.max(0, target - wonCount);
  const reserved = calcReserve(remainingSlots, reservePerPlayer);
  const spendable = Math.max(0, currentUser.balance - reserved);
  const zeroBalance = currentUser.balance === 0;

  return (
    <div className="w-full max-w-md animate-fade-up overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm lg:max-w-none">
      {/* Header */}
      <div className="relative border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent px-4 py-3 sm:px-5">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Your budget
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-emerald-200 ring-1 ring-emerald-400/25">
            {wonCount}/{target} won
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Balance</p>
        <p
          className={`text-3xl font-extrabold tabular-nums sm:text-4xl ${
            zeroBalance ? 'text-red-200' : 'text-emerald-200'
          }`}
        >
          ${currentUser.balance.toLocaleString()}
        </p>

        {/* Reserve + spendable tiles */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Reserved</p>
            <p className="mt-0.5 text-base font-extrabold tabular-nums text-zinc-200 sm:text-lg">
              ${reserved.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-500/10 p-3 ring-1 ring-emerald-400/20">
            <p className="text-[10px] uppercase tracking-wide text-emerald-200/80">
              Spendable
            </p>
            <p className="mt-0.5 text-base font-extrabold tabular-nums text-emerald-200 sm:text-lg">
              ${spendable.toLocaleString()}
            </p>
          </div>
        </div>

        <TargetProgress wonCount={wonCount} target={target} />
      </div>
    </div>
  );
}
