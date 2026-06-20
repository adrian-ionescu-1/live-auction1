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
import { supabase } from "@/lib/supabase";
import { Profile, DEFAULT_ACCOUNT_ROLE, BIDDER_ROLE } from "@/types/account.types";
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

        {/* Bidder: enter the live auction */}
        {isBidder && (
          <div className="mt-8 animate-fade-up rounded-2xl bg-emerald-400/10 p-5 ring-1 ring-emerald-400/25 sm:mt-10">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-sm font-semibold text-emerald-100">
                  You&apos;re approved to bid.
                </p>
                <p className="mt-1 text-xs text-emerald-200/80">
                  Join the live auction room to place bids. The admin sets your budget.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEnterAuction}
                disabled={entering}
                className="w-full shrink-0 rounded-2xl bg-emerald-500/20 px-6 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:opacity-60 sm:w-auto"
              >
                {entering ? "Joining…" : "Enter the auction →"}
              </button>
            </div>
            {enterError && (
              <p className="mt-3 text-center text-xs font-semibold text-red-200">
                {enterError}
              </p>
            )}
          </div>
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
