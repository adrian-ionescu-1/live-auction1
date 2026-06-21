// A collapsible gallery picker for the 10 player-card designs. Collapsed it shows
// just the chosen design's name; clicking opens the gallery (each design rendered
// with the participant's own name / flag / stats), and picking one closes it —
// so it never bloats the form. "Random" lets the system choose. Mobile-first.

"use client";

import { useState } from "react";
import CardArt, {
  CARD_VARIANTS,
  getCardVariant,
  randomVariantId,
} from "@/components/auction/cardDesigns";

export interface CardPreviewData {
  name: string;
  flag: string | null;
  winrate: number | null;
  battles: number | null;
  avgDamage: number | null;
  hasStats: boolean;
}

const SAMPLE: CardPreviewData = {
  name: "Your name",
  flag: null,
  winrate: 64.5,
  battles: 18500,
  avgDamage: 1980,
  hasStats: true,
};

export default function CardPicker({
  value,
  onChange,
  preview,
}: {
  value: string | null;
  onChange: (variantId: string) => void;
  /** Render the designs with the participant's real data (name/flag/stats). */
  preview?: Partial<CardPreviewData>;
}) {
  const [open, setOpen] = useState(false);
  const data: CardPreviewData = { ...SAMPLE, ...preview };
  const current = getCardVariant(value);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-zinc-300">Card design</span>
        <button
          type="button"
          onClick={() => onChange(randomVariantId())}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-200 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25 active:scale-[0.98]"
        >
          🎲 Random card
        </button>
      </div>

      {/* Collapsed header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-black/30 px-3 py-2.5 ring-1 ring-white/10 transition hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden>🎴</span>
          <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">
            {current.name}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
          {open ? "Done" : "Change"}
          <span aria-hidden className={`transition ${open ? "rotate-180" : ""}`}>▾</span>
        </span>
      </button>

      {open && (
        <div className="mt-2 grid max-h-[24rem] grid-cols-1 gap-3 overflow-y-auto rounded-2xl bg-black/20 p-3 ring-1 ring-white/10 xs:grid-cols-2 [scrollbar-width:thin]">
          {CARD_VARIANTS.map((v) => {
            const selected = value === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => pick(v.id)}
                aria-pressed={selected}
                className={`group relative block rounded-3xl text-left transition focus-visible:outline-none ${
                  selected
                    ? "ring-2 ring-emerald-400/80"
                    : "ring-1 ring-transparent hover:ring-white/15"
                }`}
              >
                {/* Show only the design's artwork in the gallery (the data panel
                    is hidden) — the name/stats look cramped here, and the real
                    filled card is shown on the profile after registering. */}
                <div className="[&>div>*:last-child]:hidden">
                  <CardArt
                    variant={v.id}
                    name={data.name}
                    flag={data.flag}
                    winrate={data.hasStats ? data.winrate : null}
                    battles={data.hasStats ? data.battles : null}
                    avgDamage={data.hasStats ? data.avgDamage : null}
                    startingBid={null}
                    hasStats={data.hasStats}
                  />
                </div>
                <span
                  className={`pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                    selected
                      ? "bg-emerald-500/90 text-white ring-emerald-300"
                      : "bg-black/55 text-zinc-200 ring-white/15"
                  }`}
                >
                  {selected ? "✓ Selected" : v.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
