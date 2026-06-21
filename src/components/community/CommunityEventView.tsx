// Presentational view of a community event: the #type tag, title, body, optional
// link button, registration status and key dates. Reused by the admin "All
// events" list and the member dashboard. Actions (participate / edit / delete)
// are passed in as children so each surface composes its own controls.
// Mobile-first: wraps and stays within 320px.

"use client";

import { useEffect, useState } from "react";
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

// A ticking "now" so the registration countdown and the open/closed state stay
// live without a page refresh. Updates once a second.
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

// Break a positive millisecond span into a compact "1d 2h 03m 04s" string.
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-semibold tabular-nums text-zinc-300">{value}</span>
    </div>
  );
}

// The prominent registration panel: a clear status, the key date, and a live
// countdown (to the open time before it opens, to the close time while open).
function RegistrationPanel({ event }: { event: CommunityEvent }) {
  const opensAt = event.registrationOpensAt;
  const closesAt = event.registrationClosesAt;
  // Only tick while a countdown can actually change something.
  const now = useNow(Boolean(opensAt || closesAt));
  const state = registrationState(opensAt, closesAt, now);

  const target = state === "before" ? opensAt : state === "open" ? closesAt : null;
  const remaining = target ? new Date(target).getTime() - now : null;

  const shell =
    state === "open"
      ? "bg-emerald-500/10 ring-emerald-400/30"
      : state === "before"
        ? "bg-amber-500/10 ring-amber-400/30"
        : "bg-white/5 ring-white/10";
  const accent =
    state === "open"
      ? "text-emerald-200"
      : state === "before"
        ? "text-amber-200"
        : "text-zinc-300";

  const headline =
    state === "open"
      ? "Registration open"
      : state === "before"
        ? "Registration opens soon"
        : "Registration closed";

  const dateLabel = state === "before" ? "Opens" : "Closes";
  const dateValue = state === "before" ? opensAt : closesAt;

  return (
    <div className={`rounded-2xl p-4 ring-1 ${shell}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-2 text-sm font-extrabold ${accent}`}>
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              state === "open"
                ? "animate-pulse bg-emerald-300"
                : state === "before"
                  ? "bg-amber-300"
                  : "bg-zinc-400"
            }`}
          />
          {headline}
        </span>
        {remaining !== null && remaining > 0 && (
          <span className={`text-sm font-extrabold tabular-nums ${accent}`}>
            {state === "before" ? "Opens in " : "Closes in "}
            {formatRemaining(remaining)}
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1.5 xs:grid-cols-2">
        <div className="flex items-center justify-between gap-3 text-xs xs:flex-col xs:items-start xs:gap-0.5">
          <span className="text-zinc-500">{dateLabel}</span>
          <span className="font-semibold tabular-nums text-zinc-200">
            {fmtDateTime(dateValue)}
          </span>
        </div>
        {state !== "before" && (
          <div className="flex items-center justify-between gap-3 text-xs xs:flex-col xs:items-start xs:gap-0.5">
            <span className="text-zinc-500">Opened</span>
            <span className="font-semibold tabular-nums text-zinc-300">
              {fmtDateTime(opensAt)}
            </span>
          </div>
        )}
      </div>
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

      <RegistrationPanel event={event} />

      {(event.startsAt || event.endsAt) && (
        <div className="space-y-1.5 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
          <DateRow label="Event start" value={fmtDateTime(event.startsAt)} />
          <DateRow label="Event end" value={fmtDateTime(event.endsAt)} />
        </div>
      )}

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
