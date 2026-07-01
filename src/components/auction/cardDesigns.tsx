// The player-card design system: 10 distinct, premium, mobile-first card skins a
// participant (or the admin) can pick. Each design takes the same normalized
// props and renders a self-contained card sized `w-full max-w-md`, so they're
// interchangeable anywhere a player card is shown (auction room, stream room,
// profile, the picker gallery).
//
// 5 designs are military / tank themed (the WoT Blitz vibe, modernized) and 5
// are abstract premium styles. Stats are optional — a participant added without
// Wargaming validation still gets a great-looking card (name + flag + design).

import type { ReactNode, ReactElement } from "react";
import Flag from "@/components/community/Flag";

export interface CardDesignProps {
  name: string;
  /** ISO country code, or null for no flag. */
  flag: string | null;
  /** Win rate %, or null when the participant has no validated stats. */
  winrate: number | null;
  battles: number | null;
  avgDamage: number | null;
  /** Opening bid to show, or null to hide the price row (e.g. in previews). */
  startingBid: number | null;
  hasStats: boolean;
  /**
   * Free-form fields from a manual import (label + value), shown in the detail
   * grid when the player has no validated WG stats. Ordered by the admin.
   */
  customFields?: { label: string; value: string }[];
}

// ── Shared primitives ────────────────────────────────────────────────────────

function fmtWinrate(w: number | null): string {
  return w == null ? "—" : `${w.toFixed(1)}%`;
}
function fmtNum(n: number | null): string {
  return n == null ? "—" : Math.round(n).toLocaleString();
}

function FlagChip({ flag, className = "h-5 w-auto" }: { flag: string | null; className?: string }) {
  return <Flag code={flag} className={`shrink-0 ${className}`} />;
}

type StatItem = { label: string; value: string };

// The detail cells a card shows: validated WG stats when present, otherwise the
// player's manual custom fields (label + value, in the admin's order). Empty
// when the player has neither, so the design hides the grid entirely.
function detailItems(p: CardDesignProps): StatItem[] {
  if (p.hasStats) {
    return [
      { label: "Battles", value: fmtNum(p.battles) },
      { label: "Win %", value: fmtWinrate(p.winrate) },
      { label: "Avg dmg", value: fmtNum(p.avgDamage) },
    ];
  }
  return (p.customFields ?? [])
    .filter((f) => f.label.trim() !== "")
    .map((f) => ({ label: f.label.trim(), value: f.value.trim() || "—" }));
}

