// All created events. Each event shows its rules and (when expanded) the members
// enrolled in it, with an "Add member" control for anyone missed at creation and
// a "Make live & open room" action. The live event is highlighted.

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EventsService } from "@/services/eventsService";
import { MembersService } from "@/services/membersService";
import { AuctionEvent, EventMember, EventResult } from "@/types/event.types";
import { Member } from "@/types/account.types";
import { useMembersPresence } from "@/app/_components/useMembersPresence";
import EventMembersCard from "@/components/admin/EventMembersCard";
import EventResultsCard from "@/components/admin/EventResultsCard";
import ConfirmByNameDialog from "@/components/admin/ConfirmByNameDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TimeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className="font-semibold text-zinc-300 tabular-nums">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/25 px-3 py-2 ring-1 ring-white/10">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-sm font-bold tabular-nums text-zinc-100">{value}</div>
    </div>
  );
}

function AddMemberControl({
  candidates,
  onAdd,
  busy,
}: {
  candidates: Member[];
  onAdd: (profileId: string) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState("");

  if (candidates.length === 0) {
    return (
      <p className="text-xs text-zinc-500">All members are already enrolled in this event.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={busy}
        className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-60"
      >
        {/* Native option lists fall back to the OS theme, which renders nearly
            invisible on a transparent dark control — pin a solid background and
            light text so the opened list is readable. */}
        <option value="" className="bg-zinc-900 text-zinc-100">
          Select a member to add…
        </option>
        {candidates.map((m) => (
          <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-100">
            {m.username}
            {m.role.toLowerCase() !== "bidder" ? ` (${m.role})` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy || !selected}
        onClick={() => selected && onAdd(selected)}
        className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add member"}
      </button>
    </div>
  );
}

export default function EventsListPage() {
  const router = useRouter();
  const onlineIds = useMembersPresence();

  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [liveEventId, setLiveEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [results, setResults] = useState<EventResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<AuctionEvent | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reopening, setReopening] = useState<AuctionEvent | null>(null);
  const [reopenConfirming, setReopenConfirming] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);

  const loadBase = useCallback(async () => {
    const [evs, ms, live] = await Promise.all([
      EventsService.listEvents(),
      MembersService.getAllMembers(),
      EventsService.getLiveEvent(),
    ]);
    setEvents(evs);
    setAllMembers(ms);
    setLiveEventId(live?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBase();
  }, [loadBase]);

  const loadMembers = useCallback(async (eventId: string) => {
    setMembersLoading(true);
    const list = await EventsService.listEventMembers(eventId);
    setMembers(list);
    setMembersLoading(false);
  }, []);

  const loadResults = useCallback(async (eventId: string) => {
    setResultsLoading(true);
    const list = await EventsService.listEventResults(eventId);
    setResults(list);
    setResultsLoading(false);
  }, []);

  const toggleSelect = (eventId: string) => {
    if (selectedId === eventId) {
      setSelectedId(null);
      setMembers([]);
      setResults([]);
      return;
    }
    setSelectedId(eventId);
    loadMembers(eventId);
    loadResults(eventId);
  };

  const handleAddMember = async (profileId: string) => {
    if (!selectedId) return;
    setBusy(true);
    const res = await EventsService.addMember(selectedId, profileId);
    if (res.success) {
      await Promise.all([loadMembers(selectedId), loadBase()]);
    }
    setBusy(false);
  };

  const handleMakeLive = async (eventId: string) => {
    setBusy(true);
    const res = await EventsService.setLiveEvent(eventId);
    setBusy(false);
    if (res.success) {
      router.push("/login");
    }
  };

  const closeDelete = () => {
    setDeleting(null);
    setDeleteConfirming(false);
  };

  const closeReopen = () => {
    setReopening(null);
    setReopenConfirming(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await EventsService.deleteEvent(deleting.id);
    setDeleteBusy(false);
    if (res.success) {
      if (selectedId === deleting.id) {
        setSelectedId(null);
        setMembers([]);
        setResults([]);
      }
      closeDelete();
      await loadBase();
    }
  };

  const handleReopen = async () => {
    if (!reopening) return;
    setReopenBusy(true);
    const res = await EventsService.setLiveEvent(reopening.id);
    setReopenBusy(false);
    if (res.success) {
      closeReopen();
      router.push("/login");
    }
  };

  const enrolledIds = new Set(members.map((m) => m.profileId));
  const candidates = allMembers.filter((m) => !enrolledIds.has(m.id));

  return (
    <>
      <div className="flex animate-fade-up flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
            Auctions
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tap an auction to see its members or add anyone who was missed.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-2xl bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
        >
          + Create auction
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="h-28 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />
        ) : events.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
            <p className="text-sm font-semibold text-zinc-300">No events yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Create your first event to set the rules and let bidders join.
            </p>
          </div>
        ) : (
          events.map((ev) => {
            const isLive = ev.id === liveEventId;
            const isOpen = selectedId === ev.id;
            return (
              <div
                key={ev.id}
                className={`animate-fade-up rounded-3xl ring-1 transition ${
                  isLive
                    ? "bg-emerald-500/5 ring-emerald-400/25"
                    : "bg-white/5 ring-white/10"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSelect(ev.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-lg font-extrabold text-zinc-100">
                        {ev.name}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/25">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                        </span>
                      )}
                      {ev.status === "finished" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-400/25">
                          ✓ Finished
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {ev.playerLimit} players/member · ${ev.totalReserve.toLocaleString()} min
                      budget · created {new Date(ev.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className={`shrink-0 text-zinc-500 transition ${isOpen ? "rotate-180" : ""}`}
                  >
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div className="space-y-5 border-t border-white/10 px-5 py-5">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Stat label="Players / member" value={String(ev.playerLimit)} />
                      <Stat label="Opening bid" value={`$${ev.bidStart.toLocaleString()}`} />
                      <Stat
                        label="Reserve / player"
                        value={`$${ev.reservePerPlayer.toLocaleString()}`}
                      />
                      <Stat label="Budget / member" value={`$${ev.memberBudget.toLocaleString()}`} />
                      <Stat label="Seconds / player" value={`${ev.playerDuration}s`} />
                      <Stat
                        label="Extend"
                        value={`+${ev.extendAmount}s @ ${ev.extendThreshold}s`}
                      />
                      <Stat
                        label="Bid buttons"
                        value={ev.bidIncrements.map((n) => `+${n}`).join(" ") || "—"}
                      />
                    </div>

                    <div className="space-y-1.5 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                      <TimeRow label="Created" value={fmtDateTime(ev.createdAt)} />
                      {ev.opensAt && (
                        <TimeRow
                          label={
                            new Date(ev.opensAt).getTime() > Date.now()
                              ? "Opens (scheduled)"
                              : "Opened"
                          }
                          value={fmtDateTime(ev.opensAt)}
                        />
                      )}
                      <TimeRow label="Available to enter" value={fmtDateTime(ev.availableAt)} />
                      <TimeRow
                        label="Finished"
                        value={ev.status === "finished" ? fmtDateTime(ev.finishedAt) : "In progress"}
                      />
                      {ev.status === "finished" && (
                        <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-cyan-200/80">
                          Auction closed — the tournament matches between teams follow next.
                        </p>
                      )}
                    </div>

                    {membersLoading ? (
                      <div className="h-24 animate-pulse rounded-3xl bg-black/25" />
                    ) : (
                      <EventMembersCard
                        title="Enrolled members"
                        members={members.map((m) => ({
                          id: m.profileId,
                          username: m.username,
                          avatarUrl: m.avatarUrl,
                          banned: m.banned,
                        }))}
                        onlineIds={onlineIds}
                        emptyHint="No members enrolled. Add one below."
                      />
                    )}

                    <EventResultsCard
                      eventName={ev.name}
                      results={results}
                      loading={resultsLoading}
                    />

                    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
                      <h3 className="mb-3 text-base font-extrabold text-zinc-100">
                        Add a member
                      </h3>
                      <p className="mb-3 text-xs text-zinc-500">
                        The member is granted the Bidder role, enrolled, and gets the event
                        rules + reserve budget applied.
                      </p>
                      <AddMemberControl
                        candidates={candidates}
                        onAdd={handleAddMember}
                        busy={busy}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {ev.status === "finished" ? (
                        <button
                          type="button"
                          onClick={() => setReopening(ev)}
                          className="rounded-2xl bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98]"
                        >
                          Reopen event →
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleMakeLive(ev.id)}
                          className="rounded-2xl bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] disabled:opacity-50"
                        >
                          {isLive ? "Open auction room →" : "Make live & open room →"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleting(ev)}
                        className="rounded-2xl bg-red-500/15 px-5 py-3 text-sm font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25 active:scale-[0.98]"
                      >
                        Delete event
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete — step 1: type the event name to confirm. */}
      <ConfirmByNameDialog
        eventName={deleting?.name ?? ""}
        title="Delete event"
        tone="danger"
        confirmLabel="Continue"
        description={
          <>
            This permanently deletes{" "}
            <span className="font-semibold text-zinc-200">{deleting?.name}</span> and its
            results.{" "}
            {deleting?.id === liveEventId && (
              <span className="text-amber-200">
                It is the live event — deleting it idles the auction room.
              </span>
            )}
          </>
        }
        isOpen={deleting !== null && !deleteConfirming}
        busy={false}
        onConfirm={() => setDeleteConfirming(true)}
        onCancel={closeDelete}
      />

      {/* Delete — step 2: final "are you sure" before the irreversible action. */}
      <ConfirmDialog
        isOpen={deleteConfirming}
        title="Delete this event for good?"
        message={`There's no undo. "${deleting?.name ?? ""}" and all of its results will be permanently removed.`}
        tone="danger"
        confirmLabel="Yes, delete it"
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={closeDelete}
      />

      {/* Reopen — step 1: type the event name to confirm. */}
      <ConfirmByNameDialog
        eventName={reopening?.name ?? ""}
        title="Reopen event"
        tone="primary"
        confirmLabel="Continue"
        description={
          <>
            Reopening{" "}
            <span className="font-semibold text-zinc-200">{reopening?.name}</span> re-runs it
            from scratch: results are cleared, every member&apos;s budget is restored, and they
            can enter again.
          </>
        }
        isOpen={reopening !== null && !reopenConfirming}
        busy={false}
        onConfirm={() => setReopenConfirming(true)}
        onCancel={closeReopen}
      />

      {/* Reopen — step 2: final "are you sure" before wiping results. */}
      <ConfirmDialog
        isOpen={reopenConfirming}
        title="Reopen this event?"
        message={`This wipes the current results of "${reopening?.name ?? ""}", restores every member's budget, and makes the event live again.`}
        tone="primary"
        confirmLabel="Yes, reopen it"
        busy={reopenBusy}
        onConfirm={handleReopen}
        onCancel={closeReopen}
      />
    </>
  );
}
