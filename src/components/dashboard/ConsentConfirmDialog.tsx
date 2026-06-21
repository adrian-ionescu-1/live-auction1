// A confirm dialog whose action stays disabled until the user ticks a required
// acknowledgement checkbox. Used for actions a member must consciously own
// (e.g. withdrawing from an event). Portaled, mobile-first.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ConsentConfirmDialog({
  isOpen,
  title,
  message,
  checkboxLabel,
  confirmLabel,
  tone = "danger",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  checkboxLabel: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (isOpen) setAgreed(false);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const confirmBtn =
    tone === "danger"
      ? "bg-red-500/20 text-red-100 ring-red-400/30 hover:bg-red-500/30"
      : "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30 hover:bg-emerald-500/30";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-white/10 shadow-2xl">
        <h3 className="text-lg font-extrabold text-zinc-100">{title}</h3>
        <div className="mt-2 text-sm text-zinc-400">{message}</div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-black/30 p-3.5 ring-1 ring-white/10 transition hover:bg-black/40">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-emerald-500"
          />
          <span className="text-sm font-semibold text-zinc-200">{checkboxLabel}</span>
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
            onClick={onConfirm}
            disabled={!agreed || busy}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmBtn}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
