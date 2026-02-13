import Link from "next/link";

const GlowLink = ({
  href,
  children,
  glow = "shadow-[0_0_50px_rgba(34,211,238,0.12)]",
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

export default function HomeLanding() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 ring-1 ring-white/10 flex items-center justify-center">
              <span className="text-sm font-extrabold tracking-wider">WOT</span>
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400/70 blur-[2px]" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">Auction App</div>
              <div className="text-xs text-zinc-400">
                Tournament Draft • Real-time Bidding
              </div>
            </div>
          </div>

          {/* IMPORTANT: navbar links go to STATIC PAGES, not sections */}
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

            {/* Main CTA (login) */}
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

      {/* Hero */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10">
              <span className="text-emerald-300 font-semibold">ESPORTS EDITION</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-300">Real-time</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-300">Anti-spam</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-300">Tournament-ready</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
              Build your roster
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300">
                with an arena-style auction draft
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg text-zinc-300">
              Designed for WoT Blitz tournaments: live bidding, controlled timer
              extensions, fair-play rules, and clean squad tracking — synced in real time.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Login CTA */}
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/25 bg-emerald-500/15 hover:bg-emerald-500/20 transition active:scale-[0.98]"
              >
                <span className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_60px_rgba(34,211,238,0.18)]" />
                <span className="relative">Enter the Draft</span>
              </Link>

              <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                  Mobile-first UI
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                  Admin control
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                  Re-auction (unsold)
                </span>
              </div>
            </div>

            {/* Links to STATIC pages (no underline) */}
            <div className="mt-8 flex flex-wrap gap-3">
              <GlowLink href="/tournaments" glow="shadow-[0_0_50px_rgba(34,211,238,0.12)]">
                View tournament format <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/rules" glow="shadow-[0_0_50px_rgba(16,185,129,0.12)]">
                Read full rules <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/spectator" glow="shadow-[0_0_50px_rgba(236,72,153,0.10)]">
                Spectator info <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_50px_rgba(255,255,255,0.08)]">
                FAQ <span aria-hidden>→</span>
              </GlowLink>
            </div>
          </div>

          {/* Right: Arena HUD card */}
          <div className="relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 rounded-3xl">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
              <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl" />
            </div>

            <div className="relative flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold tracking-wide">LIVE AUCTION HUD</div>
                <div className="text-xs text-zinc-400">Preview • Tournament draft flow</div>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-1 text-xs ring-1 ring-white/10">
                Live
              </div>
            </div>

            <div className="relative mt-6 rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Current Player</span>
                <span className="font-semibold text-zinc-200 tabular-nums">00:18</span>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-lg font-bold">Player #07</div>
                  <div className="mt-1 text-xs text-zinc-400">WN8 • Winrate • Avg DMG</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Highest bid</div>
                  <div className="text-2xl font-extrabold">$215</div>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 w-full rounded-full bg-white/5 ring-1 ring-white/10 overflow-hidden">
                  <div className="h-full w-[72%] bg-gradient-to-r from-emerald-400/55 via-cyan-400/55 to-fuchsia-400/45" />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-2">
                    <div className="text-zinc-400">Teams</div>
                    <div className="font-semibold text-zinc-100">8</div>
                  </div>
                  <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-2">
                    <div className="text-zinc-400">Budget</div>
                    <div className="font-semibold text-zinc-100">$10,000</div>
                  </div>
                  <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-2">
                    <div className="text-zinc-400">Pick cap</div>
                    <div className="font-semibold text-zinc-100">10</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-xs text-zinc-400">Fair-play</div>
                <div className="mt-1 text-sm font-semibold">Anti-spam bids</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Same user can’t raise again until another user bids.
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
                <div className="text-xs text-zinc-400">Timing</div>
                <div className="mt-1 text-sm font-semibold">Controlled extensions</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Only extends in final seconds to keep the pace.
                </div>
              </div>
            </div>

            {/* HUD call-to-actions that go to static pages (not login) */}
            <div className="relative mt-6 flex flex-wrap gap-3">
              <GlowLink href="/tournaments" glow="shadow-[0_0_50px_rgba(34,211,238,0.10)]">
                Format
              </GlowLink>
              <GlowLink href="/rules" glow="shadow-[0_0_50px_rgba(16,185,129,0.10)]">
                Rules
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_50px_rgba(255,255,255,0.07)]">
                FAQ
              </GlowLink>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
      </div>

      {/* Features (overview) */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-12 pb-8 sm:px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              Core features
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">
              Built for tournament drafts
            </h2>
          </div>

          <GlowLink href="/rules" glow="shadow-[0_0_50px_rgba(16,185,129,0.10)]">
            See rules <span aria-hidden>→</span>
          </GlowLink>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Real-time sync",
              desc: "All clients stay aligned with live updates — no refresh, no drift.",
              href: "/about",
              glow: "shadow-[0_0_60px_rgba(34,211,238,0.10)]",
              cta: "About platform →",
            },
            {
              title: "Fair bidding flow",
              desc: "Anti-spam and pace control keep the auction meaningful.",
              href: "/rules",
              glow: "shadow-[0_0_60px_rgba(16,185,129,0.10)]",
              cta: "Read rules →",
            },
            {
              title: "Squad overview",
              desc: "Track roster, purchases, and remaining budget in one place.",
              href: "/tournaments",
              glow: "shadow-[0_0_60px_rgba(236,72,153,0.08)]",
              cta: "Tournament format →",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 transition hover:bg-white/10 hover:shadow-[0_0_70px_rgba(16,185,129,0.07)]"
            >
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="mt-3 text-sm text-zinc-400">{f.desc}</div>
              <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="mt-4">
                <GlowLink href={f.href} glow={f.glow}>
                  {f.cta}
                </GlowLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tournament highlight card (static page link) */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-fuchsia-500/10 ring-1 ring-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                Standard format
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-extrabold">
                8 Teams • $10,000 Budget • Max 10 picks
              </div>
              <div className="mt-2 text-sm text-zinc-300">
                Optimized for fast, fair auctions with clear roster caps and pacing rules.
              </div>
            </div>

            <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
              Tournament details <span aria-hidden>→</span>
            </GlowLink>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { k: "Live state", v: "Realtime auction state + bids" },
              { k: "Auto settle", v: "Server-side settlement & validation" },
              { k: "Re-auction", v: "Unsold players re-enter queue" },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-2xl bg-black/30 ring-1 ring-white/10 p-4"
              >
                <div className="text-xs text-zinc-400">{x.k}</div>
                <div className="mt-1 text-sm font-semibold">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ preview (link to /faq) */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-2 pb-12 sm:px-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              Support
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">
              Quick FAQ
            </h2>
          </div>

          <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
            All questions <span aria-hidden>→</span>
          </GlowLink>
        </div>

        <div className="mt-6 grid gap-4">
          {[
            {
              q: "What if two users bid at the same time?",
              a: "The server validates bids in order and broadcasts the result in real time.",
            },
            {
              q: "What happens if a participant disconnects?",
              a: "They can reconnect and continue — auction state remains live for all users.",
            },
            {
              q: "Can spectators watch the auction?",
              a: "Yes — tournament organizers can share spectator access and rules.",
            },
          ].map((x) => (
            <div
              key={x.q}
              className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6"
            >
              <div className="text-sm font-semibold">{x.q}</div>
              <div className="mt-2 text-sm text-zinc-400">{x.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-500/12 via-cyan-500/10 to-fuchsia-500/10 ring-1 ring-white/10 p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-2xl font-extrabold">Ready to enter the arena?</div>
              <div className="mt-2 text-sm text-zinc-300">
                Participants join using an access key provided by the tournament organizer.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <GlowLink href="/spectator" glow="shadow-[0_0_60px_rgba(236,72,153,0.10)]">
                  Spectator mode <span aria-hidden>→</span>
                </GlowLink>
                <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                  Tournament format <span aria-hidden>→</span>
                </GlowLink>
                <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.10)]">
                  Rules <span aria-hidden>→</span>
                </GlowLink>
                <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                  FAQ <span aria-hidden>→</span>
                </GlowLink>
              </div>
            </div>

            {/* Login CTA stays login */}
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
