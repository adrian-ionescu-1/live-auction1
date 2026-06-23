import type { Metadata } from "next";
import SiteHeader from "../_components/SiteHeader";
import CTASection from "../_components/CTASection";
import Reveal from "../_components/Reveal";
import { Badge, GlowLink, InfoCard, Divider } from "../_components/ui";

export const metadata: Metadata = {
  title: "Streamers • Auction App",
  description:
    "There are no spectators anymore — only streamers. Approved community members get the Streamer role and broadcast the live draft (timer, prices, bids) on YouTube, Twitch or TikTok.",
};

export default function StreamersPage() {
  return (
    <main className="relative min-h-screen text-zinc-100">
      <SiteHeader subtitle="Streamers" />

      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-10 pb-16 sm:px-6">
        <div className="inline-flex animate-fade-up flex-wrap items-center gap-2">
          <Badge>STREAMER PROGRAM</Badge>
          <Badge>LIVE BROADCAST</Badge>
          <Badge>WATCH-ONLY</Badge>
          <Badge>NO ACCESS KEYS</Badge>
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="animate-fade-up [animation-delay:80ms]">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Go live and broadcast the{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
                draft
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-zinc-300">
              We retired the old spectator mode and access keys. Now there are only{" "}
              <span className="font-semibold text-violet-200">streamers</span>: community
              members who go live on YouTube, Twitch or TikTok. Ask an admin on Discord for
              the Streamer role and the broadcast room opens automatically whenever an auction
              is live — no keys, nothing to set up.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <GlowLink href="/login" glow="shadow-[0_0_60px_rgba(139,92,246,0.16)]">
                Sign in with Discord <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/tournaments" glow="shadow-[0_0_60px_rgba(34,211,238,0.12)]">
                Tournament format <span aria-hidden>→</span>
              </GlowLink>
              <GlowLink href="/faq" glow="shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                FAQ <span aria-hidden>→</span>
              </GlowLink>
            </div>

            <div className="mt-8 rounded-3xl bg-black/30 p-6 ring-1 ring-white/10">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                What the broadcast room shows
              </div>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-violet-300">•</span>
                  An animated welcome card while the room warms up
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-300">•</span>
                  The current player card with a big live timer
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-300">•</span>
                  Current price, who is leading and a live bid feed
                </li>
                <li className="flex gap-2">
                  <span className="text-violet-300">•</span>
                  A thank-you / come-back card when the auction ends
                </li>
              </ul>
            </div>
          </div>

          {/* Preview HUD */}
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold tracking-wide">STREAMER HUD</div>
                <div className="text-xs text-zinc-400">Watch-only • Live view</div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-1 text-xs font-bold text-red-200 ring-1 ring-red-400/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> On air
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
                  <div className="mt-1 text-xs text-zinc-400">BATTLES • WR • AVG DMG</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-400">Highest bid</div>
                  <div className="text-2xl font-extrabold">$215</div>
                </div>
              </div>

              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                <div className="h-full w-[70%] bg-gradient-to-r from-violet-400/45 via-fuchsia-400/45 to-cyan-400/45" />
              </div>

              <div className="mt-4 grid gap-2 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="text-zinc-400">Leading</span>
                  <span className="font-semibold text-emerald-200">team_falcon</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <span className="text-zinc-400">Last bid</span>
                  <span className="font-semibold text-zinc-100">+$15</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-zinc-400">Watch-only</div>
                <div className="mt-1 text-sm font-semibold">No bidding controls</div>
                <div className="mt-1 text-xs text-zinc-400">
                  Streamers follow the action; they never place bids.
                </div>
              </div>
              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs text-zinc-400">Fully automated</div>
                <div className="mt-1 text-sm font-semibold">No access keys</div>
                <div className="mt-1 text-xs text-zinc-400">
                  The room opens by itself when an auction goes live.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Divider via="via-violet-400/25" />
        </div>

        {/* Cards */}
        <Reveal className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard
            title="Premium overlay"
            desc="A clean, animated HUD built to look great on stream — readable at a glance for your viewers."
            glow="shadow-[0_0_70px_rgba(139,92,246,0.12)]"
          />
          <InfoCard
            title="Real-time updates"
            desc="The same live timer, prices and bids everyone in the room sees — no refresh, no drift."
            glow="shadow-[0_0_70px_rgba(236,72,153,0.10)]"
          />
          <InfoCard
            title="One tap to go live"
            desc="From your dashboard, join the camera the moment an auction opens. Leave any time, re-enter if it reopens."
            glow="shadow-[0_0_70px_rgba(34,211,238,0.08)]"
          />
        </Reveal>

        <Reveal className="mt-12">
          <CTASection
            title="Want to broadcast the next auction?"
            subtitle="Sign in with Discord, then ask an admin to grant you the Streamer role."
            gradient="from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10"
            links={[
              { href: "/login", label: "Sign in with Discord", glow: "shadow-[0_0_60px_rgba(139,92,246,0.16)]" },
              { href: "/tournaments", label: "Tournament format", glow: "shadow-[0_0_60px_rgba(34,211,238,0.12)]" },
              { href: "/contact", label: "Contact", glow: "shadow-[0_0_60px_rgba(16,185,129,0.12)]" },
              { href: "/faq", label: "FAQ", glow: "shadow-[0_0_60px_rgba(255,255,255,0.08)]" },
            ]}
          />
        </Reveal>
      </section>
    </main>
  );
}
