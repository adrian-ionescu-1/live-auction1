// A lightweight single-step confirm dialog ("are you sure?") for admin actions
// that need a deliberate yes but not the heavy type-the-name guard. Portaled to
// <body> and centred with a high z-index, so no transformed ancestor can push it
// off-centre or under the navbar.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  tone = "danger",
  isOpen,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  isOpen: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  const confirmBtn =
    tone === "danger"
      ? "bg-red-500/20 text-red-100 ring-red-400/30 hover:bg-red-500/30"
      : "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30 hover:bg-emerald-500/30";

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
          <div className="mt-2 text-sm text-zinc-400">{description}</div>

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
              disabled={busy}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmBtn}`}
            >
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