// A reusable detail grid; designs pass their own surface/value styling. Columns
// adapt so 3 stats keep the classic 3-up look while longer custom-field lists
// stay readable down to 320px (2 columns on the smallest screens).
function StatGrid({
  items,
  cellClass,
  labelClass,
  valueClass,
}: {
  items: StatItem[];
  cellClass: string;
  labelClass: string;
  valueClass: string;
}) {
  const cols = items.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3";
  return (
    <div className={`grid ${cols} gap-2 sm:gap-2.5`}>
      {items.map((s, i) => (
        <div key={`${s.label}-${i}`} className={`min-w-0 ${cellClass}`}>
          <p className={`truncate ${labelClass}`} title={s.label}>
            {s.label}
          </p>
          <p className={`truncate tabular-nums ${valueClass}`} title={s.value}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PriceRow({
  amount,
  className,
  labelClass,
  valueClass,
}: {
  amount: number | null;
  className: string;
  labelClass: string;
  valueClass: string;
}) {
  if (amount == null) return null;
  return (
    <div className={className}>
      <span className={labelClass}>Starting Bid</span>
      <span className={`tabular-nums ${valueClass}`}>${amount.toLocaleString()}</span>
    </div>
  );
}

// A modern, angular tank silhouette used by the military designs. Colour comes
// from the parent via currentColor + the className.
function TankGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 120"
      className={`drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* tracks */}
      <rect x="14" y="86" width="160" height="20" rx="10" fill="currentColor" opacity="0.55" />
      <circle cx="34" cy="96" r="11" fill="currentColor" />
      <circle cx="70" cy="98" r="9" fill="currentColor" />
      <circle cx="106" cy="98" r="9" fill="currentColor" />
      <circle cx="142" cy="96" r="11" fill="currentColor" />
      {/* hull (angular) */}
      <path
        d="M20 86 L34 58 L150 58 L172 70 L172 86 Z"
        fill="currentColor"
      />
      {/* turret */}
      <path d="M64 58 L78 38 L132 38 L146 58 Z" fill="currentColor" />
      {/* barrel */}
      <rect x="138" y="44" width="74" height="7" rx="3.5" fill="currentColor" />
      <rect x="206" y="42" width="6" height="11" rx="2" fill="currentColor" />
    </svg>
  );
}

// A second, distinct tank silhouette for the non-military designs: sleeker and
// lower — sloped glacis, five road wheels, a low rounded turret with a long
// barrel — so they read as tanks too, but clearly different from TankGlyph.
function TankGlyph2({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 120"
      className={`drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)] ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* track band — overhangs the front wheel as much as the rear one */}
      <rect x="18" y="86" width="152" height="16" rx="8" fill="currentColor" opacity="0.5" />
      {/* road wheels (incl. the front drive wheel under the sloped nose) */}
      {[34, 58, 82, 106, 130, 154].map((cx) => (
        <circle key={cx} cx={cx} cy="94" r="8" fill="currentColor" />
      ))}
      {/* sloped hull */}
      <path d="M22 86 L42 62 L150 62 L170 76 L170 86 Z" fill="currentColor" />
      {/* low rounded turret */}
      <path d="M68 62 Q86 42 116 46 L142 50 L152 62 Z" fill="currentColor" />
      {/* commander cupola */}
      <circle cx="96" cy="48" r="5" fill="currentColor" opacity="0.85" />
      {/* long barrel + muzzle brake */}
      <rect x="148" y="50" width="64" height="6" rx="3" fill="currentColor" />
      <rect x="206" y="47" width="8" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

// Shared outer frame so every design has identical footprint + hover lift.
function Frame({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`group relative w-full max-w-md animate-fade-up overflow-hidden rounded-3xl ring-1 transition duration-300 hover:-translate-y-1 ${className}`}
    >
      {children}
    </div>
  );
}

// The name + flag header, shared across designs (styling passed in).
function NameRow({
  name,
  flag,
  nameClass,
  flagClass = "h-5 w-auto",
}: {
  name: string;
  flag: string | null;
  nameClass: string;
  flagClass?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <FlagChip flag={flag} className={flagClass} />
      <h2 className={`min-w-0 truncate ${nameClass}`}>{name}</h2>
    </div>
  );
}

// ── 1. Desert Ops (military) ─────────────────────────────────────────────────
function DesertOps(p: CardDesignProps) {
  return (
    <Frame className="bg-gradient-to-br from-amber-900/50 via-yellow-950 to-zinc-950 ring-amber-500/25 shadow-[0_0_50px_rgba(217,160,60,0.18)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60">
        {/* desert camo blobs */}
        <span className="absolute left-6 top-6 h-20 w-24 rounded-full bg-amber-700/40 blur-2xl" />
        <span className="absolute right-8 top-12 h-16 w-20 rounded-full bg-yellow-600/30 blur-2xl" />
        <span className="absolute bottom-4 left-1/3 h-16 w-28 rounded-full bg-orange-800/40 blur-2xl" />
        {/* HUD corner brackets */}
        <span className="absolute left-3 top-3 h-6 w-6 border-l-2 border-t-2 border-amber-300/60" />
        <span className="absolute right-3 top-3 h-6 w-6 border-r-2 border-t-2 border-amber-300/60" />
        <TankGlyph className="relative h-32 w-56 animate-float text-amber-300/90" />
        <span className="absolute left-4 top-4 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 ring-1 ring-amber-400/30">
          Desert Ops
        </span>
      </div>
      <div className="bg-black/40 p-5 backdrop-blur-sm">
        <NameRow name={p.name} flag={p.flag} nameClass="text-2xl font-extrabold text-amber-50" />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-amber-500/10 p-2.5 text-center ring-1 ring-amber-400/20"
              labelClass="text-[10px] uppercase tracking-wide text-amber-200/70"
              valueClass="text-lg font-extrabold text-amber-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500/25 to-yellow-500/15 p-3.5 ring-1 ring-amber-400/25"
          labelClass="text-xs font-black uppercase tracking-wide text-amber-200"
          valueClass="text-2xl font-black text-amber-50"
        />
      </div>
    </Frame>
  );
}

// ── 2. Winter Camo (military) ────────────────────────────────────────────────
function WinterCamo(p: CardDesignProps) {
  return (
    <Frame className="bg-gradient-to-br from-slate-700/50 via-slate-900 to-zinc-950 ring-cyan-300/25 shadow-[0_0_50px_rgba(125,211,252,0.16)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(226,232,240,0.18),transparent_45%),radial-gradient(circle_at_75%_60%,rgba(186,230,253,0.16),transparent_40%)]" />
        {/* snow specks */}
        {[
          "left-8 top-8",
          "left-1/2 top-5",
          "right-10 top-14",
          "left-16 bottom-10",
          "right-1/3 bottom-6",
        ].map((pos, i) => (
          <span key={i} className={`absolute h-1.5 w-1.5 rounded-full bg-white/60 ${pos}`} />
        ))}
        <TankGlyph className="relative h-32 w-56 animate-float text-slate-200/90" />
        <span className="absolute left-4 top-4 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100 ring-1 ring-cyan-300/30">
          Winter Camo
        </span>
      </div>
      <div className="bg-slate-950/60 p-5 backdrop-blur-sm">
        <NameRow name={p.name} flag={p.flag} nameClass="text-2xl font-extrabold text-slate-50" />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-white/5 p-2.5 text-center ring-1 ring-cyan-300/15"
              labelClass="text-[10px] uppercase tracking-wide text-slate-400"
              valueClass="text-lg font-extrabold text-cyan-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-cyan-400/20 to-sky-400/10 p-3.5 ring-1 ring-cyan-300/25"
          labelClass="text-xs font-black uppercase tracking-wide text-cyan-100"
          valueClass="text-2xl font-black text-white"
        />
      </div>
    </Frame>
  );
}

// ── 3. Urban Hex (military) ──────────────────────────────────────────────────
function UrbanHex(p: CardDesignProps) {
  return (
    <Frame className="bg-gradient-to-br from-zinc-700/40 via-zinc-900 to-black ring-emerald-400/25 shadow-[0_0_50px_rgba(16,185,129,0.14)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60">
        {/* hex grid overlay */}
        <span
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(16,185,129,0.6) 1px, transparent 1.4px)",
            backgroundSize: "18px 18px",
          }}
        />
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
        <TankGlyph className="relative h-32 w-56 animate-float text-emerald-300/90" />
        <span className="absolute left-4 top-4 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200 ring-1 ring-emerald-400/30">
          Urban Hex
        </span>
      </div>
      <div className="bg-black/50 p-5 backdrop-blur-sm">
        <NameRow name={p.name} flag={p.flag} nameClass="text-2xl font-extrabold text-zinc-50" />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-emerald-500/10 p-2.5 text-center ring-1 ring-emerald-400/20"
              labelClass="text-[10px] uppercase tracking-wide text-emerald-200/70"
              valueClass="text-lg font-extrabold text-emerald-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-500/15 p-3.5 ring-1 ring-emerald-400/25"
          labelClass="text-xs font-black uppercase tracking-wide text-emerald-200"
          valueClass="text-2xl font-black text-emerald-50"
        />
      </div>
    </Frame>
  );
}

