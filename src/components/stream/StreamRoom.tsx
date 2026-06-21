// The streamer's broadcast room: a premium, watch-only view of the live auction
// for members with the 'streamer' role (those who go live on YouTube / Twitch /
// TikTok). It mirrors what a bidder sees — current player, timer, price, who is
// leading and a live bid feed — but never lets the viewer bid.
//
// The view is driven entirely by the shared auction store as a pure listener
// (the streamer logs in with the SPECTATOR role, so the store runs no timer and
// places no bids). Three acts:
//   * before the auction starts  -> an animated welcome card.
//   * while it runs              -> the live broadcast HUD.
//   * once it finishes           -> a thank-you / come-back card.
//
// Mobile-first, tested down to 320px.

"use client";

import { useEffect } from "react";
import { useAuctionStore } from "@/store/auctionStore";
import PlayerCard from "@/components/auction/PlayerCard";

const BRAND = "Full-Stack Developer · ThE_Adrian_One";

function BrandLine() {
  return (
    <p className="text-center text-[11px] font-semibold tracking-wide text-zinc-500 sm:text-xs">
      Broadcast by{" "}
      <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
        {BRAND}
      </span>
    </p>
  );
}

// Soft animated ambience behind the cards — pure decoration, no layout impact.
// Coloured blobs (purple / blue / fuchsia / red / cyan) drift side to side in a
// slow wave so the broadcast backdrop feels alive on stream.
function Ambience() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-28 top-4 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl animate-wave-x" />
      <div className="absolute -right-28 top-1/4 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-wave-x-rev" />
      <div className="absolute -bottom-12 left-1/4 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl animate-wave-x-slow" />
      <div className="absolute bottom-8 right-1/4 h-64 w-64 rounded-full bg-red-500/15 blur-3xl animate-wave-x [animation-delay:-8s]" />
      <div className="absolute top-1/2 left-1/3 h-60 w-60 rounded-full bg-cyan-500/15 blur-3xl animate-wave-x-rev [animation-delay:-5s]" />
    </div>
  );
}

