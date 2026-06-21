// The streamer broadcast room route. A signed-in Discord member with the
// 'streamer' role lands here from their dashboard, joins the auction as a
// watch-only viewer (a SPECTATOR participant), and the live HUD takes over.
//
// This replaces the old key-based "spectator" page: there are no access keys —
// the streamer role alone grants entry, fully automated.

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountService } from "@/services/accountService";
import { AuctionEngine } from "@/services/auctionEngine";
import { useAuctionStore } from "@/store/auctionStore";
import { STREAMER_ROLE, EXCLUDED_ROLE } from "@/types/account.types";
import StreamRoom from "@/components/stream/StreamRoom";

type Phase = "loading" | "ready" | "denied" | "error";

export default function StreamPage() {
  const router = useRouter();
  const login = useAuctionStore((s) => s.login);
  const logout = useAuctionStore((s) => s.logout);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const profile = await AccountService.getMyProfile();
      if (cancelled) return;

      // Not signed in with Discord — send them to the sign-in screen.
      if (!profile) {
        router.replace("/login");
        return;
      }
      // Excluded members never reach any live area.
      if (profile.roles.includes(EXCLUDED_ROLE)) {
        router.replace("/dashboard");
        return;
      }
      // Needs the streamer role.
      if (!profile.roles.includes(STREAMER_ROLE)) {
        setPhase("denied");
        return;
      }

      const res = await AuctionEngine.enterAuctionAsStreamer();
      if (cancelled) return;
      if (!res.success || !res.userId) {
        setError(res.error ?? "Could not join the broadcast room");
        setPhase("error");
        return;
      }

      sessionStorage.setItem("auction_user_id", res.userId);
      sessionStorage.setItem("auction_user_role", "SPECTATOR");
      await login(res.userId, "SPECTATOR");
      if (cancelled) return;
      setPhase("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, login]);

  // Leaving the room drops the watch-only session so the streamer isn't left
  // looking "in the room" after they go back.
  const handleExit = () => {
    logout();
    router.push("/dashboard");
  };

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-violet-400" />
          Opening the broadcast room…
        </div>
      </main>
    );
  }

  if (phase === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md animate-scale-in rounded-3xl bg-white/5 p-8 text-center ring-1 ring-white/10">
          <div className="text-4xl">🎥</div>
          <h1 className="mt-4 text-2xl font-extrabold text-zinc-100">Streamer access only</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            This broadcast room is for members with the{" "}
            <span className="font-semibold text-violet-200">Streamer</span> role. If you go
            live on YouTube, Twitch or TikTok and want to cover the auction, ask an admin on
            Discord to grant it.
          </p>
          <Link
            href="/dashboard"
            className="mt-7 inline-flex items-center justify-center rounded-2xl bg-violet-500/20 px-6 py-3 text-sm font-bold text-violet-100 ring-1 ring-violet-400/30 transition hover:bg-violet-500/30 active:scale-[0.98]"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md animate-scale-in rounded-3xl bg-white/5 p-8 text-center ring-1 ring-white/10">
          <div className="text-4xl">⚠️</div>
          <h1 className="mt-4 text-2xl font-extrabold text-zinc-100">Couldn&apos;t join</h1>
          <p className="mt-3 text-sm leading-relaxed text-red-200">{error}</p>
          <Link
            href="/dashboard"
            className="mt-7 inline-flex items-center justify-center rounded-2xl bg-white/5 px-6 py-3 text-sm font-bold text-zinc-100 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98]"
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return <StreamRoom onExit={handleExit} />;
}
