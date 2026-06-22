// The member dashboard shell. Loads the signed-in Discord profile, then renders
// a persistent identity header + a section navbar whose tabs depend on the
// member's roles (a member can hold several at once). Each section is its own
// component; this file owns data loading, the active section and the red-dot
// notifications. Mobile-first.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountService } from "@/services/accountService";
import { AuctionEngine } from "@/services/auctionEngine";
import { EventsService } from "@/services/eventsService";
import { CommunityEventsService } from "@/services/communityEventsService";
import { supabase } from "@/lib/supabase";
import { Profile, WOTBLITZ_ROLE, BIDDER_ROLE, STREAMER_ROLE, EXCLUDED_ROLE } from "@/types/account.types";
import { AuctionEvent, MyEventResults } from "@/types/event.types";
import { CommunityEvent } from "@/types/community-event.types";
import { registrationState } from "@/components/admin/communityEventMeta";
import { roleMeta } from "@/components/admin/roleMeta";
import AccountMenu, { AccountAvatar } from "@/app/_components/AccountMenu";
import ExcludedScreen from "@/app/_components/ExcludedScreen";
import Logo from "@/app/_components/Logo";
import MemberEvents from "@/components/community/MemberEvents";
import TournamentsView from "@/components/tournaments/TournamentsView";
import MemberContactForm from "@/components/contact/MemberContactForm";
import DiscordCard from "@/components/contact/DiscordCard";
import MemberNav, { MemberNavItem } from "@/components/dashboard/MemberNav";
import WelcomeSection from "@/components/dashboard/sections/WelcomeSection";
import ProfileSection, { DashboardNotice } from "@/components/dashboard/sections/ProfileSection";
import AuctionsSection from "@/components/dashboard/sections/AuctionsSection";
import StreamingSection from "@/components/dashboard/sections/StreamingSection";
import ResultsSection from "@/components/dashboard/sections/ResultsSection";

const SEEN_KEY = "dashboard_seen_notices";

function loadSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [liveEvent, setLiveEvent] = useState<AuctionEvent | null>(null);
  const [myResults, setMyResults] = useState<MyEventResults[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen());

  // Load the role-dependent data once we know the profile's roles.
  const loadRoleData = useCallback((p: Profile) => {
    // Both bidders and streamers need to know about the live auction (to enter /
    // to broadcast); only bidders have personal results.
    if (p.roles.includes(BIDDER_ROLE) || p.roles.includes(STREAMER_ROLE)) {
      EventsService.getLiveEvent().then((ev) => setLiveEvent(ev));
    }
    if (p.roles.includes(BIDDER_ROLE)) {
      EventsService.listMyResults(p.id).then((r) => setMyResults(r));
    }
    if (p.roles.includes(BIDDER_ROLE) || p.roles.includes(WOTBLITZ_ROLE)) {
      Promise.all([
        CommunityEventsService.listEvents(),
        CommunityEventsService.listMyRegisteredEventIds(),
      ]).then(([all, mine]) => {
        setEvents(all.filter((e) => e.kind === "event"));
        setRegisteredIds(mine);
      });
    }
  }, []);

  // Re-load the profile (and its role-dependent data) after consent / linking,
  // so a guest who just consented flips to their new WoT Blitz profile.
  const refresh = useCallback(async () => {
    const p = await AccountService.getMyProfile();
    if (p) {
      setProfile(p);
      loadRoleData(p);
    }
  }, [loadRoleData]);

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

  // Streamers join the broadcast room; the /stream page provisions their
  // watch-only seat (enter_auction_as_streamer) on arrival.
  const handleJoinStream = () => {
    router.push("/stream");
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
        loadRoleData(p);
      } else {
        settled = true;
        router.replace("/login");
      }
    };

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
  }, [router, loadRoleData]);

  // Keep the auction countdown live and flip to the enter button when a
  // scheduled auction opens (re-checking the event every 15s).
  useEffect(() => {
    const opensAtMs = liveEvent?.opensAt ? new Date(liveEvent.opensAt).getTime() : null;
    if (liveEvent?.status !== "live" || opensAtMs === null || opensAtMs <= Date.now()) return;
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    const refetch = setInterval(() => {
      EventsService.getLiveEvent().then((ev) => {
        if (ev) setLiveEvent(ev);
      });
    }, 15000);
    return () => {
      clearInterval(tick);
      clearInterval(refetch);
    };
  }, [liveEvent]);

  const roles = useMemo(() => profile?.roles ?? [], [profile]);
  const hasAdmin = roles.includes("admin");
  const hasBidder = roles.includes(BIDDER_ROLE);
  const hasStreamer = roles.includes(STREAMER_ROLE);
  const hasWotBlitz = roles.includes(WOTBLITZ_ROLE);
  const isGuestOnly = !hasAdmin && !hasBidder && !hasStreamer && !hasWotBlitz;

  // Events this member registered for + the ones open to their roles right now.
  const myRegistrations = useMemo(
    () => events.filter((e) => registeredIds.has(e.id)),
    [events, registeredIds]
  );
  const openEventsForMe = useMemo(
    () =>
      events.filter(
        (e) =>
          e.visibleRoles.some((r) => roles.includes(r)) &&
          registrationState(e.registrationOpensAt, e.registrationClosesAt) === "open"
      ),
    [events, roles]
  );

  // Notifications: a live auction (bidders) and any open event for the member.
  const notices: (DashboardNotice & { tab: string })[] = useMemo(() => {
    const out: (DashboardNotice & { tab: string })[] = [];
    if (hasBidder && liveEvent && liveEvent.status === "live") {
      out.push({
        id: `auction:${liveEvent.id}`,
        kind: "auction",
        title: liveEvent.name,
        detail: "A live auction is open",
        tab: "auctions",
      });
    }
    if (hasStreamer && liveEvent && liveEvent.status === "live") {
      out.push({
        id: `stream:${liveEvent.id}`,
        kind: "auction",
        title: liveEvent.name,
        detail: "An auction is live to broadcast",
        tab: "streaming",
      });
    }
    for (const e of openEventsForMe) {
      out.push({
        id: `event:${e.id}`,
        kind: "event",
        title: e.title,
        detail: "Registration is open",
        tab: "events",
      });
    }
    return out;
  }, [hasBidder, hasStreamer, liveEvent, openEventsForMe]);

  const unseenNotices = notices.filter((n) => !seen.has(n.id));

  const markTabSeen = useCallback(
    (tab: string) => {
      const ids = notices.filter((n) => n.tab === tab && !seen.has(n.id)).map((n) => n.id);
      if (ids.length === 0) return;
      setSeen((prev) => {
        const next = new Set(prev);
        ids.forEach((i) => next.add(i));
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(next)));
        }
        return next;
      });
    },
    [notices, seen]
  );

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

  // Excluded members never see the dashboard.
  if (roles.includes(EXCLUDED_ROLE)) {
    return <ExcludedScreen />;
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Sections (tabs). Welcome stays leftmost (secondary once a game is chosen);
  // Profile is primary for WoT Blitz members.
  const navItems: MemberNavItem[] = [
    { id: "welcome", label: "Welcome" },
    ...(hasWotBlitz ? [{ id: "profile", label: "Profile" }] : []),
    ...(hasBidder
      ? [
          { id: "auctions", label: "Auctions", dot: unseenNotices.some((n) => n.tab === "auctions") },
          { id: "results", label: "Results" },
        ]
      : []),
    ...(hasStreamer
      ? [{ id: "streaming", label: "Streaming", dot: unseenNotices.some((n) => n.tab === "streaming") }]
      : []),
    ...(hasWotBlitz || hasBidder
      ? [
          { id: "events", label: "Events", dot: unseenNotices.some((n) => n.tab === "events") },
          { id: "tournaments", label: "Tournaments" },
        ]
      : []),
    { id: "contact", label: "Contact" },
  ];

  const defaultSection = hasWotBlitz
    ? "profile"
    : hasBidder
      ? "auctions"
      : hasStreamer
        ? "streaming"
        : "welcome";
  const active = activeSection ?? defaultSection;

  const selectSection = (id: string) => {
    setActiveSection(id);
    markTabSeen(id);
  };

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

        {/* Identity header */}
        <div className="mt-8 flex animate-fade-up flex-col items-center gap-4 text-center sm:mt-10">
          <AccountAvatar avatarUrl={profile.avatarUrl} name={profile.username} size={88} />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
              Welcome, {profile.username}
            </h1>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {profile.roles.map((r) => {
                const meta = roleMeta(r);
                return (
                  <span
                    key={r}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${meta.chip}`}
                  >
                    {meta.label}
                  </span>
                );
              })}
              <span className="text-xs text-zinc-500">Member since {memberSince}</span>
            </div>
          </div>
        </div>

        {/* Admin shortcut */}
        {hasAdmin && (
          <div className="mt-6 animate-fade-up rounded-2xl bg-fuchsia-400/10 p-5 ring-1 ring-fuchsia-400/25">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-xs uppercase tracking-wide text-fuchsia-200/80">Admin access</p>
                <p className="text-lg font-extrabold text-fuchsia-100">You have admin rights</p>
              </div>
              <Link
                href="/admin"
                className="w-full shrink-0 rounded-2xl bg-fuchsia-500/20 px-6 py-3 text-center text-sm font-bold text-fuchsia-100 ring-1 ring-fuchsia-400/30 transition hover:bg-fuchsia-500/30 active:scale-[0.98] sm:w-auto"
              >
                Open admin dashboard →
              </Link>
            </div>
          </div>
        )}

        {/* Section navbar */}
        <div className="mt-6 animate-fade-up sm:mt-8">
          <MemberNav items={navItems} active={active} onSelect={selectSection} />
        </div>

        {/* Active section */}
        <div className="mt-6 animate-fade-up">
          {active === "welcome" && (
            <WelcomeSection profile={profile} memberSince={memberSince} onConsented={refresh} />
          )}

          {active === "profile" && hasWotBlitz && (
            <ProfileSection
              profile={profile}
              registrations={myRegistrations}
              notices={hasBidder ? unseenNotices : []}
              onRefresh={refresh}
            />
          )}

          {active === "auctions" && hasBidder && (
            <AuctionsSection
              liveEvent={liveEvent}
              nowMs={nowMs}
              entering={entering}
              enterError={enterError}
              onEnter={handleEnterAuction}
            />
          )}

          {active === "results" && hasBidder && <ResultsSection results={myResults} />}

          {active === "streaming" && hasStreamer && (
            <StreamingSection liveEvent={liveEvent} nowMs={nowMs} onJoin={handleJoinStream} />
          )}

          {active === "events" && (hasWotBlitz || hasBidder) && (
            <MemberEvents roles={profile.roles} onChanged={refresh} />
          )}

          {active === "tournaments" && (hasWotBlitz || hasBidder) && (
            <TournamentsView myProfileId={profile.id} />
          )}

          {active === "contact" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-100">Contact &amp; support</h2>
                <p className="text-sm text-zinc-400">
                  Send a request, report an issue or share an idea. I&apos;ll reply by email — or
                  reach me on Discord for a faster answer.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
                <MemberContactForm
                  initialName={profile.blitz?.nickname ?? profile.username}
                />
                <DiscordCard />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
