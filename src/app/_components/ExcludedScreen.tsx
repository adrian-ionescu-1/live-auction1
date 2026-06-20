// Full-screen "you have been excluded" lock, shown in place of the dashboard to
// any signed-in member whose role is 'excluded'. The real dashboard is replaced
// by an inert, blurred ghost behind a red warning card; only the top bar stays
// live so the member can still log out or go Home. Re-rendered on every load, so
// it persists across reconnects for as long as the admin keeps the role.

"use client";

import Link from "next/link";
import AccountMenu from "./AccountMenu";
import Logo from "./Logo";

function ShieldIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
      <path d="M9.5 9.5l5 5" />
      <path d="M14.5 9.5l-5 5" />
    </svg>
  );
}

export default function ExcludedScreen() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
      {/* Top bar — stays above the lock so log out / Home keep working. */}
      <div className="relative z-50 mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          <Logo className="h-9 w-9" />
          <span className="text-sm font-semibold tracking-wide">Auction App</span>
        </Link>
        <AccountMenu />
      </div>

      {/* Inert, blurred ghost of the dashboard behind the lock — purely visual. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-24 z-0 mx-auto w-full max-w-5xl select-none px-4 opacity-40 blur-md sm:px-6"
      >
        <div className="mx-auto h-24 w-24 rounded-full bg-white/10" />
        <div className="mx-auto mt-4 h-7 w-64 rounded-full bg-white/10" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-48 rounded-3xl bg-white/5 ring-1 ring-white/10" />
          <div className="h-48 rounded-3xl bg-white/5 ring-1 ring-white/10" />
          <div className="h-48 rounded-3xl bg-white/5 ring-1 ring-white/10" />
        </div>
      </div>

      {/* The lock: dark, blurred overlay + the red warning card. */}
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-xl">
        <div className="absolute inset-0 bg-black/60" />
        <div
          role="alert"
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-zinc-950/95 ring-1 ring-red-500/40 shadow-2xl shadow-red-900/30"
        >
          <div className="flex flex-col items-center gap-4 border-b border-red-500/30 bg-red-500/15 px-6 py-7 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-100 ring-1 ring-red-400/40">
              <ShieldIcon />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">
                Access restricted
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-red-50 sm:text-3xl">
                You have been excluded
              </h1>
            </div>
          </div>

          <div className="px-6 py-6 text-center">
            <p className="text-sm leading-relaxed text-zinc-300">
              Your access to this site has been revoked by an administrator for
              breaking the{" "}
              <span className="font-semibold text-zinc-100">rules</span>,{" "}
              <span className="font-semibold text-zinc-100">terms &amp; conditions</span>{" "}
              and{" "}
              <span className="font-semibold text-zinc-100">site policies</span>.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              You can no longer take part in auctions. This applies every time you
              sign in while the restriction is in place.
            </p>
            <p className="mt-4 text-xs text-zinc-500">
              Believe this is a mistake? Contact an administrator. Use the menu in
              the top-right to log out or return Home.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
