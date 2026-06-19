// src/app/_legacy_home/page.tsx

"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuctionStore } from "@/store/auctionStore";
import { AuthService } from "@/services/authService";
import LoginPage from "@/components/LoginPage";
import AuctionBoard from "@/components/AuctionBoard";
import BidControls from "@/components/BidControls";
import AdminControls from "@/components/AdminControls";
import UserBalance from "@/components/UserBalance";
import BidHistory from "@/components/BidHistory";
import ResultBanner from "@/components/ResultBanner";
import AdminUserCards from "@/components/AdminUserCards";
import ResultsView from "@/components/ResultsView";

export default function LegacyHome() {
  const { currentUserId, currentUserRole, users, status, login, dismissResults } =
    useAuctionStore();

  const [hydrated, setHydrated] = useState(false);

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

  // Back button (UI only) – shown on login + app + results
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

  if (!currentUserId || !currentUserRole) {
    return (
      <>
        <BackToHome />
        <LoginPage onLogin={login} />
      </>
    );
  }

  const handleCloseResults = () => {
    dismissResults();
  };

  if (status === "finished" && currentUserRole !== "ADMIN") {
    return (
      <>
        <BackToHome />
        <ResultsView onClose={handleCloseResults} />
      </>
    );
  }

  return (
    <main className="relative min-h-screen px-3 pb-10 pt-16 sm:px-4 sm:py-8">
      <BackToHome />

      {/* subtle overlay to keep readability over the global background */}
      <div className="mx-auto max-w-7xl animate-fade-up rounded-3xl bg-black/30 p-4 ring-1 ring-white/10 backdrop-blur-sm sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl lg:text-5xl">
            Live{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
              Auction System
            </span>
          </h1>
          <p className="text-sm font-semibold text-zinc-400">
            Built by{" "}
            <a
              href="https://the-adrian-one.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 underline-offset-4 transition hover:text-emerald-200 hover:underline"
            >
              The Adrian One
            </a>{" "}
            — Full-Stack Developer
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Center on desktop, first on mobile: the live player + timer */}
          <div className="order-1 flex flex-col items-center animate-fade-up [animation-delay:80ms] lg:order-2">
            <AuctionBoard />
          </div>

          {/* Bidding — second on mobile, right column on desktop */}
          <div className="order-2 flex flex-col items-center gap-6 animate-fade-up [animation-delay:140ms] lg:order-3">
            <BidControls />
          </div>

          {/* Balance / admin / history — left column on desktop, last on mobile */}
          <div className="order-3 flex flex-col items-center gap-6 animate-fade-up [animation-delay:200ms] lg:order-1">
            <UserBalance />
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