// ── 4. Forest Recon (military) ───────────────────────────────────────────────
function ForestRecon(p: CardDesignProps) {
  return (
    <Frame className="bg-gradient-to-br from-green-900/55 via-[#10210f] to-zinc-950 ring-lime-500/25 shadow-[0_0_50px_rgba(132,204,22,0.14)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60">
        <span className="absolute left-4 top-8 h-24 w-28 rounded-[40%] bg-green-700/40 blur-2xl" />
        <span className="absolute right-6 bottom-6 h-20 w-24 rounded-[45%] bg-lime-800/40 blur-2xl" />
        <span className="absolute right-10 top-6 h-16 w-16 rounded-[50%] bg-emerald-900/50 blur-2xl" />
        <TankGlyph className="relative h-32 w-56 animate-float text-lime-300/90" />
        <span className="absolute left-4 top-4 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] text-lime-200 ring-1 ring-lime-400/30">
          Recon
        </span>
      </div>
      <div className="bg-black/45 p-5 backdrop-blur-sm">
        <NameRow name={p.name} flag={p.flag} nameClass="text-2xl font-extrabold text-lime-50" />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-lime-500/10 p-2.5 text-center ring-1 ring-lime-400/20"
              labelClass="text-[10px] uppercase tracking-wide text-lime-200/70"
              valueClass="text-lg font-extrabold text-lime-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-lime-500/20 to-green-500/10 p-3.5 ring-1 ring-lime-400/25"
          labelClass="text-xs font-black uppercase tracking-wide text-lime-200"
          valueClass="text-2xl font-black text-lime-50"
        />
      </div>
    </Frame>
  );
}

