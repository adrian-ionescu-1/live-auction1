// All community events. Each card shows the announcement (via CommunityEventView)
// plus admin controls: edit info, extend the event date, reopen/extend the
// registration window, and delete (single confirm). Mobile-first.

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CommunityEventsService } from "@/services/communityEventsService";
import { CommunityEvent } from "@/types/community-event.types";
import CommunityEventView from "@/components/community/CommunityEventView";
import EventsBoard from "@/components/community/EventsBoard";
import EditCommunityEventDialog from "@/components/community/EditCommunityEventDialog";
import DatePromptDialog from "@/components/community/DatePromptDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ConfirmByNameDialog from "@/components/admin/ConfirmByNameDialog";
import { localInputValue, registrationState } from "@/components/admin/communityEventMeta";

export default function CommunityEventsListPage() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<CommunityEvent | null>(null);
  const [extending, setExtending] = useState<CommunityEvent | null>(null);
  const [reopening, setReopening] = useState<CommunityEvent | null>(null);
  const [extendingReg, setExtendingReg] = useState<CommunityEvent | null>(null);
  const [closing, setClosing] = useState<CommunityEvent | null>(null);
  const [deleting, setDeleting] = useState<CommunityEvent | null>(null);

  const load = useCallback(async () => {
    const list = await CommunityEventsService.listEvents();
    // Standalone participant lists are managed on the Participant lists page.
    setEvents(list.filter((e) => e.kind === "event"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveEdit = async (
    payload: Omit<Parameters<typeof CommunityEventsService.updateEvent>[0], "eventId">
  ) => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const res = await CommunityEventsService.updateEvent({ eventId: editing.id, ...payload });
    setBusy(false);
    if (res.success) {
      setEditing(null);
      await load();
    } else {
      setError(res.error ?? "Could not save changes");
    }
  };

  const handleExtend = async (iso: string) => {
    if (!extending) return;
    setBusy(true);
    const res = await CommunityEventsService.extendEvent(extending.id, iso);
    setBusy(false);
    if (res.success) {
      setExtending(null);
      await load();
    } else {
      setError(res.error ?? "Could not extend the event");
    }
  };

  const handleReopen = async (iso: string) => {
    if (!reopening) return;
    setBusy(true);
    const res = await CommunityEventsService.reopenRegistration(reopening.id, iso);
    setBusy(false);
    if (res.success) {
      setReopening(null);
      await load();
    } else {
      setError(res.error ?? "Could not reopen registration");
    }
  };

  // Extend = push the close time further out while registration is still open.
  // Same server effect as reopen (set a new registration_closes_at).
  const handleExtendReg = async (iso: string) => {
    if (!extendingReg) return;
    setBusy(true);
    const res = await CommunityEventsService.reopenRegistration(extendingReg.id, iso);
    setBusy(false);
    if (res.success) {
      setExtendingReg(null);
      await load();
    } else {
      setError(res.error ?? "Could not extend registration");
    }
  };

  const handleClose = async () => {
    if (!closing) return;
    setBusy(true);
    const res = await CommunityEventsService.closeRegistration(closing.id);
    setBusy(false);
    if (res.success) {
      setClosing(null);
      await load();
    } else {
      setError(res.error ?? "Could not close registration");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    // Deleting an event keeps its participants: the row becomes a standalone
    // list in the Participant lists page (only removed for good there).
    const res = await CommunityEventsService.convertEventToList(deleting.id);
    setBusy(false);
    if (res.success) {
      setDeleting(null);
      await load();
    } else {
      setError(res.error ?? "Could not delete the event");
    }
  };

  const btn =
    "rounded-xl px-3 py-2 text-xs font-bold ring-1 transition disabled:opacity-50";

  return (
    <>
      <div className="flex animate-fade-up flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
            Events
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Announcements members register for. Manage each one below.
          </p>
        </div>
        <Link
          href="/admin/community-events/new"
          className="rounded-2xl bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
        >
          + Create event
        </Link>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-200">{error}</p>}

      <div className="mt-6">
        {loading ? (
          <div className="h-40 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />
        ) : events.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
            <p className="text-sm font-semibold text-zinc-300">No events yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Create your first event to let members register.
            </p>
          </div>
        ) : (
          <EventsBoard
            events={events}
            emptyHint="Create an event to let members register."
            renderEvent={(ev) => {
              const regState = registrationState(
                ev.registrationOpensAt,
                ev.registrationClosesAt
              );
              const regOpen = regState === "open";
              const regClosed = regState === "closed";
              return (
              <CommunityEventView event={ev} showRoles hideTitle>
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditing(ev)}
                    className={`${btn} bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10`}
                  >
                    Edit info
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtending(ev)}
                    className={`${btn} bg-sky-500/15 text-sky-200 ring-sky-400/25 hover:bg-sky-500/25`}
                  >
                    Extend event
                  </button>
                  {/* Reopen: only when registration isn't already open. */}
                  <button
                    type="button"
                    onClick={() => setReopening(ev)}
                    disabled={regOpen}
                    title={regOpen ? "Registration is already open" : undefined}
                    className={`${btn} bg-emerald-500/15 text-emerald-200 ring-emerald-400/25 hover:bg-emerald-500/25`}
                  >
                    Reopen registration
                  </button>
                  {/* Extend: push the close time out while registration is open. */}
                  <button
                    type="button"
                    onClick={() => setExtendingReg(ev)}
                    disabled={!regOpen}
                    title={!regOpen ? "Registration isn't open" : undefined}
                    className={`${btn} bg-indigo-500/15 text-indigo-200 ring-indigo-400/25 hover:bg-indigo-500/25`}
                  >
                    Extend registration
                  </button>
                  {/* Close: only when registration isn't already closed. */}
                  <button
                    type="button"
                    onClick={() => setClosing(ev)}
                    disabled={regClosed}
                    title={regClosed ? "Registration is already closed" : undefined}
                    className={`${btn} bg-amber-500/15 text-amber-200 ring-amber-400/25 hover:bg-amber-500/25`}
                  >
                    Close registration
                  </button>
                  <Link
                    href="/admin/community-events/participants"
                    className={`${btn} bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10`}
                  >
                    Participants
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleting(ev)}
                    className={`${btn} bg-red-500/15 text-red-200 ring-red-400/25 hover:bg-red-500/25`}
                  >
                    Delete
                  </button>
                </div>
              </CommunityEventView>
              );
            }}
          />
        )}
      </div>

      <EditCommunityEventDialog
        event={editing}
        isOpen={editing !== null}
        busy={busy}
        onSave={handleSaveEdit}
        onCancel={() => setEditing(null)}
      />

      <DatePromptDialog
        isOpen={extending !== null}
        title="Extend event"
        description={
          <>
            Push the end date of{" "}
            <span className="font-semibold text-zinc-200">{extending?.title}</span> out to a new
            time. This is informational only.
          </>
        }
        label="New event end"
        initial={
          extending?.endsAt ? localInputValue(new Date(extending.endsAt)) : undefined
        }
        confirmLabel="Extend"
        busy={busy}
        onConfirm={handleExtend}
        onCancel={() => setExtending(null)}
      />

      <DatePromptDialog
        isOpen={reopening !== null}
        title="Reopen registration"
        description={
          <>
            Reopen sign-ups for{" "}
            <span className="font-semibold text-zinc-200">{reopening?.title}</span> by setting a
            new close time. Members can register again until then.
          </>
        }
        label="Registration closes at"
        initial={
          reopening?.registrationClosesAt
            ? localInputValue(new Date(reopening.registrationClosesAt))
            : undefined
        }
        confirmLabel="Reopen"
        busy={busy}
        onConfirm={handleReopen}
        onCancel={() => setReopening(null)}
      />

      <DatePromptDialog
        isOpen={extendingReg !== null}
        title="Extend registration"
        description={
          <>
            Push the registration close time for{" "}
            <span className="font-semibold text-zinc-200">{extendingReg?.title}</span> further out,
            so members have more time to sign up.
          </>
        }
        label="Registration closes at"
        initial={
          extendingReg?.registrationClosesAt
            ? localInputValue(new Date(extendingReg.registrationClosesAt))
            : undefined
        }
        confirmLabel="Extend"
        busy={busy}
        onConfirm={handleExtendReg}
        onCancel={() => setExtendingReg(null)}
      />

      <ConfirmDialog
        isOpen={closing !== null}
        title="Close registration now?"
        message={`Registration for "${closing?.title ?? ""}" will close immediately, even though the window hadn't ended. You can reopen it later.`}
        tone="danger"
        confirmLabel="Close registration"
        busy={busy}
        onConfirm={handleClose}
        onCancel={() => setClosing(null)}
      />

      <ConfirmByNameDialog
        isOpen={deleting !== null}
        eventName={deleting?.title ?? ""}
        title="Delete this event?"
        tone="danger"
        confirmLabel="Delete event"
        busy={busy}
        description={
          <>
            The announcement{" "}
            <span className="font-semibold text-zinc-200">{deleting?.title}</span> is removed from
            Events. Its participant list is kept — it moves to{" "}
            <span className="font-semibold text-zinc-200">Participant lists</span>, where you can
            still use it for an auction or delete it for good.
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
