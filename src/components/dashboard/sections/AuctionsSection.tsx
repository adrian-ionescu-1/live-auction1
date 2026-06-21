// The bidder's Auctions section: enter the live auction once it opens, or see a
// countdown to a scheduled one. Mobile-first.

"use client";

import { AuctionEvent } from "@/types/event.types";

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (d || h) parts.push(`${h}h`);
  parts.push(`${pad(m)}m`, `${pad(s)}s`);
  return parts.join(" ");
}

function formatOpensAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuctionsSection({
  liveEvent,
  nowMs,
  entering,
  enterError,
  onEnter,
}: {
  liveEvent: AuctionEvent | null;
  nowMs: number;
  entering: boolean;
  enterError: string | null;
  onEnter: () => void;
}) {
  const opensAtMs = liveEvent?.opensAt ? new Date(liveEvent.opensAt).getTime() : null;
  const isLive = liveEvent?.status === "live";
  const scheduled = isLive && opensAtMs !== null && opensAtMs > nowMs;
  const openNow = isLive && !scheduled;

  if (scheduled && liveEvent) {
    return (
      <div className="rounded-3xl bg-amber-400/10 p-6 ring-1 ring-amber-400/25">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-amber-200/80">Upcoming auction</p>
          <p className="text-lg font-extrabold text-amber-100">{liveEvent.name}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-amber-200/70">Opens in</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-amber-100 sm:text-4xl">
            {formatCountdown(opensAtMs! - nowMs)}
          </p>
          <p className="mt-2 text-xs text-amber-200/80">
            Opens {formatOpensAt(liveEvent.opensAt!)} — the enter button appears here automatically.
          </p>
        </div>
      </div>
    );
  }

  if (openNow && liveEvent) {
    return (
      <div className="rounded-3xl bg-emerald-400/10 p-6 ring-1 ring-emerald-400/25">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-emerald-200/80">Live auction</p>
            <p className="truncate text-lg font-extrabold text-emerald-100">{liveEvent.name}</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Take {liveEvent.playerLimit} players · budget $
              {liveEvent.totalReserve.toLocaleString()} (reserve applied automatically).
            </p>
          </div>
          <button
            type="button"
            onClick={onEnter}
            disabled={entering}
            className="w-full shrink-0 rounded-2xl bg-emerald-500/20 px-6 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-60 sm:w-auto"
          >
            {entering ? "Joining…" : `Enter ${liveEvent.name} →`}
          </button>
        </div>
        {enterError && (
          <p className="mt-3 text-center text-xs font-semibold text-red-200">{enterError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <p className="text-center text-sm font-semibold text-zinc-200">You&apos;re approved to bid.</p>
      <p className="mt-1 text-center text-xs text-zinc-500">
        {liveEvent && liveEvent.status === "finished"
          ? `“${liveEvent.name}” has closed. See the Results tab. The next auction appears here when the admin opens one.`
          : "There's no live auction yet. The button to enter the room will appear here as soon as the admin opens one."}
      </p>
    </div>
  );
}
