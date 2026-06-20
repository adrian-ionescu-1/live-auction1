// Reusable card listing the members who have bidding access. Shows each member
// with a live online/offline (or banned) dot. Used on the create-event screen
// (current bidders who'll be enrolled) and the event detail screen (the event's
// actual members). Online state is keyed by profile id via members presence.

"use client";

import { AccountAvatar } from "@/app/_components/AccountMenu";

export interface AccessMember {
  id: string; // profile id
  username: string;
  avatarUrl: string | null;
  banned: boolean;
}

export default function EventMembersCard({
  title,
  subtitle,
  members,
  onlineIds,
  emptyHint,
  action,
}: {
  title: string;
  subtitle?: string;
  members: AccessMember[];
  onlineIds: Set<string>;
  emptyHint?: string;
  action?: React.ReactNode;
}) {
  const onlineCount = members.filter((m) => onlineIds.has(m.id)).length;

  return (
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-zinc-100">{title}</h3>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {onlineCount}/{members.length} online
        </span>
      </div>
      {subtitle && <p className="mb-3 text-xs text-zinc-500">{subtitle}</p>}

      {members.length === 0 ? (
        <div className="rounded-2xl bg-black/25 p-6 text-center ring-1 ring-white/10">
          <p className="text-sm text-zinc-400">{emptyHint ?? "No members with access yet."}</p>
        </div>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {members.map((m) => {
            const online = onlineIds.has(m.id);
            const dot = m.banned
              ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"
              : online
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                : "bg-zinc-500";
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2 ring-1 ring-white/10"
              >
                <span className="relative shrink-0">
                  <AccountAvatar avatarUrl={m.avatarUrl} name={m.username} size={32} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-zinc-950 ${dot}`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-100">
                    {m.username}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                    {m.banned ? "Banned" : online ? "Online" : "Offline"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
