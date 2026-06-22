// Admin overview: the landing dashboard. At-a-glance stats, the current live
// auction, and quick links into every admin area — grouped into sections that
// mirror the top navigation (Events, Auctions, Members & more). Mobile-first.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MembersService } from "@/services/membersService";
import { EventsService } from "@/services/eventsService";
import { Member } from "@/types/account.types";
import { AuctionEvent } from "@/types/event.types";
import { useMembersPresence } from "@/app/_components/useMembersPresence";

// ── Inline icon set (Lucide-style, stroke = currentColor) ────────────────────
type IconName =
  | "plus"
  | "layers"
  | "list"
  | "radio"
  | "users"
  | "swords"
  | "trophy";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "plus":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
          <path d="m6.08 9.5-3.49 1.59a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
          <path d="m6.08 14.5-3.49 1.59a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4" />
          <path d="M12 16h4" />
          <path d="M8 11h.01" />
          <path d="M8 16h.01" />
        </svg>
      );
    case "radio":
      return (
        <svg {...common}>
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
          <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
          <circle cx="12" cy="12" r="2" />
          <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
          <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "swords":
      return (
        <svg {...common}>
          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
          <line x1="13" x2="19" y1="19" y2="13" />
          <line x1="16" x2="20" y1="16" y2="20" />
          <line x1="19" x2="21" y1="21" y2="19" />
          <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
          <line x1="5" x2="9" y1="14" y2="18" />
          <line x1="7" x2="4" y1="17" y2="20" />
          <line x1="3" x2="5" y1="19" y2="21" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
  }
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className={`text-2xl font-extrabold tabular-nums ${accent}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}

// One quick-link card. `badge` is the icon chip's color classes (full Tailwind
// strings so they survive purge).
function NavCard({
  href,
  title,
  desc,
  icon,
  badge,
}: {
  href: string;
  title: string;
  desc: string;
  icon: IconName;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/10 hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:p-5"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${badge}`}>
        <Icon name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-bold text-zinc-100">{title}</span>
          <span className="shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-300">
            →
          </span>
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-400">{desc}</span>
      </span>
    </Link>
  );
}

type CardDef = { href: string; title: string; desc: string; icon: IconName };

// A titled group of quick links. `accentDot` / `badge` colour the whole section.
function Section({
  title,
  description,
  accentDot,
  badge,
  cards,
}: {
  title: string;
  description: string;
  accentDot: string;
  badge: string;
  cards: CardDef[];
}) {
  return (
    <section className="animate-fade-up">
      <div className="mb-3 flex items-baseline gap-2.5">
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${accentDot}`} />
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-zinc-200">{title}</h2>
        <span className="hidden truncate text-xs text-zinc-500 sm:inline">{description}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <NavCard key={c.href + c.title} {...c} badge={badge} />
        ))}
      </div>
    </section>
  );
}

export default function AdminOverviewPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [liveEvent, setLiveEvent] = useState<AuctionEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const onlineIds = useMembersPresence();

  useEffect(() => {
    let active = true;
    Promise.all([MembersService.getAllMembers(), EventsService.getLiveEvent()]).then(
      ([all, ev]) => {
        if (!active) return;
        setMembers(all);
        setLiveEvent(ev);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const onlineCount = members.filter((m) => onlineIds.has(m.id)).length;
  const bidderCount = members.filter((m) => m.roles.includes("bidder")).length;
  const bannedCount = members.filter((m) => m.banned).length;

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Admin{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
            Dashboard
          </span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Post events, run auctions, and manage your members — all from here.
        </p>
      </div>

      {/* Live auction banner */}
      <div className="animate-fade-up">
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
        ) : liveEvent ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-emerald-400/10 p-5 ring-1 ring-emerald-400/25 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-emerald-200/80">Live auction</p>
              <p className="truncate text-lg font-extrabold text-emerald-100">{liveEvent.name}</p>
              <p className="mt-0.5 text-xs text-emerald-200/80">
                {liveEvent.playerLimit} players · reserve ${liveEvent.totalReserve.toLocaleString()}{" "}
                / member
              </p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-2xl bg-emerald-500/20 px-5 py-3 text-center text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98]"
            >
              Open auction room →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-200">No live auction yet</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Create an auction to set the rules and let bidders join.
              </p>
            </div>
            <Link
              href="/admin/events/new"
              className="shrink-0 rounded-2xl bg-emerald-500/15 px-5 py-3 text-center text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 active:scale-[0.98]"
            >
              Create auction →
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid animate-fade-up grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Members" value={members.length} accent="text-zinc-100" />
        <StatCard label="Online now" value={onlineCount} accent="text-emerald-300" />
        <StatCard label="Bidders" value={bidderCount} accent="text-cyan-300" />
        <StatCard label="Banned" value={bannedCount} accent="text-red-300" />
      </div>

      {/* Events (community announcements members register for) */}
      <Section
        title="Events"
        description="Announcements members register for"
        accentDot="bg-emerald-400"
        badge="bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
        cards={[
          {
            href: "/admin/community-events/new",
            title: "Create event",
            desc: "Post an announcement for chosen roles, with a registration window and form.",
            icon: "plus",
          },
          {
            href: "/admin/community-events",
            title: "All events",
            desc: "Edit, extend, reopen or close registration, and manage each event.",
            icon: "layers",
          },
          {
            href: "/admin/community-events/participants",
            title: "Participant lists",
            desc: "Lists from events plus standalone ones — feed any of them into an auction.",
            icon: "list",
          },
        ]}
      />

      {/* Auctions (the live bidding events) */}
      <Section
        title="Auctions"
        description="The live bidding events"
        accentDot="bg-sky-400"
        badge="bg-sky-500/15 text-sky-200 ring-sky-400/25"
        cards={[
          {
            href: "/admin/events/new",
            title: "Create auction",
            desc: "Set the name, player limit, entry fee and margin. Reserve is auto-calculated.",
            icon: "plus",
          },
          {
            href: "/admin/events",
            title: "All auctions",
            desc: "Review created auctions, their members, and add anyone who was missed.",
            icon: "layers",
          },
          {
            href: "/admin/room",
            title: "Auction room",
            desc: "Pick which auction to run, then open and control the live room.",
            icon: "radio",
          },
        ]}
      />

      {/* Members & more */}
      <Section
        title="Members & more"
        description="People and tournament tools"
        accentDot="bg-fuchsia-400"
        badge="bg-fuchsia-500/15 text-fuchsia-200 ring-fuchsia-400/25"
        cards={[
          {
            href: "/admin/members",
            title: "Members",
            desc: "Manage Discord members: roles, bans, and who's online right now.",
            icon: "users",
          },
          {
            href: "/admin/tournaments",
            title: "Tournaments",
            desc: "FIFA-style competitions: teams, standings, fixtures and scores.",
            icon: "swords",
          },
          {
            href: "/tournaments",
            title: "Tournament format",
            desc: "Review the standard draft structure and rules.",
            icon: "trophy",
          },
        ]}
      />
    </div>
  );
}
