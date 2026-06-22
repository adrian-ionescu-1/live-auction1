// Pick an emoji symbol for a team. A compact grid; the chosen symbol shows in
// front of the team name everywhere. Pure control (parent owns the value).

"use client";

import { TEAM_SYMBOLS } from "@/lib/teamSymbols";

export default function SymbolPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (symbol: string | null) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-300">Team symbol</span>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-8 gap-1.5 rounded-2xl bg-black/25 p-2 ring-1 ring-white/10 xs:grid-cols-10">
        {TEAM_SYMBOLS.map((s) => {
          const active = s === value;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              aria-pressed={active}
              className={`grid aspect-square place-items-center rounded-lg text-lg transition ${
                active
                  ? "bg-emerald-500/25 ring-1 ring-emerald-400/40"
                  : "hover:bg-white/10"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
