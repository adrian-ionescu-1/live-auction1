//
// Dedicated area for people who signed in with Discord (real accounts).
// Key-based auction participants never land here — they go straight to the
// auction room. The top bar reuses the shared <AccountMenu /> card (avatar +
// Home + Log out), the same one shown on the navbar and the auction screens.
//
// For now it shows the account identity + role and a few "coming soon" cards.
// We grow the member-only features here over time.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountService } from "@/services/accountService";
import { AuctionEngine } from "@/services/auctionEngine";
import { EventsService } from "@/services/eventsService";
import { supabase } from "@/lib/supabase";
import { Profile, DEFAULT_ACCOUNT_ROLE, BIDDER_ROLE } from "@/types/account.types";
import { AuctionEvent, MyEventResults } from "@/types/event.types";
import { GradientCard } from "@/app/_components/ui";
import AccountMenu, { AccountAvatar } from "@/app/_components/AccountMenu";
import Logo from "@/app/_components/Logo";

type RoleStyle = { label: string; chip: string };

// Known roles get a nicer label/color; anything else falls back gracefully so
// admins can invent new roles without touching the code.
const ROLE_STYLES: Record<string, RoleStyle> = {
  guest: {
    label: "Guest",
    chip: "bg-amber-400/15 text-amber-200 ring-amber-400/30",
  },
  prime: {
    label: "Prime",
    chip: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30",
  },
  admin: {
    label: "Admin",
    chip: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-400/30",
  },
};

