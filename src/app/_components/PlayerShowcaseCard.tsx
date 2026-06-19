//
// FIFA-style player card used in the visitor-facing "draft board" preview.
// Purely presentational (mock data) — gives visitors a feel for what gets
// auctioned without exposing the real auction.

export type Tier = "legendary" | "epic" | "rare";

export type ShowcasePlayer = {
  name: string;
  handle: string;
  role: string;
  rating: number;
  tier: Tier;
  basePrice: number;
  stats: { label: string; value: number }[];
};

const TIERS: Record<
  Tier,
  { label: string; ring: string; glow: string; grad: string; chip: string }
> = {
  legendary: {
    label: "LEGENDARY",
    ring: "ring-amber-300/40",
    glow: "shadow-[0_0_70px_rgba(251,191,36,0.18)]",
    grad: "from-amber-200 via-yellow-100 to-amber-300",
    chip: "bg-amber-400/15 text-amber-200 ring-amber-300/30",
  },
  epic: {
    label: "EPIC",
    ring: "ring-fuchsia-300/40",
    glow: "shadow-[0_0_70px_rgba(232,121,249,0.16)]",
    grad: "from-fuchsia-200 via-purple-100 to-fuchsia-300",
    chip: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-300/30",
  },
  rare: {
    label: "RARE",
    ring: "ring-cyan-300/40",
    glow: "shadow-[0_0_70px_rgba(34,211,238,0.16)]",
    grad: "from-cyan-200 via-sky-100 to-cyan-300",
    chip: "bg-cyan-400/15 text-cyan-200 ring-cyan-300/30",
  },
};

function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold tabular-nums text-zinc-200">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400/60 via-cyan-400/60 to-fuchsia-400/50"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export default function PlayerShowcaseCard({ player }: { player: ShowcasePlayer }) {
  const t = TIERS[player.tier];
  const initials = player.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl bg-white/5 p-5 ring-1 transition duration-300 hover:-translate-y-1.5 hover:bg-white/[0.07] ${t.ring}`}
    >
      {/* Tier glow on hover */}
      <span
        className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100 ${t.glow}`}
      />

      {/* Shimmer sweep on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition duration-700 group-hover:translate-x-full" />

      <div className="relative">
        <div className="flex items-start justify-between">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider ring-1 ${t.chip}`}
          >
            {t.label}
          </span>
          <div className="text-right leading-none">
            <div
              className={`bg-gradient-to-br bg-clip-text text-3xl font-extrabold text-transparent ${t.grad}`}
            >
              {player.rating}
            </div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
              OVR
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-700/60 to-zinc-900/60 text-lg font-extrabold text-zinc-100 ring-1 ring-white/10">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-zinc-100">{player.name}</div>
            <div className="truncate text-xs text-zinc-400">
              {player.handle} • {player.role}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5">
          {player.stats.map((s) => (
            <StatBar key={s.label} label={s.label} value={s.value} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Base price
            </div>
            <div className="text-sm font-bold text-zinc-100">
              ${player.basePrice.toLocaleString()}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
            Up for auction
          </span>
        </div>
      </div>
    </div>
  );
}
