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
  const { currentUserId, currentUserRole, status, login, dismissResults } =
    useAuctionStore();

  const [hydrated, setHydrated] = useState(false);

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
    <div className="fixed left-4 top-4 z-50">
      <Link
        href="/"
        className="group relative inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-zinc-200 ring-1 ring-white/10 hover:bg-white/10 transition active:scale-[0.98]"
      >
        <span className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition shadow-[0_0_40px_rgba(34,211,238,0.10)]" />
        <span className="relative">← Back to Home</span>
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
    <main className="min-h-screen py-8 px-4 relative">
      <BackToHome />

      {/* subtle overlay to keep readability over the global background */}
      <div className="max-w-7xl mx-auto rounded-3xl bg-black/30 ring-1 ring-white/10 backdrop-blur-sm p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-100 mb-2 sm:text-4xl lg:text-5xl">
            Live Auction System
          </h1>
          <p className="text-zinc-300 font-semibold">
            Created by Adrian — Full-Stack Developer | Discord:{" "}
            <span className="text-emerald-300">_the_adrian_</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <UserBalance />
            {currentUserRole === "ADMIN" && <AdminControls />}
            <BidHistory />
          </div>

          <div className="lg:col-span-1">
            <AuctionBoard />
          </div>

          <div className="space-y-6">
            <BidControls />
          </div>
        </div>

        {currentUserRole === "ADMIN" && (
          <div className="mt-8">
            <AdminUserCards />
          </div>
        )}
      </div>

      <ResultBanner />
    </main>
  );
}
