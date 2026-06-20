// A confirm dialog that only enables its action once the admin types the exact
// event name. Used for destructive / high-impact actions (delete, reopen) so a
// live event is never changed by accident.

"use client";

import { useEffect, useState } from "react";

export default function ConfirmByNameDialog({
  eventName,
  title,
  description,
  confirmLabel,
  tone = "danger",
  isOpen,
  busy,
  onConfirm,
  onCancel,
}: {
  eventName: string;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  isOpen: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (isOpen) setTyped("");
  }, [isOpen, eventName]);

  if (!isOpen) return null;

  const matches = typed.trim() === eventName.trim();
  const ring = tone === "danger" ? "focus:ring-red-400/40" : "focus:ring-emerald-400/40";
  const confirmBtn =
    tone === "danger"
      ? "bg-red-500/20 text-red-100 ring-red-400/30 hover:bg-red-500/30"
      : "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30 hover:bg-emerald-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-white/10">
        <h3 className="text-lg font-extrabold text-zinc-100">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>

        <label className="mt-4 block">
          <span className="block text-xs font-semibold text-zinc-400">
            Type the event name to confirm
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={eventName}
            autoFocus
            className={`mt-2 w-full rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 ${ring}`}
          />
        </label>

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
            disabled={!matches || busy}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${confirmBtn}`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
