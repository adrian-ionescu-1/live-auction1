// A small modal that asks the admin to pick a date+time, then confirms an action
// with it (extend an event, reopen registrations). Portaled to <body> so it's
// always centered and above the page. Mobile-first.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { localInputValue } from "@/components/admin/communityEventMeta";

export default function DatePromptDialog({
  isOpen,
  title,
  description,
  label,
  initial,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  label: string;
  /** Initial datetime-local value; defaults to one hour from now. */
  initial?: string;
  confirmLabel: string;
  busy: boolean;
  /** Receives the chosen instant as an ISO string. */
  onConfirm: (iso: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      setValue(initial || localInputValue(new Date(Date.now() + 60 * 60 * 1000)));
    }
  }, [isOpen, initial]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const ms = value ? new Date(value).getTime() : NaN;
  const valid = !Number.isNaN(ms) && ms > Date.now();

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-white/10 shadow-2xl">
          <h3 className="text-lg font-extrabold text-zinc-100">{title}</h3>
          <p className="mt-2 text-sm text-zinc-400">{description}</p>

          <label className="mt-4 block">
            <span className="block text-xs font-semibold text-zinc-400">{label}</span>
            <input
              type="datetime-local"
              value={value}
              min={localInputValue(new Date())}
              onChange={(e) => setValue(e.target.value)}
              className="mt-2 w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          {!valid && (
            <p className="mt-2 text-xs font-semibold text-amber-200">
              Pick a date and time in the future.
            </p>
          )}

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
              onClick={() => valid && onConfirm(new Date(ms).toISOString())}
              disabled={!valid || busy}
              className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
