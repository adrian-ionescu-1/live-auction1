// Presentational view of a community event: the #type tag, title, body, optional
// link button, registration status and key dates. Reused by the admin "All
// events" list and the member dashboard. Actions (participate / edit / delete)
// are passed in as children so each surface composes its own controls.
// Mobile-first: wraps and stays within 320px.

"use client";

import { CommunityEvent } from "@/types/community-event.types";
import { roleMeta } from "@/components/admin/roleMeta";
import {
  categoryChip,
  categoryHashtag,
  fmtDateTime,
  registrationState,
} from "@/components/admin/communityEventMeta";

const REG_BADGE = {
  before: { label: "Registration not open yet", cls: "bg-amber-400/15 text-amber-200 ring-amber-400/30" },
  open: { label: "Registration open", cls: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30" },
  closed: { label: "Registration closed", cls: "bg-zinc-400/15 text-zinc-300 ring-white/15" },
} as const;

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-semibold tabular-nums text-zinc-300">{value}</span>
    </div>
  );
}

export default function CommunityEventView({
  event,
  showRoles = false,
  children,
}: {
  event: CommunityEvent;
  /** Show the "visible to" role chips (admin view). */
  showRoles?: boolean;
  /** Action controls rendered at the bottom of the card. */
  children?: React.ReactNode;
}) {
  const reg = registrationState(event.registrationOpensAt, event.registrationClosesAt);
  const badge = REG_BADGE[reg];

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${categoryChip(
            event.categoryKey
          )}`}
        >
          {categoryHashtag(event.categoryName)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${badge.cls}`}
        >
          {badge.label}
        </span>
        {event.region && (
          <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300 ring-1 ring-white/15">
            {event.region}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-lg font-extrabold text-zinc-100 break-words">{event.title}</h3>
        {event.content && (
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-300">
            {event.content}
          </p>
        )}
      </div>

      {event.hasLink && event.linkUrl && (
        <a
          href={event.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-2 truncate rounded-xl bg-sky-500/15 px-4 py-2 text-sm font-bold text-sky-200 ring-1 ring-sky-400/25 transition hover:bg-sky-500/25"
        >
          <span aria-hidden>↗</span>
          <span className="truncate">{event.linkLabel || "Open link"}</span>
        </a>
      )}

      <div className="space-y-1.5 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
        <DateRow label="Event start" value={fmtDateTime(event.startsAt)} />
        <DateRow label="Event end" value={fmtDateTime(event.endsAt)} />
        <DateRow label="Registration opens" value={fmtDateTime(event.registrationOpensAt)} />
        <DateRow label="Registration closes" value={fmtDateTime(event.registrationClosesAt)} />
      </div>

      {showRoles && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-zinc-500">Visible to:</span>
          {event.visibleRoles.length === 0 ? (
            <span className="text-xs text-zinc-500">no roles</span>
          ) : (
            event.visibleRoles.map((r) => (
              <span
                key={r}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${roleMeta(r).chip}`}
              >
                {roleMeta(r).label}
              </span>
            ))
          )}
        </div>
      )}

      {children}
    </div>
  );
}
