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
  const [extendError, setExtendError] = useState<string | null>(null);

  if (currentUserRole !== 'ADMIN') {
    return null;
  }

  const currentPlayerSold = currentPlayer ? soldPlayers.includes(currentPlayer.id) : true;
  const canExtend = status === 'active' && !currentPlayerSold;

  const handleResetClick = () => setShowResetConfirm(true);
  const handleResetConfirm = () => {
    reset();
    setShowResetConfirm(false);
  };
  const handleResetCancel = () => setShowResetConfirm(false);

  const handleExtend = async (seconds: number) => {
    setExtendError(null);
    const result = await extendTime(seconds);
    if (!result.success) {
      setExtendError(result.error);
      setTimeout(() => setExtendError(null), 3000);
    }
  };

  return (
    <>
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6 lg:max-w-none">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-amber-300/80 blur-[2px]" />
            <span className="absolute inset-0 rounded-full bg-amber-300 animate-pulse" />
          </div>
          <h3 className="text-base font-extrabold tracking-wide text-zinc-100">
            Admin Controls
          </h3>
          <span className="ml-auto rounded-full bg-black/30 ring-1 ring-white/10 px-3 py-1 text-[11px] text-zinc-300">
            {status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-3">
          {/* ── Start / Pause / Resume ── */}
          {status === 'idle' && (
            <button
              onClick={startAuction}
              className="w-full rounded-2xl py-3 px-6 text-sm font-bold transition
                         text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/20
                         ring-1 ring-emerald-400/25 active:scale-[0.98]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              ▶ Start Auction
            </button>
          )}

          {status === 'active' && (
            <button
              onClick={pauseAuction}
              className="w-full rounded-2xl py-3 px-6 text-sm font-bold transition
                         text-amber-200 bg-amber-500/15 hover:bg-amber-500/20
                         ring-1 ring-amber-400/25 active:scale-[0.98]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              ⏸ Pause Auction
            </button>
          )}

          {status === 'paused' && (
            <button
              onClick={resumeAuction}
              className="w-full rounded-2xl py-3 px-6 text-sm font-bold transition
                         text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/20
                         ring-1 ring-cyan-400/25 active:scale-[0.98]
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              ▶ Resume Auction
            </button>
          )}

          {/* ── Time Extension Buttons ── */}
          {(status === 'countdown' ||
            status === 'active' ||
            status === 'paused' ||
            status === 'result') && (
            <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
              <p className="text-zinc-200 text-sm font-semibold mb-3 text-center">
                ⏱ Extend Time
              </p>

              <div className="flex gap-2">
                {TIME_EXTENSIONS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleExtend(sec)}
                    disabled={!canExtend}
                    className={`flex-1 rounded-xl py-2 px-3 text-sm font-bold transition ring-1 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60
                      ${
                        canExtend
                          ? 'text-cyan-200 bg-cyan-500/15 hover:bg-cyan-500/20 ring-cyan-400/25'
                          : 'text-zinc-500 bg-white/5 ring-white/10 cursor-not-allowed opacity-70'
                      }`}
                  >
                    +{sec}s
                  </button>
                ))}
              </div>

              {extendError && (
                <p className="text-red-200 text-xs text-center mt-3">
                  {extendError}
                </p>
              )}

              {!canExtend && (
                <p className="text-zinc-400 text-xs text-center mt-3">
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
            className="w-full rounded-2xl py-3 px-6 text-sm font-bold transition
                       text-red-200 bg-red-500/15 hover:bg-red-500/20
                       ring-1 ring-red-400/25 active:scale-[0.98]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          >
            🔄 Reset Auction
          </button>

          {/* ── Status (extra) ── */}
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
            <p className="text-zinc-300 text-sm text-center">
              Status: <span className="font-bold uppercase text-zinc-100">{status}</span>
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
