// Final results for an event, grouped by member: which players each took and for
// how much, with per-member and grand totals. Includes one-click export to CSV,
// Excel and PDF.

"use client";

import { useMemo, useState } from "react";
import { EventResult } from "@/types/event.types";
import {
  exportResultsCsv,
  exportResultsXls,
  exportResultsPdf,
} from "@/lib/exportResults";

interface MemberGroup {
  username: string;
  players: EventResult[];
  total: number;
}

export default function EventResultsCard({
  eventName,
  results,
  loading,
}: {
  eventName: string;
  results: EventResult[];
  loading: boolean;
}) {
  const [pdfBusy, setPdfBusy] = useState(false);

  const groups = useMemo<MemberGroup[]>(() => {
    const map = new Map<string, MemberGroup>();
    for (const r of results) {
      const key = r.userId ?? r.username;
      const g = map.get(key) ?? { username: r.username, players: [], total: 0 };
      g.players.push(r);
      g.total += r.amount;
      map.set(key, g);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [results]);

  const grandTotal = results.reduce((s, r) => s + r.amount, 0);

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      await exportResultsPdf(eventName, results);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-zinc-100">Results</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {results.length} players · ${grandTotal.toLocaleString()} total spent
          </p>
        </div>
        {results.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportResultsCsv(eventName, results)}
              className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportResultsXls(eventName, results)}
              className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
            >
              Excel
            </button>
            <button
              type="button"
              onClick={handlePdf}
              disabled={pdfBusy}
              className="rounded-xl bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 ring-1 ring-cyan-400/25 transition hover:bg-cyan-500/25 disabled:opacity-60"
            >
              {pdfBusy ? "PDF…" : "PDF"}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl bg-black/25" />
      ) : results.length === 0 ? (
        <div className="rounded-2xl bg-black/25 p-6 text-center ring-1 ring-white/10">
          <p className="text-sm text-zinc-400">No results yet.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Players appear here as they&apos;re sold during the auction.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.username} className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="truncate text-sm font-bold text-zinc-100">{g.username}</span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-emerald-200">
                  ${g.total.toLocaleString()}
                </span>
              </div>
              <ul className="space-y-1">
                {g.players.map((p) => (
                  <li
                    key={p.playerId}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-1.5 text-sm"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate text-zinc-200">{p.playerName}</span>
                      {p.viaRandom && (
                        <span className="shrink-0 rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-200 ring-1 ring-fuchsia-400/25">
                          Random
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-400">
                      {p.viaRandom ? "Free" : `$${p.amount.toLocaleString()}`}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-right text-[11px] text-zinc-500">
                {g.players.length} player{g.players.length === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
