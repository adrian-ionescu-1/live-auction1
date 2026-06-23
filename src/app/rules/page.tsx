import type { Metadata } from "next";
import SiteHeader from "../_components/SiteHeader";
import CTASection from "../_components/CTASection";
import HostBanner from "../_components/HostBanner";
import Reveal from "../_components/Reveal";
import { Badge, GlowLink, InfoCard, Divider } from "../_components/ui";

export const metadata: Metadata = {
  title: "Auction Rules • Auction App",
  description:
    "Fair-play policy for tournament auctions: valid bids, anti-spam bidding, controlled timer extensions, server-side settlement and re-auction.",
};

const RULES = [
  {
    title: "1) Valid bids only",
    desc: "A bid must meet minimum increment requirements and the bidder must have sufficient available budget.",
    glow: "shadow-[0_0_70px_rgba(34,211,238,0.10)]",
  },
  {
    title: "2) Anti-spam bidding",
    desc: "A user cannot place consecutive raises. Another user must bid before the same user can bid again.",
    glow: "shadow-[0_0_70px_rgba(16,185,129,0.10)]",
  },
  {
    title: "3) Controlled timer extensions",
    desc: "To prevent stalling, the timer only extends when bids occur during the final seconds.",
    glow: "shadow-[0_0_70px_rgba(236,72,153,0.09)]",
  },
  {
    title: "4) Winning & settlement",
    desc: "When the timer ends, the highest valid bid wins. Settlement is performed server-side and broadcast to all clients.",
    glow: "shadow-[0_0_70px_rgba(255,255,255,0.06)]",
  },
  {
    title: "5) Unsold players (re-auction)",
    desc: "If no valid bids occur, the player may be marked unsold and can re-enter the auction later depending on tournament settings.",
    glow: "shadow-[0_0_70px_rgba(34,211,238,0.10)]",
  },
  {
    title: "6) Fair play & admin control",
    desc: "Admins control the flow and can enforce tournament rules. Any abuse or exploits may lead to disqualification.",
    glow: "shadow-[0_0_70px_rgba(16,185,129,0.10)]",
  },
];

export default function RulesPage() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader subtitle="Rules" />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="inline-flex animate-fade-up flex-wrap items-center gap-2">
          <Badge>FAIR PLAY</Badge>
          <Badge>ANTI-SPAM</Badge>
          <Badge>CONTROLLED TIMER</Badge>
          <Badge>REALTIME VALIDATION</Badge>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="animate-fade-up [animation-delay:80ms]">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Auction rules &amp;{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
                fair-play policy
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-zinc-300">
              These rules are designed to keep drafts fast, competitive and fair.
              The server validates bids, controls timing, and prevents spam or stalling.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                Tournament format <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                FAQ <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/streamers" glow="shadow-[0_0_60px_rgba(139,92,246,0.14)]">
                Streamer info <span aria-hidden>→</span>
              </GlowLink>
            </div>

            <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
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
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              Tournament-grade protections
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Anti-spam lock</div>
                <div className="mt-2 text-sm text-zinc-400">
                  After placing a bid, a user must wait for another user to bid
                  before they can raise again.
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Timer discipline</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Extensions trigger only under a low time threshold to avoid endless auctions.
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Server truth</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Clients don’t decide winners; server functions validate, settle and broadcast results.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Divider />
        </div>

        {/* Rule Cards */}
        <Reveal className="mt-10 grid gap-6 sm:grid-cols-2">
          {RULES.map((r) => (
            <InfoCard key={r.title} title={r.title} desc={r.desc} glow={r.glow} />
          ))}
        </Reveal>

        <Reveal className="mt-12">
          <HostBanner />
        </Reveal>

        <Reveal className="mt-6">
          <CTASection
            title="Ready to bid under fair rules?"
            subtitle="Participants enter using an access key provided by the organizer."
            primaryHref="/contact"
            primaryLabel="Get in touch"
            links={[
              { href: "/tournaments", label: "Tournament format", glow: "shadow-[0_0_60px_rgba(34,211,238,0.10)]" },
              { href: "/faq", label: "FAQ", glow: "shadow-[0_0_60px_rgba(255,255,255,0.08)]" },
              { href: "/streamers", label: "Streamers", glow: "shadow-[0_0_60px_rgba(139,92,246,0.14)]" },
            ]}
          />
        </Reveal>
      </section>
    </main>
  );
}
