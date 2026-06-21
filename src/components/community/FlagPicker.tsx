// A collapsible, searchable country flag picker. Collapsed it shows just the
// current selection; clicking opens the searchable list, and picking a country
// closes it again — so it never bloats the form. Pure control (parent owns the
// value, an ISO code). Mobile-first.

"use client";

import { useState } from "react";
import { COUNTRIES, randomCountryCode, searchCountries } from "@/lib/flags";
import Flag from "@/components/community/Flag";

export default function FlagPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (code: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = value ? COUNTRIES.find((c) => c.code === value) ?? null : null;
  const results = searchCountries(query).slice(0, 80);

  const pick = (code: string | null) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-300">Country flag</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(randomCountryCode())}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25 active:scale-[0.98]"
          >
            🎲 Random
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Collapsed header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2.5 ring-1 ring-white/10 transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? (
            <>
              <Flag code={selected.code} className="h-5 w-auto" />
              <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">
                {selected.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-zinc-500">Choose a country…</span>
          )}
        </span>
        <span aria-hidden className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a country…"
            autoFocus
            className="w-full min-w-0 rounded-xl bg-black/40 px-4 py-2.5 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
          <ul className="mt-2 grid max-h-44 grid-cols-1 gap-1 overflow-y-auto rounded-xl bg-black/20 p-1.5 ring-1 ring-white/10 xs:grid-cols-2 [scrollbar-width:thin]">
            {results.map((c) => {
              const active = c.code === value;
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => pick(c.code)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                      active
                        ? "bg-emerald-500/15 font-semibold text-emerald-100 ring-1 ring-emerald-400/25"
                        : "text-zinc-200 hover:bg-white/10"
                    }`}
                  >
                    <Flag code={c.code} className="h-4 w-auto" />
                    <span className="min-w-0 truncate">{c.name}</span>
                  </button>
                </li>
              );
            })}
            {results.length === 0 && (
              <li className="col-span-full px-2 py-3 text-center text-xs text-zinc-500">
                No country matches “{query}”.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
