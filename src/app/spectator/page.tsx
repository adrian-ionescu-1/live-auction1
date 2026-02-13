import Link from "next/link";

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 text-zinc-200">
    {children}
  </span>
);

const GlowLink = ({
  href,
  children,
  glow = "shadow-[0_0_60px_rgba(236,72,153,0.10)]",
}: {
  href: string;
  children: React.ReactNode;
  glow?: string;
}) => {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 ring-1 ring-white/10 text-sm text-zinc-200 hover:bg-white/10 transition active:scale-[0.98]"
    >
      <span
        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition ${glow}`}
      />
      <span className="relative">{children}</span>
    </Link>
  );
};

const Card = ({
  title,
  desc,
  glow = "shadow-[0_0_70px_rgba(236,72,153,0.08)]",
}: {
  title: string;
  desc: string;
  glow?: string;
}) => (
  <div className="group relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 hover:bg-white/10 transition">
    <span
      className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition ${glow}`}
    />
    <div className="relative">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 text-sm text-zinc-400">{desc}</div>
    </div>
  </div>
);

export default function SpectatorPage() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 ring-1 ring-white/10 flex items-center justify-center">
              <span className="text-sm font-extrabold tracking-wider">WOT</span>
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400/70 blur-[2px]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">Auction App</div>
              <div className="text-xs text-zinc-400">Spectator</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <Link href="/tournaments" className="hover:text-zinc-100 transition">
              Tournaments
            </Link>
            <Link href="/rules" className="hover:text-zinc-100 transition">
              Rules
            </Link>
            <Link href="/faq" className="hover:text-zinc-100 transition">
              FAQ
            </Link>
            <Link href="/spectator" className="text-zinc-100">
              Spectator
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline text-sm text-zinc-300 hover:text-zinc-100 transition"
            >
              Participant login
            </Link>

            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/25 bg-emerald-500/15 hover:bg-emerald-500/20 transition active:scale-[0.98]"
            >
              <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_30px_rgba(16,185,129,0.25)]" />
              <span className="relative">Enter with Access Key</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="inline-flex flex-wrap items-center gap-2">
          <Badge>SPECTATOR MODE</Badge>
          <Badge>LIVE STATE</Badge>
          <Badge>NO BIDDING</Badge>
          <Badge>TOURNAMENT VIEW</Badge>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Watch the draft like it’s match day
            </h1>
            <p className="mt-4 max-w-xl text-zinc-300">
              Spectator mode is a read-only view: you can follow the timer, current
              player, live bids and results — without bidding controls.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                Tournament format →
              </GlowLink>
              <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                Rules →
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                FAQ →
              </GlowLink>
            </div>

            <div className="mt-8 rounded-3xl bg-black/30 ring-1 ring-white/10 p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                What you’ll see
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-fuchsia-300">•</span>
                  Current player card (stats + base price)
                </li>
                <li className="flex gap-2">
                  <span className="text-fuchsia-300">•</span>
                  Live timer and extensions in real time
                </li>
                <li className="flex gap-2">
                  <span className="text-fuchsia-300">•</span>
                  Highest bid + recent bid activity
                </li>
                <li className="flex gap-2">
                  <span className="text-fuchsia-300">•</span>
                  SOLD / UNSOLD results and re-auction transitions
                </li>
              </ul>
            </div>
          </div>

          {/* Preview HUD */}
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold tracking-wide">SPECTATOR HUD</div>
                <div className="text-xs text-zinc-400">Read-only • Live view</div>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-1 text-xs ring-1 ring-white/10">
                Live
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Now auctioning</span>
                <span className="font-semibold text-zinc-200 tabular-nums">00:18</span>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold">Player #07</div>
                  <div className="mt-1 text-xs text-zinc-400">WN8 • WR • AVG DMG</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Highest bid</div>
                  <div className="text-2xl font-extrabold">$215</div>
                </div>
              </div>

              <div className="mt-5 h-2 w-full rounded-full bg-white/5 ring-1 ring-white/10 overflow-hidden">
                <div className="h-full w-[70%] bg-gradient-to-r from-fuchsia-400/45 via-cyan-400/45 to-emerald-400/45" />
              </div>

              <div className="mt-4 grid gap-2 text-xs">
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-semibold text-zinc-100">IN PROGRESS</span>
                </div>
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 flex items-center justify-between">
                  <span className="text-zinc-400">Last event</span>
                  <span className="font-semibold text-zinc-100">Bid placed</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-xs text-zinc-400">Read-only</div>
                <div className="mt-1 text-sm font-semibold">No bidding controls</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Spectators cannot change auction state.
                </div>
              </div>
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-xs text-zinc-400">Tournament clarity</div>
                <div className="mt-1 text-sm font-semibold">Clean results</div>
                <div className="mt-1 text-xs text-zinc-400">
                  SOLD / UNSOLD shown clearly per player.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-fuchsia-400/25 to-transparent" />

        {/* Cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card
            title="Live updates"
            desc="Follow bids and timer changes instantly as they happen in the draft."
            glow="shadow-[0_0_70px_rgba(34,211,238,0.10)]"
          />
          <Card
            title="Results clarity"
            desc="See SOLD / UNSOLD outcomes and re-auction transitions clearly."
            glow="shadow-[0_0_70px_rgba(236,72,153,0.10)]"
          />
          <Card
            title="Tournament story"
            desc="Understand how teams are building rosters and managing budget in real time."
            glow="shadow-[0_0_70px_rgba(16,185,129,0.08)]"
          />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-fuchsia-500/10 via-cyan-500/10 to-emerald-500/10 ring-1 ring-white/10 p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-2xl font-extrabold">
                Want to participate instead?
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Participants enter using an access key provided by the tournament organizer.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                  Tournament format →
                </GlowLink>
                <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                  Rules →
                </GlowLink>
                <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                  FAQ →
                </GlowLink>
              </div>
            </div>

            <Link
              href="/login"
              className="group relative inline-flex items-center justify-center rounded-2xl px-7 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/25 bg-emerald-500/15 hover:bg-emerald-500/20 transition active:scale-[0.98]"
            >
              <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_70px_rgba(16,185,129,0.18)]" />
              <span className="relative">Enter Auction</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
