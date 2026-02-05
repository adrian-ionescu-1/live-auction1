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

  // după ce ai lua player-ul curent, câte sloturi mai rămân?
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
      // On success the realtime bids channel will push the new bid to UI
    } catch {
      setBidError('Bid rejected');
      setTimeout(() => setBidError(null), 3500);
    }
  };

  if (currentUserRole === 'ADMIN' || currentUserRole === 'SPECTATOR') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Bidding</h3>
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 text-center">
          <p className="text-gray-600">
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
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Place Your Bid</h3>

      {/* Current highest bid display */}
      <div className="mb-4">
        {currentHighestBid ? (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <p className="text-sm text-gray-600">Current Highest Bid</p>
            <p className="text-2xl font-bold text-blue-600">
              ${currentHighestBid.amount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">by {currentHighestBid.username}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-600">No bids yet</p>
            <p className="text-lg font-semibold text-gray-700">
              Base: ${currentPlayer?.basePrice.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Status-based hint */}
      {!isActive && status !== 'idle' && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 mb-3">
          <p className="text-sm text-yellow-800 text-center">
            {status === 'countdown' && 'Auction starting soon...'}
            {status === 'paused' && 'Auction paused'}
            {status === 'result' && 'Showing results...'}
            {status === 'finished' && 'Auction completed'}
          </p>
        </div>
      )}

      {/* Target reached message (NEW) */}
      {reachedTarget && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 mb-3">
          <p className="text-sm text-green-800 text-center font-semibold">
            Target completed ({TARGET_PLAYERS}/{TARGET_PLAYERS}). Bidding is locked.
          </p>
        </div>
      )}

      {/* Preset bid buttons */}
      {canBid && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3 font-semibold">Select Bid Increment</p>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_BIDS.map((increment) => {
              const baseAmount = currentHighestBid
                ? currentHighestBid.amount
                : currentPlayer?.basePrice || 0;

              const totalBid = baseAmount + increment;

              // NEW: user must keep reserve for remaining slots after this win
              const canAfford = totalBid <= (currentUser.balance - requiredAfterWin);

              return (
                <button
                  key={increment}
                  onClick={() => handlePresetBid(increment)}
                  disabled={!canBid || !canAfford}
                  className={`py-4 px-3 rounded-lg font-bold text-white transition shadow-md ${
                    canAfford
                      ? 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <div className="text-lg">+${increment}</div>
                  <div className="text-xs opacity-80 mt-1">(${totalBid})</div>
                </button>
              );
            })}
          </div>

          {/* NEW: informational hint about reserve */}
          <div className="mt-3 text-xs text-gray-600 text-center">
            Minimum reserve required after this bid:{' '}
            <span className="font-bold">${requiredAfterWin.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Server-side rejection feedback */}
      {bidError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-3">
          <p className="text-sm text-red-800 text-center font-semibold">{bidError}</p>
        </div>
      )}

      {currentUser.balance === 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
          <p className="text-sm text-red-800 text-center font-semibold">
            You have no balance left!
          </p>
        </div>
      )}
    </div>
  );
}
