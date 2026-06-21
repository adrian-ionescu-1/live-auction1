// Responsive admin navigation. A single top bar across every admin page with
// grouped links (Events has sub-items), an active-route highlight, and a
// collapsible mobile panel. Pure UI — the route gate lives in the admin layout.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AccountMenu from "@/app/_components/AccountMenu";
import Logo from "@/app/_components/Logo";

type SubItem = { href: string; label: string };
type NavItem = { href: string; label: string; children?: SubItem[] };

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members", label: "Members" },
  {
    href: "/admin/community-events",
    label: "Events",
    children: [
      { href: "/admin/community-events/new", label: "Create event" },
      { href: "/admin/community-events", label: "All events" },
      { href: "/admin/community-events/participants", label: "Participant lists" },
    ],
  },
  {
    href: "/admin/events",
    label: "Auctions",
    children: [
      { href: "/admin/events/new", label: "Create auction" },
      { href: "/admin/events", label: "All auctions" },
    ],
  },
  { href: "/admin/room", label: "Auction room" },
  { href: "/admin/matches", label: "Matches" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside or navigating.
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const linkClass = (active: boolean) =>
    `rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
      active
        ? "bg-white/10 text-zinc-100 ring-1 ring-white/15"
        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link
          href="/admin"
          className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          <Logo className="h-8 w-8" />
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-wide">Admin</span>
            <span className="block text-[11px] text-zinc-400">Control center</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav ref={menuRef} className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) =>
            item.children ? (
              <div key={item.href} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu((m) => (m === item.href ? null : item.href))}
                  aria-expanded={openMenu === item.href}
                  aria-haspopup="menu"
                  className={`${linkClass(isActive(pathname, item.href))} inline-flex items-center gap-1`}
                >
                  {item.label}
                  <span aria-hidden className="text-xs text-zinc-500">
                    ▾
                  </span>
                </button>
                {openMenu === item.href && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-1.5 shadow-xl backdrop-blur"
                  >
                    {item.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        role="menuitem"
                        className="block rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-zinc-100"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link key={item.href} href={item.href} className={linkClass(isActive(pathname, item.href))}>
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <AccountMenu loggedOutCta={false} />
          </div>
          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-white/10 text-zinc-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 lg:hidden"
          >
            <span aria-hidden className="text-lg">
              {mobileOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-black/60 px-4 py-3 lg:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1">
            {NAV.map((item) => (
              <div key={item.href}>
                <Link href={item.href} className={`block ${linkClass(isActive(pathname, item.href))}`}>
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-white/10 pl-3">
                    {item.children.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-2 sm:hidden">
              <AccountMenu loggedOutCta={false} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