// ── 5. Steel Commander (military) ────────────────────────────────────────────
function SteelCommander(p: CardDesignProps) {
  const rivets = ["left-4 top-4", "right-4 top-4", "left-4 bottom-4", "right-4 bottom-4"];
  return (
    <Frame className="bg-gradient-to-br from-zinc-600/40 via-zinc-800 to-zinc-950 ring-red-500/25 shadow-[0_0_50px_rgba(239,68,68,0.16)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_40%)]">
        {rivets.map((pos, i) => (
          <span
            key={i}
            className={`absolute h-2.5 w-2.5 rounded-full bg-zinc-400/40 ring-1 ring-white/20 ${pos}`}
          />
        ))}
        <span className="absolute inset-x-10 top-1/2 h-px bg-red-500/40" />
        <TankGlyph className="relative h-32 w-56 animate-float text-zinc-200" />
        <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] text-red-200 ring-1 ring-red-400/30">
          Steel Commander
        </span>
      </div>
      <div className="bg-zinc-950/70 p-5 backdrop-blur-sm">
        <NameRow name={p.name} flag={p.flag} nameClass="text-2xl font-extrabold text-zinc-50" />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-white/5 p-2.5 text-center ring-1 ring-white/10"
              labelClass="text-[10px] uppercase tracking-wide text-zinc-500"
              valueClass="text-lg font-extrabold text-zinc-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-red-500/20 to-rose-500/10 p-3.5 ring-1 ring-red-400/25"
          labelClass="text-xs font-black uppercase tracking-wide text-red-200"
          valueClass="text-2xl font-black text-zinc-50"
        />
      </div>
    </Frame>
  );
}

// ── 6. Neon Grid (abstract) ──────────────────────────────────────────────────
function NeonGrid(p: CardDesignProps) {
  return (
    <Frame className="bg-zinc-950 ring-violet-400/30 shadow-[0_0_60px_rgba(139,92,246,0.22)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60">
        <span
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(139,92,246,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.35) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(circle at 50% 45%, black 30%, transparent 75%)",
          }}
        />
        <span className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/25 blur-3xl" />
        <TankGlyph2 className="relative h-32 w-56 animate-float text-violet-300/90" />
        <span className="absolute left-4 top-4 rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200 ring-1 ring-violet-400/30">
          Neon
        </span>
      </div>
      <div className="bg-black/60 p-5 backdrop-blur-sm">
        <NameRow
          name={p.name}
          flag={p.flag}
          nameClass="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-2xl font-extrabold text-transparent"
        />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-violet-500/10 p-2.5 text-center ring-1 ring-violet-400/25"
              labelClass="text-[10px] uppercase tracking-wide text-violet-200/70"
              valueClass="text-lg font-extrabold text-violet-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-500/25 to-cyan-500/15 p-3.5 ring-1 ring-violet-400/30"
          labelClass="text-xs font-black uppercase tracking-wide text-violet-100"
          valueClass="text-2xl font-black text-white"
        />
      </div>
    </Frame>
  );
}

