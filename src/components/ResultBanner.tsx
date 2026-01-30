// src/components/ResultBanner.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';

export default function ResultBanner() {
  const { status, resultMessage, countdown } = useAuctionStore();

  if (status !== 'result' && status !== 'finished') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-center animate-pulse">
        <div className="mb-4">
          {status === 'result' ? (
            <h2 className="text-5xl font-bold text-green-600 mb-2">SOLD!</h2>
          ) : (
            <h2 className="text-5xl font-bold text-blue-600 mb-2">AUCTION COMPLETE!</h2>
          )}
        </div>
        
        <p className="text-2xl text-gray-700 mb-6">{resultMessage}</p>
        
        {status === 'result' && (
          <div className="text-gray-500">
            <p className="text-lg">Next player in {countdown} seconds...</p>
            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-1000"
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {status === 'finished' && (
          <div className="mt-6">
            <p className="text-lg text-gray-600">Thank you for participating!</p>
          </div>
        )}
      </div>
    </div>
  );
}