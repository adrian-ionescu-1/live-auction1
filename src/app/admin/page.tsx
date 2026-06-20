// Admin overview: a landing page with at-a-glance stats, the current live event,
// and quick links into the main admin areas. The role gate + nav live in the
// admin layout; the members directory has moved to /admin/members.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MembersService } from "@/services/membersService";
import { EventsService } from "@/services/eventsService";
import { Member } from "@/types/account.types";
import { AuctionEvent } from "@/types/event.types";
import { useMembersPresence } from "@/app/_components/useMembersPresence";

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className={`text-2xl font-extrabold tabular-nums ${accent}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/10 hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-100">{title}</span>
        <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-300">
          →
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{desc}</p>
    </Link>
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
  const bidderCount = members.filter((m) => m.role.toLowerCase() === "bidder").length;
  const bannedCount = members.filter((m) => m.banned).length;

  return (
    <>
      {/* Heading */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Admin{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
            Dashboard
          </span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Create an event, manage members, and run the live auction.
        </p>
      </div>

      {/* Live event banner */}
      <div className="mt-6 animate-fade-up">
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
        ) : liveEvent ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-emerald-400/10 p-5 ring-1 ring-emerald-400/25 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-200/80">Live event</p>
              <p className="text-lg font-extrabold text-emerald-100">{liveEvent.name}</p>
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
            <div>
              <p className="text-sm font-semibold text-zinc-200">No live event yet</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Create an event to set the rules and let bidders join.
              </p>
            </div>
            <Link
              href="/admin/events/new"
              className="shrink-0 rounded-2xl bg-emerald-500/15 px-5 py-3 text-center text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 active:scale-[0.98]"
            >
              Create event →
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid animate-fade-up grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Members" value={members.length} accent="text-zinc-100" />
        <StatCard label="Online now" value={onlineCount} accent="text-emerald-300" />
        <StatCard label="Bidders" value={bidderCount} accent="text-cyan-300" />
        <StatCard label="Banned" value={bannedCount} accent="text-red-300" />
      </div>

      {/* Navigation */}
      <div className="mt-6 grid animate-fade-up gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          href="/admin/events/new"
          title="Create event"
          desc="Set the name, player limit, entry fee and margin. Reserve is auto-calculated."
        />
        <NavCard
          href="/admin/events"
          title="All events"
          desc="Review created events, their members and add anyone who was missed."
        />
        <NavCard
          href="/admin/members"
          title="Members"
          desc="Manage Discord members: roles, bans and who's online right now."
        />
        <NavCard
          href="/admin/room"
          title="Auction room"
          desc="Pick which event to run, then open the live auction."
        />
        <NavCard
          href="/tournaments"
          title="Tournament format"
          desc="Review the standard draft structure and rules."
        />
        <NavCard
          href="/spectator"
          title="Spectator view"
          desc="See what spectators see during a live auction."
        />
      </div>
    </>
  );
}
