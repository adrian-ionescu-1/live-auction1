// Presentational member row: avatar with a status dot (green online / gray
// offline / red banned), the username, a connection label, and optional role /
// banned badges. Wrapped by <MemberActions /> when it needs to be clickable.

"use client";

import { Member } from "@/types/account.types";
import { AccountAvatar } from "@/app/_components/AccountMenu";
import { roleMeta } from "./roleMeta";

export default function MemberRow({
  member,
  online,
  showRole = false,
  interactive = false,
}: {
  member: Member;
  online: boolean;
  showRole?: boolean;
  interactive?: boolean;
}) {
  const dot = member.banned
    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.95)]"
    : online
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.95)]"
      : "bg-zinc-500";
  const meta = roleMeta(member.role);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2.5 ring-1 ring-white/10 ${
        interactive ? "transition hover:bg-white/[0.07] hover:ring-white/20" : ""
      }`}
    >
      <span className="relative shrink-0">
        <AccountAvatar avatarUrl={member.avatarUrl} name={member.username} size={36} />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-zinc-950 ${dot}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-zinc-100">
          {member.username}
        </span>
        <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
          {online ? "Online" : "Offline"}
        </span>
      </span>
      {showRole && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${meta.chip}`}
        >
          {meta.label}
        </span>
      )}
      {member.banned && (
        <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-200 ring-1 ring-red-400/30">
          Banned
        </span>
      )}
    </div>
  );
}
