// Link a WoT Blitz in-game account to the signed-in member: pick a region, type
// the in-game name (live search), select the account. We then pull the full
// career profile from the Wargaming API and cache it on the profile. Mobile-first.

"use client";

import { useEffect, useRef, useState } from "react";
import { BlitzRegion } from "@/types/community-event.types";
import { BlitzAccount, BlitzClient } from "@/services/blitzClient";
import { AccountService } from "@/services/accountService";

const REGIONS: { value: BlitzRegion; label: string }[] = [
  { value: "eu", label: "EU" },
  { value: "na", label: "NA" },
  { value: "asia", label: "ASIA" },
];

export default function BlitzAccountLinker({
  onLinked,
  onCancel,
}: {
  onLinked: () => void;
  /** Shown only when re-linking (there's already an account to go back to). */
  onCancel?: () => void;
}) {
  const [region, setRegion] = useState<"" | BlitzRegion>("");
  const [name, setName] = useState("");
  const [results, setResults] = useState<BlitzAccount[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const runSearch = async (reg: "" | BlitzRegion, query: string) => {
    const trimmed = query.trim();
    if (!reg || trimmed.length < 3) {
      setResults([]);
      setSearched(false);
      setBusy(false);
      return;
    }
    const id = ++reqId.current;
    setBusy(true);
    setError(null);
    setSearched(true);
    const res = await BlitzClient.search(reg, trimmed);
    if (id !== reqId.current) return;
    setBusy(false);
    if (res.error) {
      setError(res.error);
      setResults([]);
      return;
    }
    setResults(res.players);
  };

  // Live search as the member types (debounced), once a region is chosen.
  useEffect(() => {
    const handle = setTimeout(() => void runSearch(region, name), 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, region]);

  const pick = async (acc: BlitzAccount) => {
    if (!region) return;
    setLinking(true);
    setError(null);
    const res = await BlitzClient.account(region, acc.accountId);
    if (res.error || !res.details) {
      setError(res.error ?? "Could not load that account.");
      setLinking(false);
      return;
    }
    const saved = await AccountService.setMyBlitzAccount(res.details);
    setLinking(false);
    if (saved.success) {
      onLinked();
    } else {
      setError(saved.error ?? "Could not save your account.");
    }
  };

  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-zinc-100">Link your WoT Blitz account</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Pick your region and find your in-game name — we&apos;ll pull your stats straight from
            the game.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-300 ring-1 ring-white/15 transition hover:bg-white/10"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Region */}
      <div className="mt-5">
        <span className="block text-sm font-semibold text-zinc-300">Region</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {REGIONS.map((r) => {
            const active = region === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => {
                  setRegion(r.value);
                  setResults([]);
                  setSearched(false);
                }}
                className={`rounded-xl px-3 py-2.5 text-sm font-bold ring-1 transition ${
                  active
                    ? "bg-emerald-500/20 text-emerald-100 ring-emerald-400/40"
                    : "bg-black/30 text-zinc-300 ring-white/10 hover:bg-white/10"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="mt-5">
        <span className="block text-sm font-semibold text-zinc-300">In-game name</span>
        <div className="relative mt-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            disabled={!region || linking}
            placeholder={region ? "Type your in-game name…" : "Pick a region first"}
            autoComplete="off"
            className="w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 pr-10 text-zinc-100 ring-1 ring-white/10 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-50"
          />
          {busy && (
            <span
              aria-hidden
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-emerald-300/40 border-t-emerald-300"
            />
          )}
        </div>
        {region && name.trim().length > 0 && name.trim().length < 3 && (
          <p className="mt-1 text-xs text-zinc-500">Type at least 3 characters to search.</p>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-amber-200">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
          {results.map((acc) => (
            <li key={acc.accountId}>
              <button
                type="button"
                onClick={() => pick(acc)}
                disabled={linking}
                className="flex w-full items-center justify-between gap-2 rounded-xl bg-black/30 px-4 py-3 text-left text-sm text-zinc-100 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
              >
                <span className="min-w-0 truncate font-semibold">{acc.nickname}</span>
                <span aria-hidden className="shrink-0 text-xs font-bold text-emerald-300">
                  {linking ? "Linking…" : "Select →"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {region && searched && !busy && !error && results.length === 0 && (
        <p className="mt-3 text-xs text-zinc-500">
          No accounts found for that name on {region.toUpperCase()}.
        </p>
      )}
    </div>
  );
}
