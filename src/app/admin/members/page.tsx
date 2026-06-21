// Members directory: collapsible groups per role, live online/offline status,
// click-to-change role / ban. Moved out of the admin landing page into its own
// nav section. The role gate + nav live in the admin layout.

"use client";

import { useEffect, useMemo, useState } from "react";
import { MembersService } from "@/services/membersService";
import { Member } from "@/types/account.types";
import { useMembersPresence } from "@/app/_components/useMembersPresence";
import Collapsible from "@/components/admin/Collapsible";
import MemberRow from "@/components/admin/MemberRow";
import MemberActions from "@/components/admin/MemberActions";
import { ROLE_ORDER, roleMeta } from "@/components/admin/roleMeta";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const onlineIds = useMembersPresence();

  useEffect(() => {
    let active = true;
    MembersService.getAllMembers().then((all) => {
      if (!active) return;
      setMembers(all);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateMember = (updated: Member) =>
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

  const removeMember = (memberId: string) =>
    setMembers((prev) => prev.filter((m) => m.id !== memberId));

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
      // Within each role: online first, then offline, then banned — so the
      // "online up top" ordering stays clean (a banned member never leads the
      // group even if their tab is open). Ties break alphabetically.
      const rank = (m: Member) => (m.banned ? 2 : onlineIds.has(m.id) ? 0 : 1);
      const list = byRole
        .get(key)!
        .slice()
        .sort((a, b) => {
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          return a.username.localeCompare(b.username);
        });
      return { key, members: list };
    });
  }, [members, onlineIds]);

  const onlineCount = members.filter((m) => onlineIds.has(m.id)).length;

  return (
    <section className="animate-fade-up">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold text-zinc-100 sm:text-3xl">Members</h1>
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
        Members with the <span className="font-semibold text-emerald-200">Bidder</span> role
        are automatically enrolled in new events.
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
            Accounts created with Discord show up here. Promote them to{" "}
            <span className="font-semibold">Bidder</span> to let them bid.
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
                      <MemberActions
                        member={m}
                        mode="all"
                        onChange={updateMember}
                        onDelete={removeMember}
                      >
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
  );
}
