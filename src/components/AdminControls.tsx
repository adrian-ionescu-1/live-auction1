// src/components/AdminControls.tsx

'use client';

import { useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import ConfirmDialog from './ConfirmDialog';

const TIME_EXTENSIONS = [5, 10, 15]; // seconds

export default function AdminControls() {
  const {
    currentUserRole,
    status,
    soldPlayers,
    currentPlayer,
    startAuction,
    pauseAuction,
    resumeAuction,
    reset,
    extendTime,
  } = useAuctionStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [extendError, setExtendError]           = useState<string | null>(null);

  if (currentUserRole !== 'ADMIN') {
    return null;
  }

  // Time extension is only meaningful when the auction is actively running
  // and the current player has NOT already been sold.
  const currentPlayerSold = currentPlayer
    ? soldPlayers.includes(currentPlayer.id)
    : true;
  const canExtend = status === 'active' && !currentPlayerSold;

  // ── handlers ──────────────────────────────────────────────
  const handleResetClick   = () => setShowResetConfirm(true);
  const handleResetConfirm = () => { reset(); setShowResetConfirm(false); };
  const handleResetCancel  = () => setShowResetConfirm(false);

  const handleExtend = async (seconds: number) => {
    setExtendError(null);
    const result = await extendTime(seconds);
    if (!result.success) {
      setExtendError(result.error);
      // Auto-clear the error after 3 seconds
      setTimeout(() => setExtendError(null), 3000);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-6 max-w-md w-full">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <h3 className="text-xl font-bold text-white">Admin Controls</h3>
        </div>

        <div className="space-y-3">
          {/* ── Start / Pause / Resume ── */}
          {status === 'idle' && (
            <button
              onClick={startAuction}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
            >
              ▶ Start Auction
            </button>
          )}

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

          {/* ── Time Extension Buttons ── */}
          {/* Shown whenever there is an active player (countdown, active, paused, result).
              Buttons are enabled/disabled based on canExtend. */}
          {(status === 'countdown' || status === 'active' || status === 'paused' || status === 'result') && (
            <div className="bg-white bg-opacity-10 rounded-lg p-3">
              <p className="text-white text-sm font-semibold mb-2 text-center">⏱ Extend Time</p>
              <div className="flex gap-2">
                {TIME_EXTENSIONS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleExtend(sec)}
                    disabled={!canExtend}
                    className={`flex-1 font-bold py-2 px-3 rounded-lg transition text-sm shadow
                      ${canExtend
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                      }`}
                  >
                    +{sec}s
                  </button>
                ))}
              </div>

              {/* Error feedback */}
              {extendError && (
                <p className="text-red-300 text-xs text-center mt-2">{extendError}</p>
              )}

              {/* Disabled reason hint */}
              {!canExtend && (
                <p className="text-white text-opacity-60 text-xs text-center mt-2">
                  {status !== 'active'
                    ? 'Available only during active auction'
                    : 'Player already sold'}
                </p>
              )}
            </div>
          )}

          {/* ── Reset ── */}
          <button
            onClick={handleResetClick}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
          >
            🔄 Reset Auction
          </button>

          {/* ── Status badge ── */}
          <div className="bg-white bg-opacity-20 rounded-lg p-3">
            <p className="text-white text-sm text-center">
              Status: <span className="font-bold uppercase">{status}</span>
            </p>
          </div>
        </div>
      </div>

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