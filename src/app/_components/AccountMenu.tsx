//
// Reusable "signed-in" account card: an avatar chip that opens a dropdown with
// the identity, a primary link (Dashboard / Go to the auction), Home and Log
// out. Works for both Discord and key sessions (via useAccountSession), so it
// can be dropped on the navbar, the dashboard and the auction screens.

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { initialsFrom, useAccountSession } from "./useAccountSession";

/** Discord avatar (plain <img> to avoid next/image remote config) or initials. */
export function AccountAvatar({
  avatarUrl,
  name,
  size,
}: {
  avatarUrl: string | null;
  name: string;
  size: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-white/15"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 font-extrabold text-emerald-100 ring-1 ring-white/15"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initialsFrom(name)}
    </span>
  );
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

export default function AccountMenu({
  loggedOutCta = true,
}: {
  /** When signed out: show the "Sign in" button (true) or render nothing. */
  loggedOutCta?: boolean;
}) {
  const { mounted, session, roleLabel, displayName, initials, primaryAction, logout } =
    useAccountSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
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

  const loggedIn = mounted && !!session;

  if (!loggedIn) {
    if (!loggedOutCta) return null;
    return (
      <Link
        href="/login"
        className="group relative inline-flex items-center justify-center rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:px-4 sm:text-sm"
      >
        <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100 shadow-[0_0_30px_rgba(16,185,129,0.25)]" />
        <span className="relative whitespace-nowrap">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      {/* Account chip */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Account menu"
        className="group flex items-center gap-2 rounded-xl bg-white/5 px-1.5 py-1 ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:px-2 sm:py-1.5"
      >
        <AccountAvatar
          avatarUrl={session!.avatarUrl}
          name={session!.name?.trim() || roleLabel || initials}
          size={32}
        />
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
            <AccountAvatar
              avatarUrl={session!.avatarUrl}
              name={session!.name?.trim() || roleLabel || initials}
              size={36}
            />
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
              href={primaryAction.href}
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
              {primaryAction.label}
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
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            >
              <ExitIcon />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
