"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuctionStore } from "@/store/auctionStore";
import { AuthService } from "@/services/authService";
import { UserRole } from "@/types/auction.types";
import LoginPage from "@/components/auth/LoginPage";
import AuctionBoard from "@/components/auction/AuctionBoard";
import BidControls from "@/components/auction/BidControls";
import AdminControls from "@/components/auction/AdminControls";
import UserBalance from "@/components/auction/UserBalance";
import BidHistory from "@/components/auction/BidHistory";
import ResultBanner from "@/components/auction/ResultBanner";
import AdminUserCards from "@/components/auction/AdminUserCards";
import ResultsView from "@/components/auction/ResultsView";
import BiddersList from "@/components/auction/BiddersList";
import AccountMenu from "@/app/_components/AccountMenu";

export default function AuctionRoomPage() {
  const router = useRouter();
  const { currentUserId, currentUserRole, users, status, login, logout } =
    useAuctionStore();

  const [hydrated, setHydrated] = useState(false);
  const [redirectingAdmin, setRedirectingAdmin] = useState(false);

  // Fresh key login from the form. Admins land on their dashboard instead of the
  // auction room; from there they can open the room when they want to run it.
  // (Hydrating an existing session calls store.login directly, so returning to
  // /login as an already-signed-in admin still shows the room — no redirect.)
  const handleKeyLogin = async (userId: string, role: UserRole) => {
    if (role === "ADMIN") setRedirectingAdmin(true);
    await login(userId, role);
    if (role === "ADMIN") router.replace("/admin");
  };

  // Persist the logged-in username for the public SiteHeader to read.
  // (UI-only: the header lives on marketing pages and must not import the
  // auction store / Supabase client.)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentUserId) {
      const u = users.find((x) => x.id === currentUserId);
      if (u) sessionStorage.setItem("auction_user_name", u.username);
    } else {
      sessionStorage.removeItem("auction_user_name");
    }
    // Tell the shared account card to re-read (same-tab writes don't fire the
    // native "storage" event).
    window.dispatchEvent(new Event("account-session"));
  }, [currentUserId, users]);

  useEffect(() => {
    (async () => {
      const savedId = sessionStorage.getItem("auction_user_id");
      const savedRole = sessionStorage.getItem("auction_user_role");

      if (savedId && savedRole) {
        const user = await AuthService.getUserById(savedId);

        if (user) {
          await login(user.id, user.role);
        } else {
          sessionStorage.removeItem("auction_user_id");
          sessionStorage.removeItem("auction_user_role");
        }
      }

      setHydrated(true);
    })();
  }, [login]);

  if (!hydrated) {
    return null;
  }

  // Admin just logged in from the form — keep the room hidden until we navigate
  // to the dashboard, so it never flashes.
  if (redirectingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          Opening admin dashboard…
        </div>
      </main>
    );
  }

  // Back button (UI only) – shown on the pre-login screen, where there is no
  // account card yet.
  const BackToHome = () => (
    <div className="fixed left-3 top-3 z-50 sm:left-4 sm:top-4">
      <Link
        href="/"
        className="group relative inline-flex items-center gap-2 rounded-xl bg-black/40 px-3 py-2 text-xs text-zinc-200 ring-1 ring-white/10 backdrop-blur transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:px-4 sm:text-sm"
      >
        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_40px_rgba(34,211,238,0.10)]" />
        <span className="relative">
          <span aria-hidden>←</span>{" "}
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Home</span>
        </span>
      </Link>
    </div>
  );

  // Account card (UI only) – shown once signed in, replacing the back button.
  // Gives key participants (admin / user / spectator) the same identity + Home
  // + Log out card used everywhere else.
  const AccountTopBar = () => (
    <div className="fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
      <AccountMenu loggedOutCta={false} />
    </div>
  );

  if (!currentUserId || !currentUserRole) {
    return (
      <>
        <BackToHome />
        <LoginPage onLogin={handleKeyLogin} />
      </>
    );
  }

  // A member leaving the finished auction goes back to their dashboard; the
  // closed event can't be re-entered, so we drop the auction session too.
  const handleReturnToDashboard = () => {
    logout();
    router.push("/dashboard");
  };

  if (status === "finished" && currentUserRole !== "ADMIN") {
    return (
      <>
        <AccountTopBar />
        <ResultsView onClose={handleReturnToDashboard} />
      </>
    );
  }

  return (
    <main className="relative min-h-screen px-3 pb-10 pt-16 sm:px-4 sm:py-8">
      <AccountTopBar />

      {/* No page-wide card: the global background shows through; each panel
          carries its own surface. */}
      <div className="mx-auto max-w-7xl animate-fade-up">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl lg:text-5xl">
            Live{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
              Auction System
            </span>
          </h1>
          <p className="text-sm font-semibold text-zinc-400">
            Built by{" "}
            <span className="text-emerald-300">The Adrian One</span>{" "}
            — Full-Stack Developer
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Center on desktop, first on mobile: the live player + timer */}
          <div className="order-1 flex flex-col items-center animate-fade-up [animation-delay:80ms] lg:order-2">
            <AuctionBoard />
          </div>

          {/* Bidding — second on mobile, right column on desktop.
              Admins can't bid, so they get the live Bidders list instead. */}
          <div className="order-2 flex flex-col items-center gap-6 animate-fade-up [animation-delay:140ms] lg:order-3">
            {currentUserRole === "ADMIN" ? <BiddersList /> : <BidControls />}
          </div>

          {/* Balance / admin / history — left column on desktop, last on mobile.
              Admins don't bid, so their identity/log-out lives in the top-right
              account card; no balance panel for them. */}
          <div className="order-3 flex flex-col items-center gap-6 animate-fade-up [animation-delay:200ms] lg:order-1">
            {currentUserRole !== "ADMIN" && <UserBalance />}
            {currentUserRole === "ADMIN" && <AdminControls />}
            <BidHistory />
          </div>
        </div>

        {currentUserRole === "ADMIN" && (
          <div className="mt-8 animate-fade-up">
            <AdminUserCards />
          </div>
        )}
      </div>

      <ResultBanner />
    </main>
  );
}