// ── 7. Gold Elite (abstract) ─────────────────────────────────────────────────
function GoldElite(p: CardDesignProps) {
  return (
    <Frame className="bg-gradient-to-br from-yellow-900/30 via-black to-black ring-yellow-400/40 shadow-[0_0_60px_rgba(234,179,8,0.2)]">
      <div className="relative flex h-52 items-center justify-center overflow-hidden sm:h-60">
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-yellow-200/25 to-transparent animate-sheen" />
        <span className="absolute inset-4 rounded-2xl border border-yellow-400/30" />
        <TankGlyph2 className="relative h-32 w-56 animate-float text-yellow-200/90" />
        <span className="absolute left-4 top-4 rounded-md bg-yellow-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-200 ring-1 ring-yellow-400/30">
          Elite
        </span>
      </div>
      <div className="bg-black/70 p-5">
        <NameRow
          name={p.name}
          flag={p.flag}
          nameClass="bg-gradient-to-r from-yellow-100 via-amber-200 to-yellow-300 bg-clip-text text-2xl font-extrabold text-transparent"
        />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-yellow-500/10 p-2.5 text-center ring-1 ring-yellow-400/25"
              labelClass="text-[10px] uppercase tracking-wide text-yellow-200/70"
              valueClass="text-lg font-extrabold text-yellow-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-yellow-500/25 to-amber-500/10 p-3.5 ring-1 ring-yellow-400/30"
          labelClass="text-xs font-black uppercase tracking-wide text-yellow-200"
          valueClass="text-2xl font-black text-yellow-50"
        />
      </div>
    </Frame>
  );
}

// ── 8. Holo Prism (abstract) ─────────────────────────────────────────────────
function HoloPrism(p: CardDesignProps) {
  return (
    <Frame className="bg-zinc-950 ring-white/20 shadow-[0_0_60px_rgba(255,255,255,0.1)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60">
        <span className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/30 via-cyan-400/25 to-emerald-400/30 bg-[length:200%_200%] animate-gradient-pan" />
        <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
        <TankGlyph2 className="relative h-32 w-56 animate-float text-white" />
        <span className="absolute left-4 top-4 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] text-white/90 ring-1 ring-white/20">
          Holo
        </span>
      </div>
      <div className="bg-black/60 p-5 backdrop-blur-sm">
        <NameRow name={p.name} flag={p.flag} nameClass="text-2xl font-extrabold text-white" />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-white/10 p-2.5 text-center ring-1 ring-white/15"
              labelClass="text-[10px] uppercase tracking-wide text-white/60"
              valueClass="text-lg font-extrabold text-white"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-fuchsia-500/25 via-cyan-500/20 to-emerald-500/20 p-3.5 ring-1 ring-white/25"
          labelClass="text-xs font-black uppercase tracking-wide text-white/90"
          valueClass="text-2xl font-black text-white"
        />
      </div>
    </Frame>
  );
}

// ── 9. Minimal Glass (abstract) ──────────────────────────────────────────────
function MinimalGlass(p: CardDesignProps) {
  return (
    <Frame className="bg-white/[0.04] ring-white/15 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
      <div className="relative flex h-52 items-center justify-center sm:h-60">
        <span className="absolute right-8 top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <TankGlyph2 className="relative h-32 w-56 animate-float text-zinc-200" />
        <span className="absolute left-4 top-4 rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 ring-1 ring-white/15">
          Minimal
        </span>
      </div>
      <div className="border-t border-white/10 p-5">
        <NameRow name={p.name} flag={p.flag} nameClass="text-2xl font-bold tracking-tight text-zinc-50" />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-white/[0.04] p-2.5 text-center ring-1 ring-white/10"
              labelClass="text-[10px] uppercase tracking-wide text-zinc-500"
              valueClass="text-lg font-bold text-zinc-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/12"
          labelClass="text-xs font-bold uppercase tracking-wide text-zinc-400"
          valueClass="text-2xl font-extrabold text-zinc-50"
        />
      </div>
    </Frame>
  );
}