function roleStyle(role: string): RoleStyle {
  return (
    ROLE_STYLES[role.toLowerCase()] ?? {
      label: role.charAt(0).toUpperCase() + role.slice(1),
      chip: "bg-white/10 text-zinc-200 ring-white/15",
    }
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [liveEvent, setLiveEvent] = useState<AuctionEvent | null>(null);
  const [myResults, setMyResults] = useState<MyEventResults[]>([]);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  // A bidder joins the live auction: provision their participant on the server,
  // then enter the auction room (the room hydrates from this session).
  const handleEnterAuction = async () => {
    setEntering(true);
    setEnterError(null);
    const res = await AuctionEngine.enterAuctionAsMember();
    if (res.success && res.userId) {
      sessionStorage.setItem("auction_user_id", res.userId);
      sessionStorage.setItem("auction_user_role", "USER");
      router.push("/login");
    } else {
      setEnterError(res.error ?? "Could not join the auction");
      setEntering(false);
    }
  };

  useEffect(() => {
    let settled = false;

    const resolve = async () => {
      if (settled) return;
      const p = await AccountService.getMyProfile();
      if (settled) return;
      if (p) {
        settled = true;
        setProfile(p);
        setLoading(false);
        // Bidders need the live event (to join) and their past results.
        if (p.role.toLowerCase() === BIDDER_ROLE) {
          EventsService.getLiveEvent().then((ev) => setLiveEvent(ev));
          EventsService.listMyResults(p.id).then((r) => setMyResults(r));
        }
      } else {
        settled = true;
        router.replace("/login");
      }
    };

    // Wait for Supabase to finish parsing the OAuth redirect before deciding.
    // - session present (INITIAL_SESSION / SIGNED_IN) -> load the profile.
    // - INITIAL_SESSION with no session -> genuinely signed out -> /login.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return;
      if (session?.user) {
        void resolve();
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        settled = true;
        router.replace("/login");
      }
    });

    return () => {
      settled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          Loading your dashboard…
        </div>
      </main>
    );
  }

  const role = roleStyle(profile.role);
  const isGuest = profile.role.toLowerCase() === DEFAULT_ACCOUNT_ROLE;
  const isBidder = profile.role.toLowerCase() === BIDDER_ROLE;
  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="relative min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            <Logo className="h-9 w-9" />
            <span className="text-sm font-semibold tracking-wide">Auction App</span>
          </Link>

          <AccountMenu />
        </div>

        {/* Hero */}
        <div className="mt-8 flex animate-fade-up flex-col items-center gap-4 text-center sm:mt-10">
          <AccountAvatar
            avatarUrl={profile.avatarUrl}
            name={profile.username}
            size={88}
          />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
              Welcome, {profile.username}
            </h1>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${role.chip}`}
              >
                {role.label}
              </span>
              <span className="text-xs text-zinc-500">Member since {memberSince}</span>
            </div>
          </div>
        </div>

        {/* Bidder: enter the live auction (only when an event is open) */}
        {isBidder &&
          (liveEvent && liveEvent.status === "live" ? (
            <div className="mt-8 animate-fade-up rounded-2xl bg-emerald-400/10 p-5 ring-1 ring-emerald-400/25 sm:mt-10">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-200/80">
                    Live event
                  </p>
                  <p className="text-lg font-extrabold text-emerald-100">{liveEvent.name}</p>
                  <p className="mt-1 text-xs text-emerald-200/80">
                    Take {liveEvent.playerLimit} players · budget $
                    {liveEvent.totalReserve.toLocaleString()} (reserve applied automatically).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleEnterAuction}
                  disabled={entering}
                  className="w-full shrink-0 rounded-2xl bg-emerald-500/20 px-6 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-60 sm:w-auto"
                >
                  {entering ? "Joining…" : `Enter ${liveEvent.name} →`}
                </button>
              </div>
              {enterError && (
                <p className="mt-3 text-center text-xs font-semibold text-red-200">
                  {enterError}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-8 animate-fade-up rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:mt-10">
              <p className="text-center text-sm font-semibold text-zinc-200">
                You&apos;re approved to bid.
              </p>
              <p className="mt-1 text-center text-xs text-zinc-500">
                {liveEvent && liveEvent.status === "finished"
                  ? `“${liveEvent.name}” has closed. Your results are below. The next event will appear here when the admin opens one.`
                  : "There’s no live auction event yet. The button to enter the room will appear here as soon as the admin creates one."}
              </p>
            </div>
          ))}

        {/* Bidder: my results across events */}
        {isBidder && myResults.length > 0 && (
          <section className="mt-8 animate-fade-up sm:mt-10">
            <h2 className="text-lg font-extrabold text-zinc-100 sm:text-xl">My results</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Players you took by bidding, and any received through the random distribution.
            </p>
            <div className="mt-4 space-y-4">
              {myResults.map((ev) => {
                const won = ev.results.filter((r) => !r.viaRandom);
                const random = ev.results.filter((r) => r.viaRandom);
                const spent = won.reduce((s, r) => s + r.amount, 0);
                return (
                  <div
                    key={ev.eventId}
                    className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-zinc-100">{ev.eventName}</span>
                      <span className="flex items-center gap-2">
                        {ev.status === "finished" && (
                          <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-400/25">
                            Closed
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">
                          {ev.results.length} players · ${spent.toLocaleString()} spent
                        </span>
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                          Won by bidding ({won.length})
                        </p>
                        {won.length === 0 ? (
                          <p className="text-xs text-zinc-500">None.</p>
                        ) : (
                          <ul className="space-y-1">
                            {won.map((r) => (
                              <li
                                key={r.playerId}
                                className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-1.5 text-sm ring-1 ring-white/10"
                              >
                                <span className="min-w-0 flex-1 truncate text-zinc-200">
                                  {r.playerName}
                                </span>
                                <span className="shrink-0 tabular-nums text-zinc-400">
                                  ${r.amount.toLocaleString()}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fuchsia-200/80">
                          Received random ({random.length})
                        </p>
                        {random.length === 0 ? (
                          <p className="text-xs text-zinc-500">None.</p>
                        ) : (
                          <ul className="space-y-1">
                            {random.map((r) => (
                              <li
                                key={r.playerId}
                                className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-1.5 text-sm ring-1 ring-white/10"
                              >
                                <span className="min-w-0 flex-1 truncate text-zinc-200">
                                  {r.playerName}
                                </span>
                                <span className="shrink-0 text-xs font-semibold text-fuchsia-200">
                                  Free
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pending-role notice for fresh accounts */}
        {isGuest && (
          <div className="mt-8 animate-fade-up rounded-2xl bg-amber-400/10 p-4 ring-1 ring-amber-400/25 sm:mt-10">
            <p className="text-center text-sm text-amber-100">
              Your account is set up! You currently have the{" "}
              <span className="font-semibold">Guest</span> role. An admin will assign
              your full role soon — new features will unlock here once that happens.
            </p>
          </div>
        )}

        {/* Cards */}
        <div className="mt-6 grid animate-fade-up gap-5 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Account details */}
          <GradientCard className="p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Account
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Username</dt>
                <dd className="truncate font-semibold text-zinc-100">
                  {profile.username}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Role</dt>
                <dd className="font-semibold text-zinc-100">{role.label}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Signed in via</dt>
                <dd className="font-semibold text-zinc-100">Discord</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Member since</dt>
                <dd className="font-semibold text-zinc-100">{memberSince}</dd>
              </div>
            </dl>
          </GradientCard>

          {/* Quick links */}
          <GradientCard className="p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Explore
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link
                href="/tournaments"
                className="rounded-xl bg-white/5 px-3 py-2.5 font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Tournaments
              </Link>
              <Link
                href="/spectator"
                className="rounded-xl bg-white/5 px-3 py-2.5 font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Watch as spectator
              </Link>
              <Link
                href="/rules"
                className="rounded-xl bg-white/5 px-3 py-2.5 font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Rules
              </Link>
            </div>
          </GradientCard>

          {/* Coming soon */}
          <GradientCard className="p-6">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Coming soon
            </div>
            <p className="mt-4 text-sm text-zinc-400">
              Member features are on the way — personal stats, saved squads and
              tournament entries will appear here as we roll them out.
            </p>
            <span className="mt-4 inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400 ring-1 ring-white/10">
              In development
            </span>
          </GradientCard>
        </div>
      </div>
    </main>
  );
}
