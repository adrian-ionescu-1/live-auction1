'use client';

import { useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import Flag from '@/components/community/Flag';
import {
  DEFAULT_TARGET_PLAYERS,
  DEFAULT_RESERVE_PER_PLAYER,
} from '@/config/auctionRules';

const DEFAULT_PRESET_BIDS = [10, 50, 100, 500, 1000];

export default function BidControls() {
  const {
    currentUserId,
    currentUserRole,
    users,
    currentHighestBid,
    placeBid,
    status,
    currentPlayer,
    liveEvent,
  } = useAuctionStore();

  const [bidError, setBidError] = useState<string | null>(null);

  const currentUser = users.find((u) => u.id === currentUserId);

  // Resolve the leading bidder's current name + flag live (admin renames / flags
  // reflect immediately); fall back to the bid's captured name.
  const leader = currentHighestBid
    ? users.find((u) => u.id === currentHighestBid.userId)
    : undefined;
  const leaderName = leader?.username ?? currentHighestBid?.username ?? '';
  const leaderFlag = leader?.flag ?? null;

  // ---- TARGET / RESERVE LOGIC (event-driven) ----
  const target = liveEvent?.playerLimit ?? DEFAULT_TARGET_PLAYERS;
  const reservePerPlayer = liveEvent?.reservePerPlayer ?? DEFAULT_RESERVE_PER_PLAYER;

  const wonCount = currentUser?.wonPlayers?.length ?? 0;
  const reachedTarget = wonCount >= target;

  // Event-specific bid buttons + opening bid.
  const increments =
    liveEvent?.bidIncrements && liveEvent.bidIncrements.length > 0
      ? liveEvent.bidIncrements
      : DEFAULT_PRESET_BIDS;
  const openingBase =
    liveEvent && liveEvent.bidStart > 0 ? liveEvent.bidStart : currentPlayer?.basePrice || 0;

  const isActive = status === 'active';
  const isBanned = !!currentUser?.banned;

  // after winning the current player, how many slots are left?
  const remainingAfterWin = Math.max(0, target - (wonCount + 1));
  const requiredAfterWin = remainingAfterWin * reservePerPlayer;

  const canBid =
    !!currentUser &&
    currentUserRole === 'USER' &&
    isActive &&
    !reachedTarget &&
    !isBanned;
  // -------------------------------------

  const handlePresetBid = async (increment: number) => {
    setBidError(null);

    const baseAmount = currentHighestBid ? currentHighestBid.amount : openingBase;

    const bidAmount = baseAmount + increment;

    if (!currentUser) return;

    const maxAllowedBid = currentUser.balance - requiredAfterWin;

    if (bidAmount > maxAllowedBid) {
      setBidError(
        reachedTarget
          ? `Target reached (${target}/${target}). You can’t bid anymore.`
          : `You must keep at least $${requiredAfterWin.toLocaleString()} reserved to complete your target.`
      );
      setTimeout(() => setBidError(null), 3500);
      return;
    }

    try {
      const result = await placeBid(bidAmount);
      if (!result.success) {
        setBidError(result.error || 'Bid rejected');
        setTimeout(() => setBidError(null), 3500);
      }
    } catch {
      setBidError('Bid rejected');
      setTimeout(() => setBidError(null), 3500);
    }
  };

  if (currentUserRole === 'ADMIN' || currentUserRole === 'SPECTATOR') {
    return (
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
        <h3 className="text-base font-extrabold tracking-wide text-zinc-100 mb-4">
          Bidding
        </h3>
        <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4 text-center">
          <p className="text-zinc-400">
            {currentUserRole === 'ADMIN'
              ? 'Admins cannot place bids'
              : 'Streamers are watch-only — no bidding'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="w-full max-w-md animate-fade-up overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm lg:max-w-none">
      {/* Header */}
      <div className="relative border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent px-4 py-3 sm:px-5">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
        <div className="flex items-center gap-2">
          <span aria-hidden>💸</span>
          <h3 className="text-sm font-extrabold tracking-wide text-zinc-100">
            Place your bid
          </h3>
        </div>
      </div>

      <div className="p-4 sm:p-5">
      {/* Current highest bid display */}
      <div className="mb-4">
        {currentHighestBid ? (
          <div className="relative overflow-hidden rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-400/20 p-4">
            <span className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-cyan-400/15 blur-2xl" />
            <p className="text-xs text-zinc-400">Current Highest Bid</p>
            <p
              key={currentHighestBid.amount}
              className="text-3xl font-extrabold text-cyan-200 tabular-nums animate-pop"
            >
              ${currentHighestBid.amount.toLocaleString()}
            </p>
            <p className="flex items-center gap-1.5 text-sm text-zinc-300">
              by <Flag code={leaderFlag} className="h-3.5 w-auto" />
              <span className="font-semibold text-zinc-100">{leaderName}</span>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
            <p className="text-xs text-zinc-400">No bids yet</p>
            <p className="text-base font-semibold text-zinc-200">
              Opening: ${openingBase.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Banned notice — can watch, cannot bid */}
      {isBanned && (
        <div className="rounded-2xl bg-red-500/12 ring-1 ring-red-400/25 p-3 mb-3">
          <p className="text-sm text-red-200 text-center font-semibold">
            You are banned from bidding by the admin.
          </p>
          <p className="mt-1 text-xs text-red-200/80 text-center">
            You can still watch the auction. Bidding unlocks if the admin lifts the ban.
          </p>
        </div>
      )}

      {/* Status-based hint */}
      {!isActive && status !== 'idle' && (
        <div className="rounded-2xl bg-amber-500/12 ring-1 ring-amber-400/20 p-3 mb-3">
          <p className="text-sm text-amber-200 text-center font-semibold">
            {status === 'countdown' && 'Auction starting soon...'}
            {status === 'paused' && 'Auction paused'}
            {status === 'result' && 'Showing results...'}
            {status === 'finished' && 'Auction completed'}
          </p>
        </div>
      )}

      {/* Target reached message (NEW) */}
      {reachedTarget && (
        <div className="rounded-2xl bg-emerald-500/12 ring-1 ring-emerald-400/20 p-3 mb-3">
          <p className="text-sm text-emerald-200 text-center font-semibold">
            Target completed ({target}/{target}). Bidding is locked.
          </p>
        </div>
      )}

      {/* Preset bid buttons */}
      {canBid && (
        <div className="mb-4">
          <p className="text-sm text-zinc-300 mb-3 font-semibold">
            Select Bid Increment
          </p>

          <div className="grid grid-cols-3 gap-3">
            {increments.map((increment) => {
              const baseAmount = currentHighestBid ? currentHighestBid.amount : openingBase;

              const totalBid = baseAmount + increment;

              const canAfford = totalBid <= (currentUser.balance - requiredAfterWin);

              return (
                <button
                  key={increment}
                  onClick={() => handlePresetBid(increment)}
                  disabled={!canBid || !canAfford}
                  className={`group/btn relative overflow-hidden rounded-2xl py-4 px-3 font-extrabold transition ring-1 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60
                    ${
                      canAfford
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(16,185,129,0.18)] text-emerald-200 ring-emerald-400/25'
                        : 'bg-white/5 text-zinc-500 ring-white/10 cursor-not-allowed opacity-70'
                    }`}
                >
                  {canAfford && (
                    <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover/btn:opacity-100 group-hover/btn:animate-sheen" />
                  )}
                  <div className="relative text-lg tabular-nums">+${increment}</div>
                  <div className="relative text-xs text-zinc-400 mt-1 tabular-nums">(${totalBid})</div>
                </button>
              );
            })}
          </div>

          {/* informational hint about reserve */}
          <div className="mt-3 text-xs text-zinc-400 text-center">
            Minimum reserve required after this bid:{' '}
            <span className="font-semibold text-zinc-200 tabular-nums">
              ${requiredAfterWin.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Server-side rejection feedback */}
      {bidError && (
        <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-400/20 p-3 mb-3">
          <p className="text-sm text-red-200 text-center font-semibold">{bidError}</p>
        </div>
      )}

      {!isBanned && currentUser.balance === 0 && (
        <div className="rounded-2xl bg-amber-500/10 ring-1 ring-amber-400/20 p-3">
          <p className="text-sm text-amber-200 text-center font-semibold">
            {wonCount === 0
              ? 'Waiting for the admin to set your budget.'
              : 'You have no balance left!'}
          </p>
        </div>
      )}
      </div>
    </div>
  );
}
