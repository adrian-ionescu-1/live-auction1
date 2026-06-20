//
// Admin-only card (shown in the auction room where the bid panel would be).
// Lists every member with the "bidder" role in three collapsible categories —
// Online, Offline and Banned — each with a count. Tap a member to ban / unban.

"use client";

import { useEffect, useState } from "react";
import { MembersService } from "@/services/membersService";
import { Member, BIDDER_ROLE } from "@/types/account.types";
import { useMembersPresence } from "@/app/_components/useMembersPresence";
import Collapsible from "@/components/admin/Collapsible";
import MemberRow from "@/components/admin/MemberRow";
import MemberActions from "@/components/admin/MemberActions";

function MemberList({
  members,
  online,
  onChange,
}: {
  members: Member[];
  online: boolean;
  onChange: (m: Member) => void;
}) {
  return (
    <ul className="space-y-2">
      {members.map((m) => (
        <li key={m.id}>
          <MemberActions member={m} mode="ban" onChange={onChange}>
            <MemberRow member={m} online={online} interactive />
          </MemberActions>
        </li>
      ))}
    </ul>
  );
}

export default function BiddersList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const onlineIds = useMembersPresence();

  useEffect(() => {
    let active = true;
    MembersService.getAllMembers().then((all) => {
      if (!active) return;
      setMembers(all.filter((m) => m.role.toLowerCase() === BIDDER_ROLE));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateMember = (updated: Member) =>
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

  // Banned takes precedence over the connection state.
  const banned = members.filter((m) => m.banned);
  const online = members.filter((m) => !m.banned && onlineIds.has(m.id));
  const offline = members.filter((m) => !m.banned && !onlineIds.has(m.id));

  const dotHeader = (label: string, dot: string) => (
    <>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
        {label}
      </span>
    </>
  );

  return (
    <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-extrabold tracking-wide text-zinc-100">Bidders</h3>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
          {online.length} online
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-black/25 p-6 text-sm text-zinc-400 ring-1 ring-white/10">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
          Loading bidders…
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl bg-black/25 p-6 text-center ring-1 ring-white/10">
          <p className="text-sm font-semibold text-zinc-300">No bidders yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Members you promote to the <span className="font-semibold">Bidder</span>{" "}
            role appear here. Tap one to ban or unban them.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Collapsible
            header={dotHeader("Online", "bg-emerald-400")}
            count={online.length}
            defaultOpen
          >
            <MemberList members={online} online onChange={updateMember} />
          </Collapsible>

          <Collapsible header={dotHeader("Offline", "bg-zinc-500")} count={offline.length}>
            <MemberList members={offline} online={false} onChange={updateMember} />
          </Collapsible>

          <Collapsible header={dotHeader("Banned", "bg-red-500")} count={banned.length}>
            <MemberList members={banned} online={false} onChange={updateMember} />
          </Collapsible>
        </div>
      )}
    </div>
  );
}
