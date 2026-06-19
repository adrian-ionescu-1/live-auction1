// src/app/_components/SiteHeader.tsx
//
// Shared sticky navbar used by every static page. Includes a mobile menu
// (the previous navbar was `hidden md:flex`, so phones had no navigation).
//
// Auth-aware: when a session exists (read from sessionStorage so this stays
// decoupled from the auction store / Supabase client), the login CTAs are
// replaced by an account dropdown (identity + go to the auction + log out).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/rules", label: "Rules" },
  { href: "/faq", label: "FAQ" },
  { href: "/spectator", label: "Spectator" },
] as const;

const ROLE_LABEL: Record<string, string> = {
  USER: "Participant",
  ADMIN: "Admin",
  SPECTATOR: "Spectator",
};

type Auth = { id: string; role: string; name: string | null };

function initialsFrom(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function ExitIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function SiteHeader({
  subtitle = "Tournament Draft • Real-time Bidding",
}: {
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const read = () => {
      try {
        const id = sessionStorage.getItem("auction_user_id");
        const role = sessionStorage.getItem("auction_user_role");
        const name = sessionStorage.getItem("auction_user_name");
        setAuth(id && role ? { id, role, name } : null);
      } catch {
        setAuth(null);
      }
    };

    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  // Close the account dropdown on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onClick = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href;

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("auction_user_id");
      sessionStorage.removeItem("auction_user_role");
      sessionStorage.removeItem("auction_user_name");
    } catch {
      /* ignore */
    }
    // Full reload clears any in-memory auction store/realtime from this tab.
    window.location.reload();
  };

  const loggedIn = mounted && !!auth;
  const roleLabel = auth ? ROLE_LABEL[auth.role] ?? auth.role : "";
  const displayName = auth?.name?.trim() || roleLabel || "Account";
  const initials = initialsFrom(auth?.name?.trim() || roleLabel || "U");

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
          {loggedIn ? (
            <div className="relative" ref={accountRef}>
              {/* Account button */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="group flex items-center gap-2 rounded-xl bg-white/5 px-1.5 py-1 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:px-2 sm:py-1.5"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 text-[11px] font-extrabold text-emerald-100 ring-1 ring-white/10 sm:h-8 sm:w-8 sm:text-xs">
                  {initials}
                </span>
                <span className="hidden max-w-[140px] flex-col leading-tight sm:flex">
                  <span className="truncate text-xs font-semibold text-zinc-100">
                    {displayName}
                  </span>
                  <span className="text-left text-[10px] uppercase tracking-wide text-emerald-300/80">
                    {roleLabel}
                  </span>
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className={`mr-0.5 text-zinc-400 transition ${menuOpen ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-40 mt-2 w-60 origin-top-right animate-scale-in overflow-hidden rounded-2xl bg-zinc-900/95 ring-1 ring-white/10 shadow-2xl backdrop-blur"
                >
                  {/* Identity */}
                  <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 text-xs font-extrabold text-emerald-100 ring-1 ring-white/10">
                      {initials}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-sm font-semibold text-zinc-100">
                        {displayName}
                      </span>
                      <span className="block text-[10px] uppercase tracking-wide text-emerald-300/80">
                        {roleLabel} • signed in
                      </span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="p-1.5">
                    <Link
                      href="/login"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-emerald-500/15 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <path d="M10 17l5-5-5-5" />
                        <path d="M15 12H3" />
                      </svg>
                      Go to the auction
                    </Link>

                    <Link
                      href="/"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M3 11l9-8 9 8" />
                        <path d="M5 10v10h14V10" />
                      </svg>
                      Home
                    </Link>
                  </div>

                  <div className="p-1.5 pt-0">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                    >
                      <ExitIcon />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}

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

            {loggedIn ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                Go to the auction
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-1 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                Participant login
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
