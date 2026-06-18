import type { Metadata } from "next";
import SiteHeader from "./_components/SiteHeader";
import CTASection from "./_components/CTASection";
import Reveal from "./_components/Reveal";
import PlayerShowcaseCard, {
  type ShowcasePlayer,
} from "./_components/PlayerShowcaseCard";
import { GlowLink, PrimaryLink, InfoCard, Divider } from "./_components/ui";

export const metadata: Metadata = {
  title: "Auction App • WoT Blitz Tournament Draft",
  description:
    "Arena-style auction draft for WoT Blitz tournaments: bid live for the best players, build your roster under a budget, and follow every pick in real time — FIFA-style drafting for esports.",
};

const TICKER = [
  "LIVE BIDDING",
  "REAL-TIME SYNC",
  "ANTI-SPAM",
  "8 TEAMS",
  "$10,000 BUDGET",
  "10 PICKS",
  "RE-AUCTION",
  "FAIR PLAY",
  "SPECTATOR MODE",
  "WOT BLITZ",
];

const STATS = [
  { v: "8", k: "Teams per draft" },
  { v: "$10K", k: "Budget each" },
  { v: "10", k: "Pick cap" },
  { v: "0ms", k: "Desync goal" },
];

const STEPS = [
  {
    n: "01",
    title: "Get your access key",
    desc: "Organizers hand out keys. One key = one seat at the draft table.",
    icon: (
      <path d="M14 7a4 4 0 1 0-3.5 3.97L7 14.5V17H9.5l.5-.5H12v-2h2l1-1A4 4 0 0 0 14 7Zm2 1.5h.01" />
    ),
    glow: "shadow-[0_0_60px_rgba(16,185,129,0.12)]",
  },
  {
    n: "02",
    title: "Enter the live draft",
    desc: "Join the room and see the same timer, player and bids as everyone else.",
    icon: <path d="M5 12h14M13 6l6 6-6 6" />,
    glow: "shadow-[0_0_60px_rgba(34,211,238,0.12)]",
  },
  {
    n: "03",
    title: "Bid in real time",
    desc: "Outbid rivals before the clock hits zero. Anti-spam keeps it fair.",
    icon: <path d="M5 19h8M14 4l6 6-5 5-6-6 5-5ZM9 9l-5 5 2 2 5-5" />,
    glow: "shadow-[0_0_60px_rgba(236,72,153,0.10)]",
  },
  {
    n: "04",
    title: "Build your roster",
    desc: "Win players, track your budget, and assemble the strongest squad.",
    icon: <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Zm-2 9 1.5 1.5L15 10" />,
    glow: "shadow-[0_0_60px_rgba(255,255,255,0.08)]",
  },
];

const PLAYERS: ShowcasePlayer[] = [
  {
    name: "Steel Wolf",
    handle: "@steel_wolf",
    role: "Heavy / Frontline",
    rating: 94,
    tier: "legendary",
    basePrice: 220,
    stats: [
      { label: "WN8", value: 96 },
      { label: "Winrate", value: 71 },
      { label: "Avg DMG", value: 88 },
    ],
  },
  {
    name: "Iron Maiden",
    handle: "@iron_maiden",
    role: "Medium / Flex",
    rating: 89,
    tier: "epic",
    basePrice: 160,
    stats: [
      { label: "WN8", value: 90 },
      { label: "Winrate", value: 64 },
      { label: "Avg DMG", value: 82 },
    ],
  },
  {
    name: "Night Hawk",
    handle: "@night_hawk",
    role: "Sniper / TD",
    rating: 86,
    tier: "rare",
    basePrice: 130,
    stats: [
      { label: "WN8", value: 84 },
      { label: "Winrate", value: 61 },
      { label: "Avg DMG", value: 90 },
    ],
  },
  {
    name: "Ghost Recon",
    handle: "@ghost_recon",
    role: "Light / Scout",
    rating: 88,
    tier: "epic",
    basePrice: 150,
    stats: [
      { label: "WN8", value: 87 },
      { label: "Winrate", value: 66 },
      { label: "Avg DMG", value: 74 },
    ],
  },
];

