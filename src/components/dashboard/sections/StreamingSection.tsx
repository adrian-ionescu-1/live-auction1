// The streamer's section: join the broadcast room once an auction opens, or see
// a countdown to a scheduled one. Watch-only — the streamer covers the draft on
// YouTube / Twitch / TikTok, they don't bid. Mobile-first.

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

export default function StreamingSection({
  liveEvent,
  nowMs,
  onJoin,
}: {
  liveEvent: AuctionEvent | null;
  nowMs: number;
  onJoin: () => void;
}) {
  const opensAtMs = liveEvent?.opensAt ? new Date(liveEvent.opensAt).getTime() : null;
  const isLive = liveEvent?.status === "live";
  const scheduled = isLive && opensAtMs !== null && opensAtMs > nowMs;
  const openNow = isLive && !scheduled;

  if (scheduled && liveEvent) {
    return (
      <div className="rounded-3xl bg-violet-400/10 p-6 ring-1 ring-violet-400/25">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-violet-200/80">Upcoming broadcast</p>
          <p className="text-lg font-extrabold text-violet-100">{liveEvent.name}</p>
          <p className="mt-3 text-xs uppercase tracking-wide text-violet-200/70">Opens in</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-violet-100 sm:text-4xl">
            {formatCountdown(opensAtMs! - nowMs)}
          </p>
          <p className="mt-2 text-xs text-violet-200/80">
            Opens {formatOpensAt(liveEvent.opensAt!)} — the button to go live appears here
            automatically.
          </p>
        </div>
      </div>
    );
  }

  if (openNow && liveEvent) {
    return (
      <div className="rounded-3xl bg-violet-400/10 p-6 ring-1 ring-violet-400/25 shadow-[0_0_60px_rgba(139,92,246,0.12)]">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-200 ring-1 ring-red-400/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> Live now
            </span>
            <p className="mt-1.5 truncate text-lg font-extrabold text-violet-100">
              {liveEvent.name}
            </p>
            <p className="mt-1 text-xs text-violet-200/80">
              Join the camera to broadcast the draft — player, timer, price and live bids,
              watch-only.
            </p>
          </div>
          <button
            type="button"
            onClick={onJoin}
            className="w-full shrink-0 rounded-2xl bg-violet-500/20 px-6 py-3 text-sm font-bold text-violet-100 ring-1 ring-violet-400/30 transition hover:bg-violet-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:w-auto"
          >
            Join the camera →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <p className="text-center text-sm font-semibold text-zinc-200">
        You&apos;re set up to go live. 🎥
      </p>
      <p className="mt-1 text-center text-xs text-zinc-500">
        {liveEvent && liveEvent.status === "finished"
          ? `“${liveEvent.name}” has closed. The button to join the camera reappears here when the admin opens the next auction.`
          : "There's no live auction yet. As soon as the admin opens one, the button to join the camera shows up here."}
      </p>
    </div>
  );
}
