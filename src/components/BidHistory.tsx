// src/components/BidHistory.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function BidHistory() {
  const { bidHistory } = useAuctionStore();

  if (bidHistory.length === 0) {
    return null;
  }

  // Show only last 5 bids
  const recentBids = bidHistory.slice(-5).reverse();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Bids</h3>
      <div className="space-y-2">
        {recentBids.map((bid, index) => (
          <div
            key={`${bid.userId}-${bid.timestamp}`}
            className={`flex justify-between items-center p-3 rounded-lg ${
              index === 0 ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'
            }`}
          >
            <div>
              <p className={`font-semibold ${index === 0 ? 'text-green-700' : 'text-gray-700'}`}>
                {bid.username}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(bid.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <p className={`text-xl font-bold ${index === 0 ? 'text-green-600' : 'text-gray-600'}`}>
              ${bid.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}