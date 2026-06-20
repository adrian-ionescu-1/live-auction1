'use client';

import { useState } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import { EventsService } from '@/services/eventsService';
import ConfirmDialog from '../ui/ConfirmDialog';

const TIME_EXTENSIONS = [5, 10, 15]; // seconds

const STATUS_META: Record<string, { label: string; dot: string; chip: string }> = {
  idle: { label: 'Idle', dot: 'bg-zinc-400', chip: 'bg-white/5 text-zinc-300 ring-white/15' },
  countdown: {
    label: 'Countdown',
    dot: 'bg-amber-300',
    chip: 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
  },
  active: {
    label: 'Active',
    dot: 'bg-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
  },
  paused: {
    label: 'Paused',
    dot: 'bg-cyan-300',
    chip: 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/25',
  },
  result: {
    label: 'Result',
    dot: 'bg-fuchsia-300',
    chip: 'bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/25',
  },
  finished: {
    label: 'Finished',
    dot: 'bg-cyan-300',
    chip: 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/25',
  },
};

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
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  const canFinalize =
    status === 'countdown' ||
    status === 'active' ||
    status === 'paused' ||
    status === 'result';

  const handleFinalize = async () => {
    setFinalizing(true);
    await EventsService.finalizeEvent();
    setFinalizing(false);
    setShowFinalizeConfirm(false);
  };

  if (currentUserRole !== 'ADMIN') {
    return null;
  }

  const currentPlayerSold = currentPlayer ? soldPlayers.includes(currentPlayer.id) : true;
  const canExtend = status === 'active' && !currentPlayerSold;
  const meta = STATUS_META[status] ?? STATUS_META.idle;

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

  const showExtend =
    status === 'countdown' ||
    status === 'active' ||
    status === 'paused' ||
    status === 'result';

  return (
    <>
      <div className="w-full max-w-md animate-fade-up overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm sm:max-w-none lg:max-w-none">
        {/* Header with gradient accent */}
        <div className="relative border-b border-white/10 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent px-5 py-4">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-base ring-1 ring-emerald-400/25">
                🎛️
              </span>
              <h3 className="text-base font-extrabold tracking-wide text-zinc-100">
                Auction control
              </h3>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${meta.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
              {meta.label}
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          {/* ── Primary action: Start / Pause / Resume ── */}
          {status === 'idle' && (
            <button
              onClick={startAuction}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500/25 to-emerald-400/15 py-3.5 px-6 text-sm font-extrabold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:from-emerald-500/35 hover:to-emerald-400/25 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              ▶ Start auction
            </button>
          )}
          {status === 'active' && (
            <button
              onClick={pauseAuction}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500/25 to-amber-400/15 py-3.5 px-6 text-sm font-extrabold text-amber-100 ring-1 ring-amber-400/30 transition hover:from-amber-500/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              ⏸ Pause auction
            </button>
          )}
          {status === 'paused' && (
            <button
              onClick={resumeAuction}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-500/25 to-cyan-400/15 py-3.5 px-6 text-sm font-extrabold text-cyan-100 ring-1 ring-cyan-400/30 transition hover:from-cyan-500/35 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              ▶ Resume auction
            </button>
          )}

          {/* ── Extend time ── */}
          {showExtend && (
            <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <span aria-hidden>⏱</span> Extend time
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIME_EXTENSIONS.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleExtend(sec)}
                    disabled={!canExtend}
                    className={`rounded-xl py-2.5 text-sm font-bold ring-1 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${
                      canExtend
                        ? 'bg-cyan-500/15 text-cyan-200 ring-cyan-400/25 hover:bg-cyan-500/25'
                        : 'cursor-not-allowed bg-white/5 text-zinc-500 ring-white/10 opacity-70'
                    }`}
                  >
                    +{sec}s
                  </button>
                ))}
              </div>
              {extendError && (
                <p className="mt-3 text-center text-xs text-red-200">{extendError}</p>
              )}
              {!canExtend && (
                <p className="mt-3 text-center text-xs text-zinc-500">
                  {status !== 'active' ? 'Available only during an active player' : 'Player already sold'}
                </p>
              )}
            </div>
          )}

          {/* ── End / Reset (high-impact actions) ── */}
          <div className="space-y-2 border-t border-white/10 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              Wrap up
            </p>
            {canFinalize && (
              <button
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={finalizing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-500/15 py-3 px-4 text-sm font-bold text-fuchsia-200 ring-1 ring-fuchsia-400/25 transition hover:bg-fuchsia-500/25 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
              >
                🏁 End &amp; distribute remaining
              </button>
            )}
            <button
              onClick={handleResetClick}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 py-3 px-4 text-sm font-bold text-red-200 ring-1 ring-red-400/20 transition hover:bg-red-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            >
              🔄 Reset auction
            </button>
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

      <ConfirmDialog
        isOpen={showFinalizeConfirm}
        title="End auction now?"
        message="Every player still unsold will be handed out randomly (free) — at most one per member per round. The auction then closes and members are sent to their dashboard."
        onConfirm={handleFinalize}
        onCancel={() => setShowFinalizeConfirm(false)}
      />
    </>
  );
}
