// Premium, organized view of a member's linked WoT Blitz account: an identity
// header plus career-stat cards (with bars for the rate-based ones). "Change
// account" lets them re-link if they mistyped or use an alt. Mobile-first.

"use client";

import { BlitzLink } from "@/types/account.types";

function fmtDate(unixSeconds: number | null): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatTile({
  label,
  value,
  accent = "text-zinc-100",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-extrabold tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}

// A stat shown as a value plus a horizontal progress bar (for percentages).
function BarStat({
  label,
  pct,
  display,
  from,
  to,
}: {
  label: string;
  /** 0–100 fill. */
  pct: number;
  display: string;
  from: string;
  to: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
        <span className="text-sm font-extrabold tabular-nums text-zinc-100">{display}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${from} ${to}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default function BlitzStatsCards({
  link,
  onChange,
}: {
  link: BlitzLink;
  onChange: () => void;
}) {
  const d = link.details;
  const initial = link.nickname.charAt(0).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Identity header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-fuchsia-500/10 p-6 ring-1 ring-white/10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-black/40 text-2xl font-extrabold text-emerald-200 ring-1 ring-emerald-400/30">
              {initial}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-extrabold text-zinc-100">{link.nickname}</h2>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-200 ring-1 ring-white/15">
                  {link.region}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-400">
                Account #{link.accountId.toLocaleString()}
                {d?.createdAt ? ` · since ${fmtDate(d.createdAt)}` : ""}
              </p>
              {d?.lastBattleTime ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  Last battle {fmtDate(d.lastBattleTime)}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onChange}
            className="shrink-0 rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            Change account
          </button>
        </div>
      </div>

      {!d ? (
        <div className="rounded-2xl bg-white/5 p-5 text-center ring-1 ring-white/10">
          <p className="text-sm text-zinc-400">
            Your account is linked, but its stats couldn&apos;t be loaded. Use{" "}
            <span className="font-semibold text-zinc-200">Change account</span> to re-link and
            refresh them.
          </p>
        </div>
      ) : (
        <>
          {/* Core career stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Battles" value={d.battles.toLocaleString()} accent="text-emerald-200" />
            <BarStat
              label="Win rate"
              pct={d.winrate}
              display={`${d.winrate.toFixed(1)}%`}
              from="from-emerald-400"
              to="to-cyan-400"
            />
            <StatTile label="Avg damage" value={d.avgDamage.toLocaleString()} accent="text-cyan-200" />
            <StatTile label="Avg frags" value={d.avgFrags.toFixed(2)} accent="text-fuchsia-200" />
            <StatTile label="Avg XP" value={d.avgXp.toLocaleString()} />
            <BarStat
              label="Accuracy"
              pct={d.accuracy}
              display={`${d.accuracy.toFixed(1)}%`}
              from="from-amber-400"
              to="to-orange-400"
            />
            <BarStat
              label="Survival"
              pct={d.survival}
              display={`${d.survival.toFixed(1)}%`}
              from="from-sky-400"
              to="to-emerald-400"
            />
            <StatTile label="Avg spots" value={d.avgSpots.toFixed(2)} />
          </div>

          {/* Records + W/L/D */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatTile label="Max frags" value={d.maxFrags.toLocaleString()} accent="text-fuchsia-200" />
            <StatTile label="Max XP" value={d.maxXp.toLocaleString()} />
            <StatTile label="Wins" value={d.wins.toLocaleString()} accent="text-emerald-200" />
            <StatTile label="Losses" value={d.losses.toLocaleString()} accent="text-red-200" />
          </div>
        </>
      )}
    </div>
  );
}