const FEATURES = [
  {
    title: "Real-time sync",
    desc: "All clients stay aligned with live updates — no refresh, no drift.",
    href: "/tournaments",
    glow: "shadow-[0_0_60px_rgba(34,211,238,0.10)]",
    cta: "Tournament format →",
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
];

const FAQ_PREVIEW = [
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
];

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function HomeLanding() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader />

      {/* Hero */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-12 pb-10 sm:px-6 sm:pt-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="animate-fade-up">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs ring-1 ring-white/10">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
                ESPORTS EDITION
              </span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-300">Real-time</span>
              <span className="hidden text-zinc-400 sm:inline">•</span>
              <span className="hidden text-zinc-300 sm:inline">Tournament-ready</span>
            </div>

            <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Draft your dream squad
              <span className="mt-1 block bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
                one live bid at a time
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base text-zinc-300 sm:text-lg">
              The auction draft built for WoT Blitz tournaments — same energy as a
              FIFA draft, but for tanks. Bid live for top players, manage a budget,
              and assemble your roster while everyone watches in real time.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <PrimaryLink
                href="/login"
                size="md"
                glow="shadow-[0_0_60px_rgba(34,211,238,0.18)]"
              >
                Enter the Draft
              </PrimaryLink>

              <GlowLink href="/tournaments" glow="shadow-[0_0_50px_rgba(34,211,238,0.12)]">
                How the draft works <span aria-hidden>→</span>
              </GlowLink>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs text-zinc-400">
              <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                Mobile-first UI
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                Admin control
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                Re-auction (unsold)
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
                Spectator mode
              </span>
            </div>
          </div>

          {/* Right: Arena HUD card */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="relative rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8 lg:animate-float-slow">
              <div className="pointer-events-none absolute inset-0 rounded-3xl">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
                <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl" />
              </div>

              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold tracking-wide">LIVE AUCTION HUD</div>
                  <div className="text-xs text-zinc-400">Preview • Tournament draft flow</div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-black/40 px-3 py-1 text-xs ring-1 ring-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow-pulse" />
                  Live
                </div>
              </div>

              <div className="relative mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Current Player</span>
                  <span className="font-semibold tabular-nums text-zinc-200">00:18</span>
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-lg font-bold">Steel Wolf</div>
                    <div className="mt-1 text-xs text-zinc-400">WN8 • Winrate • Avg DMG</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Highest bid</div>
                    <div className="text-2xl font-extrabold">$215</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                    <div className="h-full w-[72%] bg-gradient-to-r from-emerald-400/55 via-cyan-400/55 to-fuchsia-400/45" />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                      <div className="text-zinc-400">Teams</div>
                      <div className="font-semibold text-zinc-100">8</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                      <div className="text-zinc-400">Budget</div>
                      <div className="font-semibold text-zinc-100">$10,000</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
                      <div className="text-zinc-400">Pick cap</div>
                      <div className="font-semibold text-zinc-100">10</div>
                    </div>
                  </div>
                </div>
              </div>

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
        </div>
      </section>

      {/* Ticker band */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 bg-white/[0.02] py-3">
        <div className="flex w-max animate-ticker gap-8 whitespace-nowrap pr-8 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-8">
              {t}
              <span className="text-emerald-400/60">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* Stats band */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.k} delay={i * 80}>
              <div className="rounded-3xl bg-white/5 p-5 text-center ring-1 ring-white/10">
                <div className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                  {s.v}
                </div>
                <div className="mt-1 text-xs text-zinc-400">{s.k}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
        <Reveal>
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              How it works
            </div>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
              From access key to full roster
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400">
              Four steps, one live room. The flow mirrors a FIFA-style draft —
              fast, competitive, and easy to follow.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="group relative h-full overflow-hidden rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:bg-white/10">
                <span
                  className={`pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition group-hover:opacity-100 ${s.glow}`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-200 ring-1 ring-white/10 transition group-hover:scale-110">
                      <StepIcon>{s.icon}</StepIcon>
                    </div>
                    <span className="text-2xl font-extrabold text-white/10">{s.n}</span>
                  </div>
                  <div className="mt-4 text-sm font-semibold">{s.title}</div>
                  <div className="mt-2 text-sm text-zinc-400">{s.desc}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Draft board (player showcase) */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                The draft board
              </div>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Players you’ll be bidding for
              </h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                Every tank commander is rated and tiered. Sample cards below — the
                real pool is set by your tournament organizer.
              </p>
            </div>
            <GlowLink href="/tournaments" glow="shadow-[0_0_50px_rgba(34,211,238,0.12)]">
              See the format <span aria-hidden>→</span>
            </GlowLink>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLAYERS.map((p, i) => (
            <Reveal key={p.handle} delay={i * 80}>
              <PlayerShowcaseCard player={p} />
            </Reveal>
          ))}
        </div>
      </section>

      <div className="relative z-10 mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6">
        <Divider />
      </div>

      {/* Features */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-12 pb-8 sm:px-6">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                Core features
              </div>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                Built for tournament drafts
              </h2>
            </div>

            <GlowLink href="/rules" glow="shadow-[0_0_50px_rgba(16,185,129,0.10)]">
              See rules <span aria-hidden>→</span>
            </GlowLink>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="group h-full rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:bg-white/10 hover:shadow-[0_0_70px_rgba(16,185,129,0.07)]">
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="mt-3 text-sm text-zinc-400">{f.desc}</div>
                <div className="mt-5">
                  <Divider via="via-white/10" />
                </div>
                <div className="mt-4">
                  <GlowLink href={f.href} glow={f.glow}>
                    {f.cta}
                  </GlowLink>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Tournament highlight */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-6">
        <Reveal>
          <div className="rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-fuchsia-500/10 p-6 ring-1 ring-white/10 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                  Standard format
                </div>
                <div className="mt-2 text-xl font-extrabold sm:text-2xl">
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

            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[
                { k: "Live state", v: "Realtime auction state + bids" },
                { k: "Auto settle", v: "Server-side settlement & validation" },
                { k: "Re-auction", v: "Unsold players re-enter queue" },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-zinc-400">{x.k}</div>
                  <div className="mt-1 text-sm font-semibold">{x.v}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ preview */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-2 pb-12 sm:px-6">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Support</div>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Quick FAQ</h2>
            </div>

            <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
              All questions <span aria-hidden>→</span>
            </GlowLink>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FAQ_PREVIEW.map((x, i) => (
            <Reveal key={x.q} delay={i * 80}>
              <InfoCard title={x.q} desc={x.a} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <Reveal>
          <CTASection
            title="Ready to enter the arena?"
            subtitle="Participants join using an access key provided by the tournament organizer."
            primaryLabel="Enter Auction"
            links={[
              { href: "/spectator", label: "Spectator mode", glow: "shadow-[0_0_60px_rgba(236,72,153,0.10)]" },
              { href: "/tournaments", label: "Tournament format", glow: "shadow-[0_0_60px_rgba(34,211,238,0.12)]" },
              { href: "/rules", label: "Rules", glow: "shadow-[0_0_60px_rgba(16,185,129,0.10)]" },
              { href: "/faq", label: "FAQ", glow: "shadow-[0_0_60px_rgba(255,255,255,0.08)]" },
            ]}
          />
        </Reveal>
      </section>
    </main>
  );
}
