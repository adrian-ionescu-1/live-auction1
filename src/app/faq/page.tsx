import type { Metadata } from "next";
import SiteHeader from "../_components/SiteHeader";
import CTASection from "../_components/CTASection";
import HostBanner from "../_components/HostBanner";
import Reveal from "../_components/Reveal";
import { Badge, GlowLink, InfoCard, Divider } from "../_components/ui";

export const metadata: Metadata = {
  title: "FAQ • Auction App",
  description:
    "Quick answers for participants, organizers and streamers about bidding, disconnects, budgets, timers and how winners are settled.",
};

const FAQS = [
  {
    q: "What if two users bid at the same time?",
    a: "Bids are validated server-side in order. The live state updates for everyone immediately after validation.",
    glow: "shadow-[0_0_70px_rgba(34,211,238,0.10)]",
  },
  {
    q: "Why can’t I bid twice in a row?",
    a: "Anti-spam rule: the same user can’t raise consecutively. Another user must place a bid before you can bid again.",
    glow: "shadow-[0_0_70px_rgba(16,185,129,0.10)]",
  },
  {
    q: "What happens if I disconnect during an auction?",
    a: "Reconnect/refresh and re-enter. The auction state is server-driven and continues for all participants.",
    glow: "shadow-[0_0_70px_rgba(255,255,255,0.06)]",
  },
  {
    q: "Does the timer always extend when someone bids?",
    a: "Only under a low-time threshold (final seconds), depending on tournament settings. This keeps the pace competitive.",
    glow: "shadow-[0_0_70px_rgba(236,72,153,0.08)]",
  },
  {
    q: "What if a player receives no bids?",
    a: "They can be marked Unsold and may re-enter the auction later (re-auction), depending on organizer settings.",
    glow: "shadow-[0_0_70px_rgba(34,211,238,0.08)]",
  },
  {
    q: "Can people watch the auction live?",
    a: "Yes — community members with the Streamer role broadcast the live draft on YouTube, Twitch or TikTok. The broadcast room shows the live state without bidding controls.",
    glow: "shadow-[0_0_70px_rgba(236,72,153,0.08)]",
  },
  {
    q: "How do budgets work?",
    a: "Each team has a fixed budget. Valid bids require sufficient available funds. Purchased players reduce your remaining budget.",
    glow: "shadow-[0_0_70px_rgba(16,185,129,0.08)]",
  },
  {
    q: "Who decides the winner of a player?",
    a: "The server settles the auction when time ends. Clients don’t decide winners, which prevents cheating and desync.",
    glow: "shadow-[0_0_70px_rgba(255,255,255,0.06)]",
  },
];

export default function FaqPage() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader subtitle="FAQ" />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="inline-flex animate-fade-up flex-wrap items-center gap-2">
          <Badge>SUPPORT</Badge>
          <Badge>TOURNAMENT OPS</Badge>
          <Badge>REALTIME</Badge>
          <Badge>FAIR PLAY</Badge>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="animate-fade-up [animation-delay:80ms]">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Frequently asked{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
                questions
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-zinc-300">
              Quick answers for participants, organizers and streamers. If your tournament
              has custom rules, the organizer’s rules take priority.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                Rules <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                Tournament format <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/streamers" glow="shadow-[0_0_60px_rgba(139,92,246,0.14)]">
                Streamer info <span aria-hidden>→</span>
              </GlowLink>
            </div>

            <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
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
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
              Categories
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Participants</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Keys, login, bidding, budget visibility, disconnect behavior.
                </div>
              </div>
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Organizers</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Draft format, roster caps, auction pacing, fairness settings.
                </div>
              </div>
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-sm font-semibold">Streamers</div>
                <div className="mt-2 text-sm text-zinc-400">
                  Going live, what the broadcast room shows, and result summaries.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Divider via="via-white/15" />
        </div>

        {/* FAQ list */}
        <Reveal className="mt-10 grid gap-6 sm:grid-cols-2">
          {FAQS.map((x) => (
            <InfoCard key={x.q} title={x.q} desc={x.a} glow={x.glow} />
          ))}
        </Reveal>

        <Reveal className="mt-12">
          <HostBanner />
        </Reveal>

        <Reveal className="mt-6">
          <CTASection
            title="Still need tournament details?"
            subtitle="Read the format and rules — or get in touch to have an event hosted."
            primaryHref="/contact"
            primaryLabel="Get in touch"
            links={[
              { href: "/tournaments", label: "Tournament format", glow: "shadow-[0_0_60px_rgba(34,211,238,0.12)]" },
              { href: "/rules", label: "Rules", glow: "shadow-[0_0_60px_rgba(16,185,129,0.12)]" },
              { href: "/streamers", label: "Streamers", glow: "shadow-[0_0_60px_rgba(139,92,246,0.14)]" },
            ]}
          />
        </Reveal>
      </section>
    </main>
  );
}
