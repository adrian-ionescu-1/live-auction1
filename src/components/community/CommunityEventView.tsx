// Premium presentational card for a community event, shared by the admin "All
// events" board and the member dashboard. Layout (top to bottom):
//   1. Category / region chips (centered).
//   2. Title — large, centered.
//   3. Link button (if the event has one).
//   4. Status banner — visible when registration is closed or the event ended.
//   5. A row of two cards: Event dates (left) and Registration window (right),
//      with the "Participate" action (actionSlot) between them when sign-ups are
//      open.
//   6. Body content.
//   7. Visible-to roles (admin) + management actions (children).
// Mobile-first: everything stacks and stays within 320px.

"use client";

import { useEffect, useState } from "react";
import { CommunityEvent } from "@/types/community-event.types";
import { roleMeta } from "@/components/admin/roleMeta";
import {
  categoryChip,
  categoryHashtag,
  eventPhase,
  fmtDateTime,
  registrationState,
} from "@/components/admin/communityEventMeta";

// A ticking "now" so countdowns and the open/closed state stay live. Updates
// once a second only while there's something time-based to watch.
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

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

function DateLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-semibold tabular-nums text-zinc-300">{value}</span>
    </div>
  );
}

// Left card: the event's own start / end dates.
function EventDatesCard({ event }: { event: CommunityEvent }) {
  const hasDates = event.startsAt || event.endsAt;
  return (
    <div className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Event
      </div>
      {hasDates ? (
        <div className="mt-2.5 space-y-1.5">
          <DateLine label="Starts" value={fmtDateTime(event.startsAt)} />
          <DateLine label="Ends" value={fmtDateTime(event.endsAt)} />
        </div>
      ) : (
        <p className="mt-2.5 text-xs text-zinc-500">Dates to be announced.</p>
      )}
    </div>
  );
}

// Right card: the registration window with a clear status + live countdown.
function RegistrationCard({ event }: { event: CommunityEvent }) {
  const opensAt = event.registrationOpensAt;
  const closesAt = event.registrationClosesAt;
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
        ? "Opens soon"
        : "Registration closed";

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
          <span className={`text-xs font-extrabold tabular-nums ${accent}`}>
            {state === "before" ? "in " : "closes in "}
            {formatRemaining(remaining)}
          </span>
        )}
      </div>
      <div className="mt-2.5 space-y-1.5">
        <DateLine label="Opens" value={fmtDateTime(opensAt)} />
        <DateLine label="Closes" value={fmtDateTime(closesAt)} />
      </div>
    </div>
  );
}

// Visible message when registration has closed or the whole event has ended.
function StatusBanner({ event }: { event: CommunityEvent }) {
  const now = useNow(true);
  const phase = eventPhase(event, now);
  const reg = registrationState(event.registrationOpensAt, event.registrationClosesAt, now);

  if (phase === "past") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-500/10 px-4 py-2.5 text-sm font-bold text-zinc-300 ring-1 ring-white/10">
        <span aria-hidden>🏁</span> This event has ended.
      </div>
    );
  }
  if (reg === "closed") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-200 ring-1 ring-amber-400/25">
        <span aria-hidden>🔒</span> Registration is closed.
      </div>
    );
  }
  return null;
}

export default function CommunityEventView({
  event,
  showRoles = false,
  hideTitle = false,
  actionSlot,
  children,
}: {
  event: CommunityEvent;
  /** Show the "visible to" role chips (admin view). */
  showRoles?: boolean;
  /** Hide the big title (when a collapsible board header already shows it). */
  hideTitle?: boolean;
  /** The participate action, rendered between the two date cards (member view). */
  actionSlot?: React.ReactNode;
  /** Management actions rendered at the bottom (admin view). */
  children?: React.ReactNode;
}) {
  const cols = actionSlot ? "sm:grid-cols-[1fr_auto_1fr] sm:items-stretch" : "sm:grid-cols-2";

  return (
    <div className="min-w-0 space-y-5">
      {/* Category + region chips, centered. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${categoryChip(
            event.categoryKey
          )}`}
        >
          {categoryHashtag(event.categoryName)}
        </span>
        {event.region && (
          <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300 ring-1 ring-white/15">
            {event.region}
          </span>
        )}
      </div>

      {/* Title — large, centered. */}
      {!hideTitle && (
        <h3 className="text-balance text-center text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
          {event.title}
        </h3>
      )}

      {/* Link button (if any). */}
      {event.hasLink && event.linkUrl && (
        <div className="flex justify-center">
          <a
            href={event.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-2 truncate rounded-xl bg-sky-500/15 px-4 py-2 text-sm font-bold text-sky-200 ring-1 ring-sky-400/25 transition hover:bg-sky-500/25"
          >
            <span aria-hidden>↗</span>
            <span className="truncate">{event.linkLabel || "Open link"}</span>
          </a>
        </div>
      )}

      <StatusBanner event={event} />

      {/* Event dates · Participate · Registration window. */}
      <div className={`grid gap-3 ${cols}`}>
        <EventDatesCard event={event} />
        {actionSlot && (
          <div className="flex items-center justify-center sm:px-1">{actionSlot}</div>
        )}
        <RegistrationCard event={event} />
      </div>

      {/* Body content — left-aligned for readability. */}
      {event.content && (
        <p className="whitespace-pre-wrap break-words text-left text-sm text-zinc-300">
          {event.content}
        </p>
      )}

      {/* Visible-to roles (admin). */}
      {showRoles && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
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
