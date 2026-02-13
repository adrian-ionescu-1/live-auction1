import Link from "next/link";

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10 text-zinc-200">
    {children}
  </span>
);

const GlowLink = ({
  href,
  children,
  glow = "shadow-[0_0_60px_rgba(255,255,255,0.08)]",
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

const QCard = ({
  q,
  a,
  glow = "shadow-[0_0_70px_rgba(255,255,255,0.06)]",
}: {
  q: string;
  a: string;
  glow?: string;
}) => {
  return (
    <div className="group relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 hover:bg-white/10 transition">
      <span
        className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition ${glow}`}
      />
      <div className="relative">
        <div className="text-sm font-semibold">{q}</div>
        <div className="mt-3 text-sm text-zinc-400">{a}</div>
      </div>
    </div>
  );
};

export default function FaqPage() {
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
              <div className="text-xs text-zinc-400">FAQ</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-300">
            <Link href="/tournaments" className="hover:text-zinc-100 transition">
              Tournaments
            </Link>
            <Link href="/rules" className="hover:text-zinc-100 transition">
              Rules
            </Link>
            <Link href="/faq" className="text-zinc-100">
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
          <Badge>SUPPORT</Badge>
          <Badge>TOURNAMENT OPS</Badge>
          <Badge>REALTIME</Badge>
          <Badge>FAIR PLAY</Badge>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              Frequently asked questions
            </h1>
            <p className="mt-4 max-w-xl text-zinc-300">
              Quick answers for participants, organizers and spectators. If your tournament
              has custom rules, the organizer’s rules take priority.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                Rules →
              </GlowLink>
              <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                Tournament format →
              </GlowLink>
              <GlowLink href="/spectator" glow="shadow-[0_0_60px_rgba(236,72,153,0.10)]">
                Spectator info →
              </GlowLink>
            </div>

            <div className="mt-8 rounded-3xl bg-black/30 ring-1 ring-white/10 p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                Quick tips
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  Keep the auction tab open to stay synced with live updates.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  If you disconnect, refresh and re-enter — the state is server-driven.
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  For bidding rules, always check <span className="font-semibold">Rules</span>.
                </li>
              </ul>
            </div>
          </div>

          {/* Category cards */}
          <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 sm:p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              Categories
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-sm font-semibold">Participants</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Keys, login, bidding, budget visibility, disconnect behavior.
                </div>
              </div>
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-sm font-semibold">Organizers</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Draft format, roster caps, auction pacing, fairness settings.
                </div>
              </div>
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-sm font-semibold">Spectators</div>
                <div className="mt-2 text-sm text-zinc-400">
                  What you can see live, delays, and result summaries.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* FAQ list */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <QCard
            q="What if two users bid at the same time?"
            a="Bids are validated server-side in order. The live state updates for everyone immediately after validation."
            glow="shadow-[0_0_70px_rgba(34,211,238,0.10)]"
          />
          <QCard
            q="Why can’t I bid twice in a row?"
            a="Anti-spam rule: the same user can’t raise consecutively. Another user must place a bid before you can bid again."
            glow="shadow-[0_0_70px_rgba(16,185,129,0.10)]"
          />
          <QCard
            q="What happens if I disconnect during an auction?"
            a="Reconnect/refresh and re-enter. The auction state is server-driven and continues for all participants."
            glow="shadow-[0_0_70px_rgba(255,255,255,0.06)]"
          />
          <QCard
            q="Does the timer always extend when someone bids?"
            a="Only under a low-time threshold (final seconds), depending on tournament settings. This keeps the pace competitive."
            glow="shadow-[0_0_70px_rgba(236,72,153,0.08)]"
          />
          <QCard
            q="What if a player receives no bids?"
            a="They can be marked Unsold and may re-enter the auction later (re-auction), depending on organizer settings."
            glow="shadow-[0_0_70px_rgba(34,211,238,0.08)]"
          />
          <QCard
            q="Can spectators watch the auction live?"
            a="Yes, if the organizer provides spectator access. Spectator mode shows live state without bidding controls."
            glow="shadow-[0_0_70px_rgba(236,72,153,0.08)]"
          />
          <QCard
            q="How do budgets work?"
            a="Each team has a fixed budget. Valid bids require sufficient available funds. Purchased players reduce your remaining budget."
            glow="shadow-[0_0_70px_rgba(16,185,129,0.08)]"
          />
          <QCard
            q="Who decides the winner of a player?"
            a="The server settles the auction when time ends. Clients don’t decide winners, which prevents cheating and desync."
            glow="shadow-[0_0_70px_rgba(255,255,255,0.06)]"
          />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-emerald-500/12 via-cyan-500/10 to-fuchsia-500/10 ring-1 ring-white/10 p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-2xl font-extrabold">
                Still need tournament details?
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Read the format and rules — then enter with your access key.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                  Tournament format →
                </GlowLink>
                <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                  Rules →
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
