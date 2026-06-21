// The bidder's Results section: players they took by bidding and any received
// through the random distribution, grouped per auction. Mobile-first.

"use client";

import { MyEventResults } from "@/types/event.types";

export default function ResultsSection({ results }: { results: MyEventResults[] }) {
  if (results.length === 0) {
    return (
      <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
        <p className="text-center text-sm font-semibold text-zinc-200">No results yet</p>
        <p className="mt-1 text-center text-xs text-zinc-500">
          Players you win in an auction — and any you receive in the random distribution — will
          appear here once an auction finishes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((ev) => {
        const won = ev.results.filter((r) => !r.viaRandom);
        const random = ev.results.filter((r) => r.viaRandom);
        const spent = won.reduce((s, r) => s + r.amount, 0);
        return (
          <div key={ev.eventId} className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-zinc-100">{ev.eventName}</span>
              <span className="flex items-center gap-2">
                {ev.status === "finished" && (
                  <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-400/25">
                    Closed
                  </span>
                )}
                <span className="text-xs text-zinc-400">
                  {ev.results.length} players · ${spent.toLocaleString()} spent
                </span>
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                  Won by bidding ({won.length})
                </p>
                {won.length === 0 ? (
                  <p className="text-xs text-zinc-500">None.</p>
                ) : (
                  <ul className="space-y-1">
                    {won.map((r) => (
                      <li
                        key={r.playerId}
                        className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-1.5 text-sm ring-1 ring-white/10"
                      >
                        <span className="min-w-0 flex-1 truncate text-zinc-200">{r.playerName}</span>
                        <span className="shrink-0 tabular-nums text-zinc-400">
                          ${r.amount.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fuchsia-200/80">
                  Received random ({random.length})
                </p>
                {random.length === 0 ? (
                  <p className="text-xs text-zinc-500">None.</p>
                ) : (
                  <ul className="space-y-1">
                    {random.map((r) => (
                      <li
                        key={r.playerId}
                        className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-1.5 text-sm ring-1 ring-white/10"
                      >
                        <span className="min-w-0 flex-1 truncate text-zinc-200">{r.playerName}</span>
                        <span className="shrink-0 text-xs font-semibold text-fuchsia-200">Free</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