function LivePill({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${
        live
          ? "bg-red-500/15 text-red-200 ring-red-400/30"
          : "bg-white/5 text-zinc-300 ring-white/10"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live ? "bg-red-400 animate-pulse" : "bg-zinc-500"
        }`}
      />
      {live ? "On air" : "Standby"}
    </span>
  );
}

// ── Act 1: welcome (auction not started yet) ─────────────────────────────────
function WelcomeCard({
  eventName,
  countdown,
  starting,
}: {
  eventName: string | null;
  countdown: number;
  starting: boolean;
}) {
  return (
    <div className="relative w-full max-w-2xl animate-scale-in overflow-hidden rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10 shadow-[0_0_80px_rgba(139,92,246,0.18)] sm:p-10">
      {/* sheen sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-sheen" />
      </div>

      <span className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-200 ring-1 ring-violet-400/30">
        Live broadcast
      </span>

      <h1 className="mt-5 text-balance text-2xl font-extrabold tracking-tight text-zinc-100 xs:text-3xl sm:text-4xl">
        Welcome to the{" "}
        <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
          live auction
        </span>
      </h1>

      {eventName && (
        <p className="mt-2 text-base font-bold text-zinc-200 sm:text-lg">{eventName}</p>
      )}

      {starting ? (
        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/80">
            Starting in
          </p>
          <p className="mt-1 text-6xl font-extrabold tabular-nums text-zinc-100 sm:text-7xl animate-pop">
            {countdown}
          </p>
        </div>
      ) : (
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-zinc-300 sm:text-base">
          The camera is open and the room is warming up. The draft will begin shortly —
          stay tuned and get ready for the bidding war. 🔥
        </p>
      )}

      <div className="mt-8">
        <BrandLine />
      </div>
    </div>
  );
}

// ── Act 2: live broadcast HUD ────────────────────────────────────────────────
function Timer({
  status,
  timeRemaining,
  countdown,
  resultMessage,
}: {
  status: string;
  timeRemaining: number;
  countdown: number;
  resultMessage: string | null;
}) {
  if (status === "countdown") {
    return (
      <div className="rounded-3xl bg-amber-500/15 p-5 text-center ring-1 ring-white/10 sm:p-6">
        <p className="mb-2 text-sm font-semibold text-amber-200">Auction starting in</p>
        <p className="text-5xl font-extrabold tabular-nums text-zinc-100 sm:text-6xl">
          {countdown}
        </p>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="rounded-3xl bg-amber-500/15 p-5 text-center ring-1 ring-white/10 sm:p-6">
        <p className="mb-2 text-sm font-semibold text-amber-200">Auction paused</p>
        <p className="text-3xl font-extrabold text-zinc-100">⏸</p>
      </div>
    );
  }

  if (status === "result") {
    return (
      <div className="rounded-3xl bg-cyan-500/12 p-5 text-center ring-1 ring-white/10 sm:p-6">
        <p className="mb-2 text-sm font-semibold text-cyan-200">Result</p>
        <p className="text-base text-zinc-100">{resultMessage ?? "Settling…"}</p>
      </div>
    );
  }

  // active
  return (
    <div
      className={`rounded-3xl p-5 text-center ring-1 ring-white/10 transition sm:p-6 ${
        timeRemaining <= 10
          ? "bg-red-500/18 animate-pulse"
          : timeRemaining <= 15
          ? "bg-orange-500/16"
          : "bg-emerald-500/14"
      }`}
    >
      <p className="mb-2 text-sm font-semibold text-zinc-200">Time remaining</p>
      <p className="text-5xl font-extrabold tabular-nums text-zinc-100 sm:text-6xl">
        {timeRemaining}s
      </p>
    </div>
  );
}

function PricePanel({
  highestUser,
  highestAmount,
  startingBid,
}: {
  highestUser: string | null;
  highestAmount: number | null;
  startingBid: number;
}) {
  const hasBid = highestUser !== null && highestAmount !== null;
  return (
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
        {hasBid ? "Highest bid" : "Starting bid"}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-4xl font-black tabular-nums text-zinc-100 sm:text-5xl">
          ${(hasBid ? highestAmount! : startingBid).toLocaleString()}
        </span>
      </div>
      {hasBid ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-400/20">
          <span className="text-xs uppercase tracking-wide text-emerald-200/80">Leading</span>
          <span className="truncate text-sm font-extrabold text-emerald-100">{highestUser}</span>
        </div>
      ) : (
        <p className="mt-3 text-xs text-zinc-500">No bids yet — waiting for the first offer.</p>
      )}
    </div>
  );
}

function BidFeed({
  bids,
}: {
  bids: { userId: string; username: string; amount: number; timestamp: number }[];
}) {
  // Most recent first, capped so the feed stays readable on small screens.
  const recent = [...bids].slice(-7).reverse();
  return (
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-extrabold tracking-wide text-zinc-100">Live bids</h3>
        <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-200 ring-1 ring-violet-400/25">
          {bids.length}
        </span>
      </div>
      {recent.length === 0 ? (
        <p className="rounded-2xl bg-black/25 p-4 text-center text-xs text-zinc-500 ring-1 ring-white/10">
          Bids will appear here the moment they land.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((b, i) => (
            <li
              key={`${b.userId}-${b.timestamp}`}
              className={`flex items-center justify-between rounded-xl px-3 py-2 ring-1 ${
                i === 0
                  ? "animate-fade-up bg-emerald-500/10 ring-emerald-400/20"
                  : "bg-black/20 ring-white/5"
              }`}
            >
              <span className="truncate text-sm text-zinc-200">{b.username}</span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-100">
                ${b.amount.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoundProgress({
  currentRound,
  roundCurrentIndex,
  roundTotalPlayers,
}: {
  currentRound: number;
  roundCurrentIndex: number;
  roundTotalPlayers: number;
}) {
  const pct = roundTotalPlayers > 0 ? (roundCurrentIndex / roundTotalPlayers) * 100 : 0;
  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="mb-2 flex justify-between text-sm text-zinc-400">
        <span>{currentRound === 1 ? "Initial auction" : `Re-auction round ${currentRound - 1}`}</span>
        <span className="text-zinc-300">
          Player {roundCurrentIndex} of {roundTotalPlayers}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
        <div
          className="h-full bg-gradient-to-r from-violet-400/55 via-fuchsia-400/50 to-cyan-400/50 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Act 3: thank-you (auction finished) ──────────────────────────────────────
function ThankYouCard({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative w-full max-w-2xl animate-scale-in overflow-hidden rounded-3xl bg-white/5 p-6 text-center ring-1 ring-white/10 shadow-[0_0_80px_rgba(34,211,238,0.16)] sm:p-10">
      <div className="text-5xl sm:text-6xl">🎬</div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-zinc-100 xs:text-3xl sm:text-4xl">
        That&apos;s a wrap!
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-300 sm:text-base">
        The auction is complete. Thank you for tuning in and broadcasting the draft —
        you helped make it a show. We can&apos;t wait to see you on the next one! 💜
      </p>

      <button
        type="button"
        onClick={onBack}
        className="mt-8 inline-flex items-center justify-center rounded-2xl bg-violet-500/20 px-6 py-3 text-sm font-bold text-violet-100 ring-1 ring-violet-400/30 transition hover:bg-violet-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
      >
        ← Back to dashboard
      </button>

      <div className="mt-8">
        <BrandLine />
      </div>
    </div>
  );
}

export default function StreamRoom({ onExit }: { onExit: () => void }) {
  const {
    status,
    currentPlayer,
    countdown,
    timeRemaining,
    currentHighestBid,
    bidHistory,
    resultMessage,
    currentRound,
    roundCurrentIndex,
    roundTotalPlayers,
    liveEvent,
    initializeRealtime,
    cleanupRealtime,
  } = useAuctionStore();

  const eventName = liveEvent?.name ?? null;

  // The opening bid shown on the card / price panel mirrors the live event's
  // chosen starting bid, falling back to the player's base price.
  const startingBid =
    liveEvent && liveEvent.bidStart > 0
      ? liveEvent.bidStart
      : currentPlayer?.basePrice ?? 0;

  // Own the realtime lifecycle + anti-drift heartbeat, exactly like the bidder's
  // AuctionBoard, so the broadcast survives dropped realtime events under load.
  useEffect(() => {
    initializeRealtime();

    const heartbeat = setInterval(() => {
      useAuctionStore.getState().reconcile();
    }, 5000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        useAuctionStore.getState().reconcile();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisible);
      cleanupRealtime();
    };
  }, [initializeRealtime, cleanupRealtime]);

  const live = status === "active";

  // Decide the act. Before the first player exists (idle, or a fresh room) we
  // show the welcome card; countdown also counts as "about to start".
  const showWelcome = !currentPlayer || status === "idle";
  const showThanks = status === "finished";

  return (
    <main className="relative min-h-screen px-3 pb-12 pt-4 sm:px-4 sm:pt-6">
      <Ambience />

      <div className="relative mx-auto w-full max-w-6xl">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <LivePill live={live} />
            <span className="text-sm font-semibold tracking-wide text-zinc-200">
              Streamer view
            </span>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:text-sm"
          >
            ← Dashboard
          </button>
        </div>

        {/* Body */}
        {showThanks ? (
          <div className="mt-10 flex justify-center sm:mt-16">
            <ThankYouCard onBack={onExit} />
          </div>
        ) : showWelcome ? (
          <div className="mt-10 flex justify-center sm:mt-16">
            <WelcomeCard
              eventName={eventName}
              countdown={countdown}
              starting={status === "countdown"}
            />
          </div>
        ) : (
          <>
            <div className="mt-6 text-center">
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                {eventName ?? "Live Auction"}
              </h1>
              <div className="mt-1.5">
                <BrandLine />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start lg:gap-7">
              {/* Center on desktop, first on mobile: the live player. */}
              <div className="order-1 flex justify-center lg:order-2">
                {currentPlayer && (
                  <PlayerCard player={currentPlayer} startingBid={startingBid} />
                )}
              </div>

              {/* Timer + price — second on mobile, left column on desktop. */}
              <div className="order-2 flex flex-col gap-5 lg:order-1">
                <Timer
                  status={status}
                  timeRemaining={timeRemaining}
                  countdown={countdown}
                  resultMessage={resultMessage}
                />
                <PricePanel
                  highestUser={currentHighestBid?.username ?? null}
                  highestAmount={currentHighestBid?.amount ?? null}
                  startingBid={startingBid}
                />
              </div>

              {/* Live bids — last on mobile, right column on desktop. */}
              <div className="order-3 flex flex-col gap-5 lg:order-3">
                <BidFeed bids={bidHistory} />
              </div>
            </div>

            <div className="mt-6">
              <RoundProgress
                currentRound={currentRound}
                roundCurrentIndex={roundCurrentIndex}
                roundTotalPlayers={roundTotalPlayers}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
