// src/components/BidControls.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

const PRESET_BIDS = [10, 50, 100, 500, 1000];

export default function BidControls() {
  const { currentUserId, currentUserRole, users, currentHighestBid, placeBid, status, currentPlayer } = useAuctionStore();

  const currentUser = users.find((u) => u.id === currentUserId);
  const isActive = status === 'active';
  const canBid = currentUser && currentUserRole === 'USER' && currentUser.balance > 0 && isActive;

  const handlePresetBid = async (increment: number) => {
    const baseAmount = currentHighestBid ? currentHighestBid.amount : currentPlayer?.basePrice || 0;
    const bidAmount = baseAmount + increment;

    if (currentUser && bidAmount <= currentUser.balance) {
      const success = await placeBid(bidAmount);
      if (!success) {
        alert('Bid rejected. Check requirements.');
      }
    } else {
      alert('Insufficient balance for this bid.');
    }
  };

  if (currentUserRole === 'ADMIN' || currentUserRole === 'SPECTATOR') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Bidding</h3>
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 text-center">
          <p className="text-gray-600">
            {currentUserRole === 'ADMIN' ? 'Admins cannot place bids' : 'Spectators cannot place bids'}
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

      <div className="mb-4">
        {currentHighestBid ? (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
            <p className="text-sm text-gray-600">Current Highest Bid</p>
            <p className="text-2xl font-bold text-blue-600">${currentHighestBid.amount.toLocaleString()}</p>
            <p className="text-sm text-gray-600">by {currentHighestBid.username}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
            <p className="text-sm text-gray-600">No bids yet</p>
            <p className="text-lg font-semibold text-gray-700">Base: ${currentPlayer?.basePrice.toLocaleString()}</p>
          </div>
        )}
      </div>

      {canBid && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3 font-semibold">Select Bid Increment</p>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_BIDS.map((increment) => {
              const baseAmount = currentHighestBid ? currentHighestBid.amount : currentPlayer?.basePrice || 0;
              const totalBid = baseAmount + increment;
              const canAfford = currentUser.balance >= totalBid;

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
        </div>
      )}

      {!isActive && status !== 'idle' && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
          <p className="text-sm text-yellow-800 text-center">
            {status === 'countdown' && 'Auction starting soon...'}
            {status === 'paused' && 'Auction paused'}
            {status === 'result' && 'Showing results...'}
            {status === 'finished' && 'Auction completed'}
          </p>
        </div>
      )}

      {currentUser.balance === 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
          <p className="text-sm text-red-800 text-center font-semibold">You have no balance left!</p>
        </div>
      )}
    </div>
  );
}