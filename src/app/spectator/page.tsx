import type { Metadata } from "next";
import SiteHeader from "../_components/SiteHeader";
import CTASection from "../_components/CTASection";
import Reveal from "../_components/Reveal";
import { Badge, GlowLink, InfoCard, Divider } from "../_components/ui";

export const metadata: Metadata = {
  title: "Spectator Mode • Auction App",
  description:
    "Read-only spectator view of the live draft: follow the timer, current player, highest bid and SOLD / UNSOLD results in real time.",
};

export default function SpectatorPage() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader subtitle="Spectator" />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="inline-flex animate-fade-up flex-wrap items-center gap-2">
          <Badge>SPECTATOR MODE</Badge>
          <Badge>LIVE STATE</Badge>
          <Badge>NO BIDDING</Badge>
          <Badge>TOURNAMENT VIEW</Badge>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="animate-fade-up [animation-delay:80ms]">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Watch the draft like it’s{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 via-cyan-300 to-emerald-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
                match day
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-zinc-300">
              Spectator mode is a read-only view: you can follow the timer, current
              player, live bids and results — without bidding controls.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                Tournament format <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/rules" glow="shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                Rules <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                FAQ <span aria-hidden>→</span>
              </GlowLink>
            </div>

            <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
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
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold tracking-wide">SPECTATOR HUD</div>
                <div className="text-xs text-zinc-400">Read-only • Live view</div>
              </div>
              <div className="rounded-xl bg-black/40 px-3 py-1 text-xs ring-1 ring-white/10">
                Live
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Now auctioning</span>
                <span className="font-semibold tabular-nums text-zinc-200">00:18</span>
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

              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                <div className="h-full w-[70%] bg-gradient-to-r from-fuchsia-400/45 via-cyan-400/45 to-emerald-400/45" />
              </div>

              <div className="mt-4 grid gap-2 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-semibold text-zinc-100">IN PROGRESS</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="text-zinc-400">Last event</span>
                  <span className="font-semibold text-zinc-100">Bid placed</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-zinc-400">Read-only</div>
                <div className="mt-1 text-sm font-semibold">No bidding controls</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Spectators cannot change auction state.
                </div>
              </div>
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-zinc-400">Tournament clarity</div>
                <div className="mt-1 text-sm font-semibold">Clean results</div>
                <div className="mt-1 text-xs text-zinc-400">
                  SOLD / UNSOLD shown clearly per player.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Divider via="via-fuchsia-400/25" />
        </div>

        {/* Cards */}
        <Reveal className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            title="Live updates"
            desc="Follow bids and timer changes instantly as they happen in the draft."
            glow="shadow-[0_0_70px_rgba(34,211,238,0.10)]"
          />
          <InfoCard
            title="Results clarity"
            desc="See SOLD / UNSOLD outcomes and re-auction transitions clearly."
            glow="shadow-[0_0_70px_rgba(236,72,153,0.10)]"
          />
          <InfoCard
            title="Tournament story"
            desc="Understand how teams are building rosters and managing budget in real time."
            glow="shadow-[0_0_70px_rgba(16,185,129,0.08)]"
          />
        </Reveal>

        <Reveal className="mt-12">
          <CTASection
            title="Want to participate instead?"
            subtitle="Participants enter using an access key provided by the tournament organizer."
            gradient="from-fuchsia-500/10 via-cyan-500/10 to-emerald-500/10"
            links={[
              { href: "/tournaments", label: "Tournament format", glow: "shadow-[0_0_60px_rgba(34,211,238,0.12)]" },
              { href: "/rules", label: "Rules", glow: "shadow-[0_0_60px_rgba(16,185,129,0.12)]" },
              { href: "/faq", label: "FAQ", glow: "shadow-[0_0_60px_rgba(255,255,255,0.08)]" },
            ]}
          />
        </Reveal>
      </section>
    </main>
  );
}
