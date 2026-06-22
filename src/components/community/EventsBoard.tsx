// A 3-tab board for community events: Upcoming / Ongoing / Ended. Shared by the
// member dashboard and the admin events page. Each event is classified by
// eventPhase() and rendered through a caller-supplied `renderEvent` so each
// surface keeps its own actions (participate vs. management). Mobile-first.
//
// `showBadges` adds a small per-card marker for members (New on upcoming, Live
// on ongoing, nothing on ended); the admin passes it false — no notifications.

"use client";

import { useMemo, useState } from "react";
import { CommunityEvent } from "@/types/community-event.types";
import { eventPhase, EventPhase } from "@/components/admin/communityEventMeta";

const TABS: { id: EventPhase; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "current", label: "Ongoing" },
  { id: "past", label: "Ended" },
];

function PhaseBadge({ phase }: { phase: EventPhase }) {
  if (phase === "upcoming") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/25">
        ✓ New — opening soon
      </span>
    );
  }
  if (phase === "current") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-400/25">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" /> Live now
      </span>
    );
  }
  return null;
}

export default function EventsBoard({
  events,
  renderEvent,
  showBadges = false,
  emptyHint,
}: {
  events: CommunityEvent[];
  renderEvent: (event: CommunityEvent) => React.ReactNode;
  /** Member view: show New/Live markers per card. Admin passes false. */
  showBadges?: boolean;
  emptyHint?: string;
}) {
  const grouped = useMemo(() => {
    const g: Record<EventPhase, CommunityEvent[]> = { upcoming: [], current: [], past: [] };
    for (const e of events) g[eventPhase(e)].push(e);
    return g;
  }, [events]);

  // Land on the most relevant non-empty tab: Ongoing → Upcoming → Ended.
  const [tab, setTab] = useState<EventPhase>(() => {
    if (grouped.current.length) return "current";
    if (grouped.upcoming.length) return "upcoming";
    if (grouped.past.length) return "past";
    return "current";
  });
  // Which card is expanded (collapsed by default, like the admin auctions list).
  const [openId, setOpenId] = useState<string | null>(null);

  const list = grouped[tab];

  return (
    <div className="min-w-0">
      {/* Tabs — full-width pill, centered, scrolls if needed. */}
      <nav aria-label="Events by phase">
        <div className="overflow-x-auto rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-fit gap-1.5">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
                    active
                      ? "bg-white/10 text-zinc-100 ring-1 ring-white/15"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ring-1 ${
                      active
                        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25"
                        : "bg-white/5 text-zinc-400 ring-white/10"
                    }`}
                  >
                    {grouped[t.id].length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Cards for the active tab. */}
      <div className="mt-4 space-y-4">
        {list.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-8 text-center ring-1 ring-white/10">
            <p className="text-sm font-semibold text-zinc-300">
              {tab === "upcoming"
                ? "Nothing upcoming"
                : tab === "current"
                  ? "Nothing ongoing right now"
                  : "Nothing here yet"}
            </p>
            {emptyHint && <p className="mt-1 text-xs text-zinc-500">{emptyHint}</p>}
          </div>
        ) : (
          list.map((ev) => {
            const open = openId === ev.id;
            return (
              <div
                key={ev.id}
                className="min-w-0 animate-fade-up rounded-3xl bg-white/5 ring-1 ring-white/10"
              >
                {/* Condensed header — click to expand the full card. */}
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : ev.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="truncate text-base font-extrabold text-zinc-100">
                      {ev.title}
                    </span>
                    {showBadges ? (
                      <PhaseBadge phase={tab} />
                    ) : (
                      tab === "past" && (
                        <span className="rounded-full bg-zinc-500/15 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
                          Closed
                        </span>
                      )
                    )}
                  </div>
                  <span
                    aria-hidden
                    className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                {open && (
                  <div className="border-t border-white/10 px-5 py-5">{renderEvent(ev)}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
