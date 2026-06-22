// Guarded "reopen / restart auction" dialog for the admin in the auction room.
// Reopening wipes every bidder's list and the recorded results and restarts the
// auction, so it's protected by: choosing Now vs Scheduled, typing the exact
// event name, and ticking a consent box. Portaled, mobile-first.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { localInputValue } from "@/components/admin/communityEventMeta";

export default function ReopenAuctionDialog({
  isOpen,
  eventName,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  eventName: string;
  busy?: boolean;
  error?: string | null;
  /** opensAt: null = open now; ISO string = scheduled reopen. */
  onConfirm: (opensAt: string | null) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [opensAtLocal, setOpensAtLocal] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setMode("now");
    setOpensAtLocal("");
    setNameInput("");
    setConsent(false);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const scheduledMs = opensAtLocal ? new Date(opensAtLocal).getTime() : NaN;
  const scheduleValid = mode === "now" || (!Number.isNaN(scheduledMs) && scheduledMs > Date.now());
  const nameMatches = nameInput.trim() === eventName.trim() && eventName.trim() !== "";
  const canConfirm = nameMatches && consent && scheduleValid && !busy;

  const submit = () => {
    if (!canConfirm) return;
    onConfirm(mode === "now" ? null : new Date(scheduledMs).toISOString());
  };

  const inputCls =
    "w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-red-400/40";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Reopen auction"
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div className="my-4 w-full max-w-md rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-red-400/20 shadow-2xl">
          <h3 className="text-lg font-extrabold text-zinc-100">Reopen this auction?</h3>
          <p className="mt-1.5 text-sm text-zinc-400">
            This <span className="font-semibold text-red-200">deletes every bidder&apos;s list</span>{" "}
            and the recorded results for{" "}
            <span className="font-semibold text-zinc-200">{eventName}</span>, resets all budgets,
            and restarts the auction from the top. This can&apos;t be undone.
          </p>

          {/* When to reopen */}
          <div className="mt-4">
            <span className="block text-sm font-semibold text-zinc-300">When</span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("now")}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition ${
                  mode === "now"
                    ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                    : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                }`}
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("schedule");
                  if (!opensAtLocal) {
                    setOpensAtLocal(localInputValue(new Date(Date.now() + 60 * 60 * 1000)));
                  }
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition ${
                  mode === "schedule"
                    ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                    : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                }`}
              >
                Scheduled
              </button>
            </div>
            {mode === "schedule" && (
              <div className="mt-3">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={opensAtLocal}
                  min={localInputValue(new Date())}
                  onChange={(e) => setOpensAtLocal(e.target.value)}
                />
                {!scheduleValid && (
                  <p className="mt-1 text-xs font-semibold text-amber-200">
                    Pick a date and time in the future.
                  </p>
                )}
                <p className="mt-1 text-xs text-zinc-500">
                  Bidders see a countdown and can enter only once it opens.
                </p>
              </div>
            )}
          </div>

          {/* Type the name to confirm */}
          <label className="mt-4 block">
            <span className="block text-sm font-semibold text-zinc-300">
              Type the event name to confirm
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Type <span className="font-semibold text-zinc-300">{eventName}</span> exactly.
            </span>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={eventName}
              className={`${inputCls} mt-1.5`}
            />
          </label>

          {/* Consent */}
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-400/25">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-red-500"
            />
            <span className="text-sm font-semibold text-red-50">
              I understand this erases all bids and results and restarts the auction.
            </span>
          </label>

          {error && <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canConfirm}
              className="flex-1 rounded-2xl bg-gradient-to-r from-red-500/80 to-rose-500/80 px-4 py-3 text-sm font-bold text-white transition hover:from-red-500 hover:to-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Reopening…" : mode === "now" ? "Reopen now" : "Schedule reopen"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
