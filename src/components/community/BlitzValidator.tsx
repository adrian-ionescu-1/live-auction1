// Validate a real WoT Blitz account: type an in-game name, search the Wargaming
// API (via our server route), pick the matching account, and confirm its career
// stats (battles, win rate, average damage). Returns the validated player to the
// parent. Mobile-first.

"use client";

import { useEffect, useRef, useState } from "react";
import { BlitzRegion, BlitzStats } from "@/types/community-event.types";
import { BlitzAccount, BlitzClient } from "@/services/blitzClient";

export interface ValidatedPlayer {
  accountId: number;
  playerName: string;
  stats: BlitzStats;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-black/30 px-3 py-2 text-center ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="truncate text-sm font-extrabold tabular-nums text-emerald-200">{value}</div>
    </div>
  );
}

export default function BlitzValidator({
  region,
  value,
  onChange,
}: {
  region: BlitzRegion;
  value: ValidatedPlayer | null;
  onChange: (player: ValidatedPlayer | null) => void;
}) {
  const [name, setName] = useState("");
  const [results, setResults] = useState<BlitzAccount[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against a slow earlier request overwriting a newer one's results.
  const reqId = useRef(0);

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setSearched(false);
      setBusy(false);
      setError(null);
      return;
    }
    const id = ++reqId.current;
    setBusy(true);
    setError(null);
    setSearched(true);
    const res = await BlitzClient.search(region, trimmed);
    if (id !== reqId.current) return; // a newer keystroke superseded this one
    setBusy(false);
    if (res.error) {
      setError(res.error);
      setResults([]);
      return;
    }
    setResults(res.players);
  };

  // Live search: query the Wargaming API as the admin/member types (debounced),
  // so matching accounts appear without pressing a button. Below 3 characters
  // the list clears (the WG API needs at least 3).
  useEffect(() => {
    if (value) return; // already validated — nothing to search
    const handle = setTimeout(() => void runSearch(name), 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, region, value]);

  const pick = async (acc: BlitzAccount) => {
    setBusy(true);
    setError(null);
    const res = await BlitzClient.player(region, acc.accountId);
    setBusy(false);
    if (res.error || !res.player) {
      setError(res.error ?? "Could not load that player's stats.");
      return;
    }
    onChange({
      accountId: res.player.accountId,
      playerName: res.player.nickname,
      stats: {
        battles: res.player.battles,
        winrate: res.player.winrate,
        avgDamage: res.player.avgDamage,
      },
    });
    setResults([]);
  };

  // Already validated: show the confirmed account + a "change" affordance.
  if (value) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 p-3 ring-1 ring-emerald-400/25">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-extrabold text-emerald-100">
            ✓ {value.playerName}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setResults([]);
              setSearched(false);
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-zinc-300 ring-1 ring-white/15 transition hover:bg-white/10"
          >
            Change
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <StatPill label="Battles" value={value.stats.battles.toLocaleString()} />
          <StatPill label="Win rate" value={`${value.stats.winrate.toFixed(2)}%`} />
          <StatPill label="Avg dmg" value={value.stats.avgDamage.toLocaleString()} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Type the in-game name…"
          autoComplete="off"
          className="w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 pr-10 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
        />
        {busy && (
          <span
            aria-hidden
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-emerald-300/40 border-t-emerald-300"
          />
        )}
      </div>

      {name.trim().length > 0 && name.trim().length < 3 && (
        <p className="text-xs text-zinc-500">Type at least 3 characters to search.</p>
      )}

      {error && <p className="text-xs font-semibold text-amber-200">{error}</p>}

      {results.length > 0 && (
        <ul className="max-h-44 space-y-1 overflow-y-auto">
          {results.map((acc) => (
            <li key={acc.accountId}>
              <button
                type="button"
                onClick={() => pick(acc)}
                disabled={busy}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2 text-left text-sm text-zinc-100 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
              >
                <span className="min-w-0 truncate font-semibold">{acc.nickname}</span>
                <span aria-hidden className="shrink-0 text-xs text-emerald-300">
                  Select →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {searched && !busy && !error && results.length === 0 && (
        <p className="text-xs text-zinc-500">No accounts found for that name on this region.</p>
      )}
    </div>
  );
}
