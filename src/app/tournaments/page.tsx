import type { Metadata } from "next";
import SiteHeader from "../_components/SiteHeader";
import CTASection from "../_components/CTASection";
import Reveal from "../_components/Reveal";
import { Badge, GlowLink, Divider, GradientCard } from "../_components/ui";
import HostBanner from "../_components/HostBanner";

export const metadata: Metadata = {
  title: "Tournament Formats • Auction App",
  description:
    "The WoT Blitz formats we run: a FIFA-style league with standings, a cup with seeded groups and a knockout bracket, and live auction drafts — teams, budgets, pacing and flow.",
};

// The competition formats we host. Shown as cards so visitors see everything on
// offer at a glance.
const FORMATS = [
  {
    icon: "🏆",
    name: "FIFA-style league",
    desc: "Every team plays the others; results feed a live standings table (P, W, D, L, SD, PTS) until a champion emerges.",
    points: ["Round-robin standings", "Top scorers & MVP tags", "Auto-updated table"],
  },
  {
    icon: "🎯",
    name: "WoT Blitz cup",
    desc: "Teams register and validate real accounts, get drawn into seeded groups, then battle through a knockout bracket that auto-advances by score.",
    points: ["Seeded by win-rate", "Groups → bracket", "Auto-advancing matches"],
  },
  {
    icon: "⚡",
    name: "Auction draft",
    desc: "Build a squad through live, real-time bidding under a budget — a FIFA-style draft for tanks, run with admin control and re-auctions.",
    points: ["Real-time bidding", "Budget & pick caps", "Streamer broadcasts"],
  },
];

export default function TournamentsPage() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader subtitle="Tournaments" />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-14 sm:px-6">
        <div className="flex flex-col gap-6">
          <div className="inline-flex animate-fade-up flex-wrap items-center gap-2">
            <Badge>ESPORTS EDITION</Badge>
            <Badge>WoT Blitz</Badge>
            <Badge>Draft / Auction</Badge>
            <Badge>Real-time</Badge>
          </div>

          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="animate-fade-up [animation-delay:80ms]">
              <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                Tournament format &amp;{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
                  draft structure
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-zinc-300">
                We run several WoT Blitz formats — a FIFA-style league, a cup with
                seeded groups and a knockout bracket, and live auction drafts. Adopt a
                standard format or ask us to tailor one for your season.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                  Read rules <span aria-hidden>→</span>
                </GlowLink>
                <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                  FAQ <span aria-hidden>→</span>
                </GlowLink>
                <GlowLink href="/streamers" glow="shadow-[0_0_60px_rgba(139,92,246,0.14)]">
                  Streamer info <span aria-hidden>→</span>
                </GlowLink>
              </div>

              {/* How a draft runs — fills the column next to the tall card */}
              <div className="mt-8">
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                  How a draft runs
                </div>
                <ol className="mt-4 space-y-3">
                  {[
                    {
                      t: "Organizer sets the rules",
                      d: "Pick the budget, team count and pick caps, then generate the access keys.",
                    },
                    {
                      t: "Participants join live",
                      d: "Each team enters with a key and lands in the same real-time auction room.",
                    },
                    {
                      t: "Bid, win, build a squad",
                      d: "Players are auctioned one-by-one until every roster is complete.",
                    },
                  ].map((x, i) => (
                    <li
                      key={x.t}
                      className="flex gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:bg-white/10"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 text-sm font-extrabold text-emerald-200 ring-1 ring-white/10">
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{x.t}</div>
                        <div className="mt-1 text-sm text-zinc-400">{x.d}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Highlight Card */}
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                Standard format (recommended)
              </div>
              <div className="mt-3 text-2xl font-extrabold">8 Teams • $10,000 Budget</div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-zinc-400">Pick cap</div>
                  <div className="mt-1 text-lg font-bold">10</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-zinc-400">Base price</div>
                  <div className="mt-1 text-lg font-bold">$100</div>
                </div>
                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <div className="text-xs text-zinc-400">Reserve</div>
                  <div className="mt-1 text-lg font-bold">$110</div>
                </div>
              </div>

              <div className="mt-6">
                <Divider via="via-white/10" />
              </div>

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
                  <div key={x.t} className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                    <div className="text-sm font-semibold">{x.t}</div>
                    <div className="mt-2 text-sm text-zinc-400">{x.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Formats we run */}
          <Reveal className="mt-4">
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Formats we run</div>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Pick a format — or mix them</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FORMATS.map((f) => (
                <GradientCard key={f.name} className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-2xl ring-1 ring-white/10">
                    <span aria-hidden>{f.icon}</span>
                  </div>
                  <div className="mt-4 text-base font-extrabold text-zinc-100">{f.name}</div>
                  <div className="mt-2 text-sm text-zinc-400">{f.desc}</div>
                  <ul className="mt-4 space-y-1.5">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-zinc-300">
                        <span aria-hidden className="text-emerald-300">◆</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </GradientCard>
              ))}
            </div>
          </Reveal>

          <div className="my-6">
            <Divider />
          </div>

          {/* Sections */}
          <Reveal className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
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

            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
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

            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:col-span-2 lg:col-span-1">
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
          </Reveal>

          <Reveal className="mt-10">
            <HostBanner
              title="Want one of these run for your community?"
              subtitle="Tell us the format, size and dates — league, cup or auction draft — and we'll set it up, host it live and send a custom offer."
            />
          </Reveal>

          <Reveal className="mt-6">
            <CTASection
              title="Join the tournament draft"
              subtitle="Participants enter using an access key provided by the organizer."
              primaryHref="/contact"
              primaryLabel="Get in touch"
              links={[
                { href: "/rules", label: "Rules", glow: "shadow-[0_0_60px_rgba(16,185,129,0.10)]" },
                { href: "/faq", label: "FAQ", glow: "shadow-[0_0_60px_rgba(255,255,255,0.08)]" },
                { href: "/streamers", label: "Streamers", glow: "shadow-[0_0_60px_rgba(139,92,246,0.14)]" },
              ]}
            />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