// ── 10. Crimson Aurora (abstract) ────────────────────────────────────────────
function CrimsonAurora(p: CardDesignProps) {
  return (
    <Frame className="bg-zinc-950 ring-red-400/30 shadow-[0_0_60px_rgba(244,63,94,0.2)]">
      <div className="relative flex h-52 items-center justify-center overflow-hidden sm:h-60">
        <span className="absolute left-1/2 top-2 h-40 w-72 -translate-x-1/2 rounded-[50%] bg-red-600/30 blur-3xl animate-aurora" />
        <span className="absolute left-1/3 bottom-0 h-32 w-56 rounded-[50%] bg-orange-500/25 blur-3xl animate-aurora [animation-delay:-6s]" />
        <TankGlyph2 className="relative h-32 w-56 animate-float text-red-200/90" />
        <span className="absolute left-4 top-4 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-red-200 ring-1 ring-red-400/30">
          Aurora
        </span>
      </div>
      <div className="bg-black/60 p-5 backdrop-blur-sm">
        <NameRow
          name={p.name}
          flag={p.flag}
          nameClass="bg-gradient-to-r from-red-200 via-rose-200 to-orange-200 bg-clip-text text-2xl font-extrabold text-transparent"
        />
        {detailItems(p).length > 0 && (
          <div className="mt-4">
            <StatGrid
              items={detailItems(p)}
              cellClass="rounded-xl bg-red-500/10 p-2.5 text-center ring-1 ring-red-400/25"
              labelClass="text-[10px] uppercase tracking-wide text-red-200/70"
              valueClass="text-lg font-extrabold text-red-100"
            />
          </div>
        )}
        <PriceRow
          amount={p.startingBid}
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-red-500/25 to-orange-500/15 p-3.5 ring-1 ring-red-400/30"
          labelClass="text-xs font-black uppercase tracking-wide text-red-200"
          valueClass="text-2xl font-black text-red-50"
        />
      </div>
    </Frame>
  );
}

// ── Registry ─────────────────────────────────────────────────────────────────

export type CardCategory = "military" | "abstract";

export interface CardVariant {
  id: string;
  name: string;
  category: CardCategory;
  Component: (props: CardDesignProps) => ReactElement;
}

export const CARD_VARIANTS: CardVariant[] = [
  { id: "desert-ops", name: "Desert Ops", category: "military", Component: DesertOps },
  { id: "winter-camo", name: "Winter Camo", category: "military", Component: WinterCamo },
  { id: "urban-hex", name: "Urban Hex", category: "military", Component: UrbanHex },
  { id: "forest-recon", name: "Forest Recon", category: "military", Component: ForestRecon },
  { id: "steel-commander", name: "Steel Commander", category: "military", Component: SteelCommander },
  { id: "neon-grid", name: "Neon Grid", category: "abstract", Component: NeonGrid },
  { id: "gold-elite", name: "Gold Elite", category: "abstract", Component: GoldElite },
  { id: "holo-prism", name: "Holo Prism", category: "abstract", Component: HoloPrism },
  { id: "minimal-glass", name: "Minimal Glass", category: "abstract", Component: MinimalGlass },
  { id: "crimson-aurora", name: "Crimson Aurora", category: "abstract", Component: CrimsonAurora },
];

export const VARIANT_IDS = CARD_VARIANTS.map((v) => v.id);
export const DEFAULT_VARIANT = "desert-ops";

const VARIANT_BY_ID = new Map(CARD_VARIANTS.map((v) => [v.id, v]));

/** Resolve a variant id to its definition, falling back to the default. */
export function getCardVariant(id: string | null | undefined): CardVariant {
  return (id && VARIANT_BY_ID.get(id)) || VARIANT_BY_ID.get(DEFAULT_VARIANT)!;
}

/** A random variant id, used by the "Random card" affordance + imports. */
export function randomVariantId(): string {
  return VARIANT_IDS[Math.floor(Math.random() * VARIANT_IDS.length)];
}

/** Render the chosen card design with the given data. */
export default function CardArt({
  variant,
  ...props
}: CardDesignProps & { variant: string | null | undefined }) {
  const { Component } = getCardVariant(variant);
  return <Component {...props} />;
}
