import Link from "next/link";

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 text-zinc-200">
    {children}
  </span>
);

const GlowLink = ({
  href,
  children,
  glow = "shadow-[0_0_60px_rgba(16,185,129,0.12)]",
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

const RuleCard = ({
  title,
  desc,
  accent = "emerald",
}: {
  title: string;
  desc: string;
  accent?: "emerald" | "cyan" | "fuchsia" | "white";
}) => {
  const accentMap: Record<string, string> = {
    emerald: "shadow-[0_0_70px_rgba(16,185,129,0.10)]",
    cyan: "shadow-[0_0_70px_rgba(34,211,238,0.10)]",
    fuchsia: "shadow-[0_0_70px_rgba(236,72,153,0.09)]",
    white: "shadow-[0_0_70px_rgba(255,255,255,0.06)]",
  };

  return (
    <div className="group relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 hover:bg-white/10 transition">
      <span
        className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition ${accentMap[accent]}`}
      />
      <div className="relative">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-3 text-sm text-zinc-400">{desc}</div>
      </div>
    </div>
  );
};

export default function RulesPage() {
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
              <div className="text-xs text-zinc-400">Rules</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <Link href="/tournaments" className="hover:text-zinc-100 transition">
              Tournaments
            </Link>
            <Link href="/rules" className="text-zinc-100">
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
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="inline-flex flex-wrap items-center gap-2">
          <Badge>FAIR PLAY</Badge>
          <Badge>ANTI-SPAM</Badge>
          <Badge>CONTROLLED TIMER</Badge>
          <Badge>REALTIME VALIDATION</Badge>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Auction rules &amp; fair-play policy
            </h1>
            <p className="mt-4 max-w-xl text-zinc-300">
              These rules are designed to keep drafts fast, competitive and fair.
              The server validates bids, controls timing, and prevents spam or stalling.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                Tournament format →
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                FAQ →
              </GlowLink>
              <GlowLink href="/spectator" glow="shadow-[0_0_60px_rgba(236,72,153,0.10)]">
                Spectator info →
              </GlowLink>
            </div>

            <div className="mt-8 rounded-3xl bg-black/30 ring-1 ring-white/10 p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                Quick summary
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Same user can’t raise again until another user bids.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Timer extends only in the final seconds (anti-stall).
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Bids are validated server-side; invalid bids are rejected.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  When time ends, highest valid bid wins; otherwise, re-auction.
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Rule HUD */}
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 sm:p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              Tournament-grade protections
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-sm font-semibold">Anti-spam lock</div>
                <div className="mt-2 text-sm text-zinc-400">
                  After placing a bid, a user must wait for another user to bid
                  before they can raise again.
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-sm font-semibold">Timer discipline</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Extensions trigger only under a low time threshold to avoid endless auctions.
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-sm font-semibold">Server truth</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Clients don’t decide winners; server functions validate, settle and broadcast results.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

        {/* Rule Cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <RuleCard
            title="1) Valid bids only"
            desc="A bid must meet minimum increment requirements and the bidder must have sufficient available budget."
            accent="cyan"
          />
          <RuleCard
            title="2) Anti-spam bidding"
            desc="A user cannot place consecutive raises. Another user must bid before the same user can bid again."
            accent="emerald"
          />
          <RuleCard
            title="3) Controlled timer extensions"
            desc="To prevent stalling, the timer only extends when bids occur during the final seconds."
            accent="fuchsia"
          />
          <RuleCard
            title="4) Winning & settlement"
            desc="When the timer ends, the highest valid bid wins. Settlement is performed server-side and broadcast to all clients."
            accent="white"
          />
          <RuleCard
            title="5) Unsold players (re-auction)"
            desc="If no valid bids occur, the player may be marked unsold and can re-enter the auction later depending on tournament settings."
            accent="cyan"
          />
          <RuleCard
            title="6) Fair play & admin control"
            desc="Admins control the flow and can enforce tournament rules. Any abuse or exploits may lead to disqualification."
            accent="emerald"
          />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-emerald-500/12 via-cyan-500/10 to-fuchsia-500/10 ring-1 ring-white/10 p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-2xl font-extrabold">
                Ready to bid under fair rules?
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Participants enter using an access key provided by the organizer.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.10)]">
                  Tournament format →
                </GlowLink>
                <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                  FAQ →
                </GlowLink>
                <GlowLink href="/spectator" glow="shadow-[0_0_60px_rgba(236,72,153,0.10)]">
                  Spectator →
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
