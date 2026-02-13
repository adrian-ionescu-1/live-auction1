import Link from "next/link";

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 text-zinc-200">
    {children}
  </span>
);

const GlowLink = ({
  href,
  children,
  glow = "shadow-[0_0_60px_rgba(34,211,238,0.12)]",
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

export default function TournamentsPage() {
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
              <div className="text-xs text-zinc-400">Tournaments</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <Link href="/tournaments" className="text-zinc-100">
              Tournaments
            </Link>
            <Link href="/rules" className="hover:text-zinc-100 transition">
              Rules
            </Link>
            <Link href="/faq" className="hover:text-zinc-100 transition">
              FAQ
            </Link>
            <Link href="/spectator" className="hover:text-zinc-100 transition">
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
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-14 sm:px-6">
        <div className="flex flex-col gap-6">
          <div className="inline-flex flex-wrap items-center gap-2">
            <Badge>ESPORTS EDITION</Badge>
            <Badge>WoT Blitz</Badge>
            <Badge>Draft / Auction</Badge>
            <Badge>Real-time</Badge>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                Tournament format &amp; draft structure
              </h1>
              <p className="mt-4 max-w-xl text-zinc-300">
                This page explains how tournament auctions are organized: teams,
                budgets, pick caps, and the overall flow. Organizers can adopt
                this standard format or tweak it for a specific season.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                  Read rules →
                </GlowLink>
                <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                  FAQ →
                </GlowLink>
                <GlowLink
                  href="/spectator"
                  glow="shadow-[0_0_60px_rgba(236,72,153,0.10)]"
                >
                  Spectator info →
                </GlowLink>
              </div>
            </div>

            {/* Highlight Card */}
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 sm:p-8">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                Standard format (recommended)
              </div>
              <div className="mt-3 text-2xl font-extrabold">
                8 Teams • $10,000 Budget
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-zinc-400">Pick cap</div>
                  <div className="mt-1 text-lg font-bold">10</div>
                </div>
                <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-zinc-400">Base price</div>
                  <div className="mt-1 text-lg font-bold">$100</div>
                </div>
                <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                  <div className="text-xs text-zinc-400">Reserve</div>
                  <div className="mt-1 text-lg font-bold">$110</div>
                </div>
              </div>

              <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="mt-6 grid gap-3">
                {[
                  {
                    t: "Auction flow",
                    d: "Players are auctioned one-by-one. Highest valid bid wins when the timer ends.",
                  },
                  {
                    t: "Realtime sync",
                    d: "All participants see the same timer and bid updates instantly.",
                  },
                  {
                    t: "Re-auction (unsold)",
                    d: "If no valid bids, the player can re-enter the auction later.",
                  },
                ].map((x) => (
                  <div
                    key={x.t}
                    className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4"
                  >
                    <div className="text-sm font-semibold">{x.t}</div>
                    <div className="mt-2 text-sm text-zinc-400">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent my-6" />

          {/* Sections */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
              <div className="text-sm font-semibold">Team setup</div>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Up to <span className="font-semibold">8 teams</span> in one draft session.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Each team starts with a fixed budget (e.g. <span className="font-semibold">$10,000</span>).
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Teams must respect the pick cap (e.g. <span className="font-semibold">10 players</span>).
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
              <div className="text-sm font-semibold">Auction pacing</div>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-cyan-300">•</span>
                  Timer runs continuously per player (organizer controlled).
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-300">•</span>
                  Controlled extensions only in the final seconds (anti-stall).
                </li>
                <li className="flex gap-2">
                  <span className="text-cyan-300">•</span>
                  Anti-spam bidding keeps the final moments fair.
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
              <div className="text-sm font-semibold">Budget &amp; reserves</div>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-fuchsia-300">•</span>
                  Bids require available funds.
                </li>
                <li className="flex gap-2">
                  <span className="text-fuchsia-300">•</span>
                  Optional per-pick reserves can be used to prevent over-drafting.
                </li>
                <li className="flex gap-2">
                  <span className="text-fuchsia-300">•</span>
                  Squad overview shows remaining budget and roster progress.
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 rounded-3xl bg-gradient-to-r from-emerald-500/12 via-cyan-500/10 to-fuchsia-500/10 ring-1 ring-white/10 p-7 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-2xl font-extrabold">
                  Join the tournament draft
                </div>
                <div className="mt-2 text-sm text-zinc-300">
                  Participants enter using an access key provided by the organizer.
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

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.10)]">
                Rules →
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                FAQ →
              </GlowLink>
              <GlowLink href="/spectator" glow="shadow-[0_0_60px_rgba(236,72,153,0.10)]">
                Spectator →
              </GlowLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
