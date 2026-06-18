// src/components/BidControls.tsx

'use client';

import { useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import { TARGET_PLAYERS, MIN_PLAYER_COST } from '@/config/auctionRules';

const PRESET_BIDS = [10, 50, 100, 500, 1000];

export default function BidControls() {
  const {
    currentUserId,
    currentUserRole,
    users,
    currentHighestBid,
    placeBid,
    status,
    currentPlayer,
  } = useAuctionStore();

  const [bidError, setBidError] = useState<string | null>(null);

  const currentUser = users.find((u) => u.id === currentUserId);

  // ---- TARGET / RESERVE LOGIC (NEW) ----
  const wonCount = currentUser?.wonPlayers?.length ?? 0;
  const reachedTarget = wonCount >= TARGET_PLAYERS;

  const isActive = status === 'active';

  // after winning the current player, how many slots are left?
  const remainingAfterWin = Math.max(0, TARGET_PLAYERS - (wonCount + 1));
  const requiredAfterWin = remainingAfterWin * MIN_PLAYER_COST;

  const canBid =
    !!currentUser &&
    currentUserRole === 'USER' &&
    isActive &&
    !reachedTarget;
  // -------------------------------------

  const handlePresetBid = async (increment: number) => {
    setBidError(null);

    const baseAmount = currentHighestBid
      ? currentHighestBid.amount
      : currentPlayer?.basePrice || 0;

    const bidAmount = baseAmount + increment;

    if (!currentUser) return;

    const maxAllowedBid = currentUser.balance - requiredAfterWin;

    if (bidAmount > maxAllowedBid) {
      setBidError(
        reachedTarget
          ? `Target reached (${TARGET_PLAYERS}/${TARGET_PLAYERS}). You can’t bid anymore.`
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
      <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 max-w-md w-full">
        <h3 className="text-base font-extrabold tracking-wide text-zinc-100 mb-4">
          Bidding
        </h3>
        <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4 text-center">
          <p className="text-zinc-400">
            {currentUserRole === 'ADMIN'
              ? 'Admins cannot place bids'
              : 'Spectators cannot place bids'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 max-w-md w-full">
      <h3 className="text-base font-extrabold tracking-wide text-zinc-100 mb-4">
        Place Your Bid
      </h3>

      {/* Current highest bid display */}
      <div className="mb-4">
        {currentHighestBid ? (
          <div className="rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-400/20 p-4">
            <p className="text-xs text-zinc-400">Current Highest Bid</p>
            <p className="text-3xl font-extrabold text-cyan-200 tabular-nums">
              ${currentHighestBid.amount.toLocaleString()}
            </p>
            <p className="text-sm text-zinc-300">
              by <span className="font-semibold text-zinc-100">{currentHighestBid.username}</span>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
            <p className="text-xs text-zinc-400">No bids yet</p>
            <p className="text-base font-semibold text-zinc-200">
              Base: ${currentPlayer?.basePrice.toLocaleString()}
            </p>
          </div>
        )}
      </div>

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
            Target completed ({TARGET_PLAYERS}/{TARGET_PLAYERS}). Bidding is locked.
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
            {PRESET_BIDS.map((increment) => {
              const baseAmount = currentHighestBid
                ? currentHighestBid.amount
                : currentPlayer?.basePrice || 0;

              const totalBid = baseAmount + increment;

              const canAfford = totalBid <= (currentUser.balance - requiredAfterWin);

              return (
                <button
                  key={increment}
                  onClick={() => handlePresetBid(increment)}
                  disabled={!canBid || !canAfford}
                  className={`rounded-2xl py-4 px-3 font-extrabold transition ring-1 active:scale-[0.98]
                    ${
                      canAfford
                        ? 'bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-200 ring-emerald-400/25'
                        : 'bg-white/5 text-zinc-500 ring-white/10 cursor-not-allowed opacity-70'
                    }`}
                >
                  <div className="text-lg tabular-nums">+${increment}</div>
                  <div className="text-xs text-zinc-400 mt-1 tabular-nums">(${totalBid})</div>
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

      {currentUser.balance === 0 && (
        <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-400/20 p-3">
          <p className="text-sm text-red-200 text-center font-semibold">
            You have no balance left!
          </p>
        </div>
      )}
    </div>
  );
}
