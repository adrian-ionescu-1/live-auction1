// Auction room entry: the admin picks which event to run, then opens the live
// room. Choosing an event that isn't already live binds it (resets the room to
// idle and re-applies each member's reserve budget) before opening.

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EventsService } from "@/services/eventsService";
import { AuctionEvent } from "@/types/event.types";

export default function AuctionRoomSelectPage() {
  const router = useRouter();
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [liveEventId, setLiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([EventsService.listEvents(), EventsService.getLiveEvent()]).then(
      ([evs, live]) => {
        if (!active) return;
        setEvents(evs);
        setLiveEventId(live?.id ?? null);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const enter = async (ev: AuctionEvent) => {
    setError(null);
    // Already live — just open the room without resetting it.
    if (ev.id === liveEventId) {
      router.push("/login");
      return;
    }
    setBusyId(ev.id);
    const res = await EventsService.setLiveEvent(ev.id);
    setBusyId(null);
    if (res.success) {
      router.push("/login");
    } else {
      setError(res.error ?? "Could not switch the live event");
    }
  };

  return (
    <>
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
          Auction room
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose which event to run. Switching to a different event resets the room and
          re-applies every member&apos;s reserve budget.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 ring-1 ring-red-400/25">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="h-20 animate-pulse rounded-2xl bg-white/5 ring-1 ring-white/10" />
        ) : events.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
            <p className="text-sm font-semibold text-zinc-300">No events to run</p>
            <p className="mt-1 text-xs text-zinc-500">
              Create an event first, then come back to open the room.
            </p>
            <Link
              href="/admin/events/new"
              className="mt-4 inline-block rounded-2xl bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
            >
              Create event →
            </Link>
          </div>
        ) : (
          events.map((ev) => {
            const isLive = ev.id === liveEventId;
            return (
              <div
                key={ev.id}
                className={`flex flex-col gap-3 rounded-2xl p-5 ring-1 sm:flex-row sm:items-center sm:justify-between ${
                  isLive
                    ? "bg-emerald-500/5 ring-emerald-400/25"
                    : "bg-white/5 ring-white/10"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg font-extrabold text-zinc-100">
                      {ev.name}
                    </span>
                    {isLive && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/25">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {ev.playerLimit} players/member · ${ev.totalReserve.toLocaleString()} min
                    budget
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === ev.id}
                  onClick={() => enter(ev)}
                  className="shrink-0 rounded-2xl bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] disabled:opacity-50"
                >
                  {busyId === ev.id
                    ? "Switching…"
                    : isLive
                      ? "Open room →"
                      : "Run this event →"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
