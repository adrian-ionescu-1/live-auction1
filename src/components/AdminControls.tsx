// src/components/AdminControls.tsx

'use client';

import { useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import ConfirmDialog from './ConfirmDialog';

export default function AdminControls() {
  const { currentUserId, users, status, startAuction, pauseAuction, resumeAuction, reset } =
    useAuctionStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentUser = users.find((u) => u.id === currentUserId);
  const isAdmin = currentUser?.isAdmin || false;

  if (!isAdmin) {
    return null;
  }

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const handleResetConfirm = () => {
    reset();
    setShowResetConfirm(false);
  };

  const handleResetCancel = () => {
    setShowResetConfirm(false);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold text-white">Admin Controls</h3>
        </div>

        <div className="space-y-3">
          {/* Start Auction */}
          {status === 'idle' && (
            <button
              onClick={startAuction}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
            >
              ▶ Start Auction
            </button>
          )}

          {/* Pause/Resume */}
          {status === 'active' && (
            <button
              onClick={pauseAuction}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
            >
              ⏸ Pause Auction
            </button>
          )}

          {status === 'paused' && (
            <button
              onClick={resumeAuction}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
            >
              ▶ Resume Auction
            </button>
          )}

          {/* Reset - Always Visible */}
          <button
            onClick={handleResetClick}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
          >
            🔄 Reset Auction
          </button>

          {/* Status Indicator */}
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <p className="text-white text-sm text-center">
              Status: <span className="font-bold uppercase">{status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Auction"
        message="Are you sure you want to restart the auction and accept the terms & conditions?"
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
    </>
  );
}