// src/app/_components/SiteHeader.tsx
//
// Shared sticky navbar used by every static page. Includes a mobile menu
// (the previous navbar was `hidden md:flex`, so phones had no navigation).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/rules", label: "Rules" },
  { href: "/faq", label: "FAQ" },
  { href: "/spectator", label: "Spectator" },
] as const;

export default function SiteHeader({
  subtitle = "Tournament Draft • Real-time Bidding",
}: {
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/40">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:gap-3"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 ring-1 ring-white/10 sm:h-10 sm:w-10">
            <span className="text-xs font-extrabold tracking-wider sm:text-sm">WOT</span>
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400/70 blur-[2px] animate-glow-pulse" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-wide">Auction App</div>
            <div className="hidden truncate text-xs text-zinc-400 sm:block">{subtitle}</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                isActive(item.href) ? "text-zinc-100" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-zinc-300 transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 lg:inline"
          >
            Participant login
          </Link>

          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:px-4 sm:text-sm"
          >
            <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100 shadow-[0_0_30px_rgba(16,185,129,0.25)]" />
            <span className="relative whitespace-nowrap">
              <span className="sm:hidden">Enter</span>
              <span className="hidden sm:inline">Enter with Access Key</span>
            </span>
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:h-10 sm:w-10 md:hidden"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="border-t border-white/10 bg-zinc-950/80 backdrop-blur md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-xl px-3 py-2 text-sm ring-1 ring-transparent transition hover:bg-white/5 hover:ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                  isActive(item.href) ? "bg-white/5 text-zinc-100 ring-white/10" : "text-zinc-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              Participant login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
