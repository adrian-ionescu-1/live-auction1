//
// Admin home dashboard. A landing page for the access-key admin to jump into
// the auction room and to manage the member directory (Discord accounts):
// collapsible groups per role, live online/offline status, and click-to-change
// role / ban. Client-gated to the ADMIN role, consistent with the rest of the
// app (the auction itself is server-authoritative).

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MembersService } from "@/services/membersService";
import { Member } from "@/types/account.types";
import { useMembersPresence } from "@/app/_components/useMembersPresence";
import AccountMenu from "@/app/_components/AccountMenu";
import Logo from "@/app/_components/Logo";
import Collapsible from "@/components/admin/Collapsible";
import MemberRow from "@/components/admin/MemberRow";
import MemberActions from "@/components/admin/MemberActions";
import { ROLE_ORDER, roleMeta } from "@/components/admin/roleMeta";

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const onlineIds = useMembersPresence();

  // Client-side gate: only the access-key ADMIN may view this page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = sessionStorage.getItem("auction_user_role");
    if (role !== "ADMIN") {
      router.replace("/login");
      return;
    }
    setAllowed(true);
  }, [router]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    MembersService.getAllMembers().then((all) => {
      if (!active) return;
      setMembers(all);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [allowed]);

  const updateMember = (updated: Member) =>
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

  // Group members by role, ordered (known roles first), members online first.
  const groups = useMemo(() => {
    const byRole = new Map<string, Member[]>();
    for (const m of members) {
      const key = m.role.toLowerCase();
      const list = byRole.get(key) ?? [];
      list.push(m);
      byRole.set(key, list);
    }
    const keys = Array.from(byRole.keys()).sort((a, b) => {
      const ia = ROLE_ORDER.indexOf(a);
      const ib = ROLE_ORDER.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });
    return keys.map((key) => {
      const list = byRole
        .get(key)!
        .slice()
        .sort((a, b) => {
          const oa = onlineIds.has(a.id) ? 0 : 1;
          const ob = onlineIds.has(b.id) ? 0 : 1;
          if (oa !== ob) return oa - ob;
          return a.username.localeCompare(b.username);
        });
      return { key, members: list };
    });
  }, [members, onlineIds]);

  const onlineCount = members.filter((m) => onlineIds.has(m.id)).length;
  const bidderCount = members.filter((m) => m.role.toLowerCase() === "bidder").length;
  const bannedCount = members.filter((m) => m.banned).length;

  if (!allowed) return null;

  return (
    <main className="relative min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            <Logo className="h-9 w-9" />
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-wide">Admin</span>
              <span className="block text-xs text-zinc-400">Control center</span>
            </span>
          </Link>
          <AccountMenu loggedOutCta={false} />
        </div>

        {/* Heading */}
        <div className="mt-8 animate-fade-up sm:mt-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
            Admin{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
              Dashboard
            </span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Jump into the auction and manage the community at a glance.
          </p>
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
            href="/login"
            title="Open auction room"
            desc="Run the live auction: start, pause, extend and reset."
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

        {/* Members directory */}
        <section className="mt-10 animate-fade-up">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-zinc-100 sm:text-2xl">Members</h2>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {onlineCount} online
            </span>
          </div>
          <p className="mb-4 text-xs text-zinc-500">
            Tap a category to expand it, then tap a member to change their role or ban them.
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-3xl bg-white/5 p-10 text-sm text-zinc-400 ring-1 ring-white/10">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
              Loading members…
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
              <p className="text-sm font-semibold text-zinc-300">No members yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                Accounts created with Discord show up here. Promote them to roles
                like <span className="font-semibold">Bidder</span> to let them bid.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const meta = roleMeta(group.key);
                const onlineInGroup = group.members.filter((m) => onlineIds.has(m.id)).length;
                return (
                  <Collapsible
                    key={group.key}
                    count={group.members.length}
                    header={
                      <>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${meta.chip}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-zinc-500">{onlineInGroup} online</span>
                      </>
                    }
                  >
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.members.map((m) => (
                        <li key={m.id}>
                          <MemberActions member={m} mode="all" onChange={updateMember}>
                            <MemberRow member={m} online={onlineIds.has(m.id)} interactive />
                          </MemberActions>
                        </li>
                      ))}
                    </ul>
                  </Collapsible>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-500" /> Offline
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Banned
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
