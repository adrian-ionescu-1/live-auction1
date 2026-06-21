// Participant lists: one collapsible list per community event. The admin can add
// a participant manually, edit or remove a participant, and delete the whole list
// (two-step confirm). Registration data is read through the guarded RPC.
// Mobile-first.

"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CommunityEventsService } from "@/services/communityEventsService";
import {
  BlitzRegion,
  CommunityEvent,
  CommunityRegistration,
} from "@/types/community-event.types";
import { roleMeta } from "@/components/admin/roleMeta";
import { categoryHashtag } from "@/components/admin/communityEventMeta";
import RegistrationFormDialog from "@/components/community/RegistrationFormDialog";
import ImportListDialog, { ImportedRow } from "@/components/community/ImportListDialog";
import { ValidatedPlayer } from "@/components/community/BlitzValidator";
import { getCardVariant, randomVariantId } from "@/components/auction/cardDesigns";
import { randomCountryCode } from "@/lib/flags";
import Flag from "@/components/community/Flag";
import ConfirmByNameDialog from "@/components/admin/ConfirmByNameDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Rebuild a validated-player object from a stored registration (for editing).
function regToValidated(reg: CommunityRegistration | null | undefined): ValidatedPlayer | null {
  if (!reg || reg.accountId == null || !reg.playerName || !reg.blitzStats) return null;
  return { accountId: reg.accountId, playerName: reg.playerName, stats: reg.blitzStats };
}

function SourceBadge({ reg }: { reg: CommunityRegistration }) {
  if (reg.source === "manual") {
    return (
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300 ring-1 ring-white/15">
        Manual
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${roleMeta(
        reg.profileRole ?? "guest"
      ).chip}`}
    >
      {roleMeta(reg.profileRole ?? "guest").label}
    </span>
  );
}

export default function CommunityParticipantsPage() {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [regs, setRegs] = useState<Record<string, CommunityRegistration[]>>({});
  const [regLoading, setRegLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state.
  const [adding, setAdding] = useState<CommunityEvent | null>(null);
  const [editing, setEditing] = useState<{
    event: CommunityEvent;
    reg: CommunityRegistration;
  } | null>(null);
  const [removing, setRemoving] = useState<CommunityRegistration | null>(null);
  const [clearing, setClearing] = useState<CommunityEvent | null>(null);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [deletingList, setDeletingList] = useState<CommunityEvent | null>(null);
  const [importingTo, setImportingTo] = useState<CommunityEvent | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListRegion, setNewListRegion] = useState<"" | BlitzRegion>("");
  // Live text filter applied to the currently expanded list's participants.
  const [filter, setFilter] = useState("");

  const loadEvents = useCallback(async () => {
    const list = await CommunityEventsService.listEvents();
    setEvents(list);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handleCreateList = async () => {
    const name = newListName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const res = await CommunityEventsService.createParticipantList(
      name,
      newListRegion || null
    );
    setBusy(false);
    if (!res.success || !res.eventId) {
      setError(res.error ?? "Could not create the list");
      return;
    }
    setCreatingList(false);
    setNewListName("");
    setNewListRegion("");
    const list = await loadEvents();
    const created = list.find((e) => e.id === res.eventId) ?? null;
    if (created) {
      // Open the new (empty) list so the admin can add players via Blitz
      // validation or import a file — no longer forced into the import dialog.
      setOpenId(created.id);
      setFilter("");
      setRegs((prev) => ({ ...prev, [created.id]: [] }));
    }
  };

  const loadRegs = useCallback(async (eventId: string) => {
    setRegLoading(true);
    const list = await CommunityEventsService.listRegistrations(eventId);
    setRegs((prev) => ({ ...prev, [eventId]: list }));
    setRegLoading(false);
  }, []);

  const toggle = (eventId: string) => {
    if (openId === eventId) {
      setOpenId(null);
      return;
    }
    setOpenId(eventId);
    setFilter("");
    if (!regs[eventId]) void loadRegs(eventId);
  };

  const handleAdd = async (result: {
    displayName: string;
    values: Record<string, string>;
    blitz: ValidatedPlayer | null;
    cardVariant: string;
    flag: string | null;
  }) => {
    if (!adding) return;
    // Instant duplicate-name warning (the RPC also enforces this server-side).
    const incoming = (result.blitz?.playerName || result.displayName).trim().toLowerCase();
    const existing = regs[adding.id] ?? [];
    if (
      incoming &&
      existing.some(
        (r) => (r.playerName || r.displayName).trim().toLowerCase() === incoming
      )
    ) {
      setError(`"${result.blitz?.playerName || result.displayName}" is already in this list.`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await CommunityEventsService.addRegistration(
      adding.id,
      result.displayName,
      result.values,
      result.blitz,
      null,
      { variant: result.cardVariant, flag: result.flag }
    );
    setBusy(false);
    if (res.success) {
      const id = adding.id;
      setAdding(null);
      await loadRegs(id);
    } else {
      setError(res.error ?? "Could not add the participant");
    }
  };

  const handleEdit = async (result: {
    displayName: string;
    values: Record<string, string>;
    blitz: ValidatedPlayer | null;
    cardVariant: string;
    flag: string | null;
  }) => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const res = await CommunityEventsService.updateRegistration(
      editing.reg.id,
      result.displayName,
      result.values,
      result.blitz,
      { variant: result.cardVariant, flag: result.flag }
    );
    setBusy(false);
    if (res.success) {
      const id = editing.event.id;
      setEditing(null);
      await loadRegs(id);
    } else {
      setError(res.error ?? "Could not save the participant");
    }
  };

  const handleRemove = async () => {
    if (!removing) return;
    setBusy(true);
    const eventId = removing.eventId;
    const res = await CommunityEventsService.deleteRegistration(removing.id);
    setBusy(false);
    if (res.success) {
      setRemoving(null);
      await loadRegs(eventId);
    } else {
      setError(res.error ?? "Could not remove the participant");
    }
  };

  const handleImport = async (importRows: ImportedRow[]) => {
    if (!importingTo) return;
    setBusy(true);
    setError(null);
    const id = importingTo.id;
    // Skip rows whose name is already in the list, and skip duplicates within the
    // file itself — no player may appear twice in one list.
    const seen = new Set(
      (regs[id] ?? []).map((r) => (r.playerName || r.displayName).trim().toLowerCase())
    );
    let ok = 0;
    let skipped = 0;
    for (const r of importRows) {
      const key = r.displayName.trim().toLowerCase();
      if (!key || seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);
      // Imported rows usually lack card/flag info, so assign each a random card
      // design and a random country flag.
      const res = await CommunityEventsService.addRegistration(
        id,
        r.displayName,
        r.values,
        r.stats ? { playerName: r.displayName, stats: r.stats } : null,
        null,
        { variant: randomVariantId(), flag: randomCountryCode() }
      );
      if (res.success) ok += 1;
      else skipped += 1;
    }
    setBusy(false);
    setImportingTo(null);
    await loadRegs(id);
    if (skipped > 0) {
      setError(
        `Imported ${ok}/${importRows.length}. ${skipped} skipped (duplicate names already in the list).`
      );
    }
  };

  const handleClear = async () => {
    if (!clearing) return;
    setBusy(true);
    const eventId = clearing.id;
    const res = await CommunityEventsService.clearRegistrations(eventId);
    setBusy(false);
    if (res.success) {
      setClearing(null);
      setClearConfirming(false);
      await loadRegs(eventId);
    } else {
      setError(res.error ?? "Could not clear the list");
    }
  };

  // Permanently delete a standalone list (kind === 'list'), even when empty.
  // A single confirm — this is the only place a list is removed for good.
  const handleDeleteList = async () => {
    if (!deletingList) return;
    setBusy(true);
    const id = deletingList.id;
    const res = await CommunityEventsService.deleteEvent(id);
    setBusy(false);
    if (res.success) {
      setDeletingList(null);
      if (openId === id) setOpenId(null);
      setRegs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadEvents();
    } else {
      setError(res.error ?? "Could not delete the list");
    }
  };

  return (
    <>
      <div className="flex animate-fade-up flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
            Participant lists
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Lists from events, plus standalone lists you add or import. Use any of them when
            creating an auction.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewListName("");
            setError(null);
            setCreatingList(true);
          }}
          className="shrink-0 rounded-2xl bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
        >
          + Add participant list
        </button>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-200">{error}</p>}

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="h-24 animate-pulse rounded-3xl bg-white/5 ring-1 ring-white/10" />
        ) : events.length === 0 ? (
          <div className="rounded-3xl bg-white/5 p-10 text-center ring-1 ring-white/10">
            <p className="text-sm font-semibold text-zinc-300">No lists yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Add a participant list (and import a CSV/Excel), or create an event — its
              registration list shows up here too.
            </p>
          </div>
        ) : (
          events.map((ev) => {
            const isOpen = openId === ev.id;
            const list = regs[ev.id] ?? [];
            // Live filter on the open list (by display name / in-game name).
            const q = isOpen ? filter.trim().toLowerCase() : "";
            const visible = q
              ? list.filter(
                  (r) =>
                    r.displayName.toLowerCase().includes(q) ||
                    (r.playerName ?? "").toLowerCase().includes(q)
                )
              : list;
            return (
              <div
                key={ev.id}
                className="min-w-0 animate-fade-up rounded-3xl bg-white/5 ring-1 ring-white/10"
              >
                <button
                  type="button"
                  onClick={() => toggle(ev.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-extrabold text-zinc-100">
                        {ev.title}
                      </span>
                      {ev.kind === "list" ? (
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-300 ring-1 ring-white/15">
                          List
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] font-bold text-fuchsia-200/80">
                          {categoryHashtag(ev.categoryName)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {regs[ev.id] ? `${list.length} registered` : "Tap to load the list"}
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
                  <div className="space-y-4 border-t border-white/10 px-5 py-5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setAdding(ev);
                        }}
                        className="rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
                      >
                        + Add participant
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportingTo(ev)}
                        className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                      >
                        Import CSV/Excel
                      </button>
                      {ev.kind === "list" ? (
                        // Standalone list: delete the whole thing (works empty too),
                        // single confirm. This is the only place a list disappears.
                        <button
                          type="button"
                          onClick={() => setDeletingList(ev)}
                          className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
                        >
                          Delete list
                        </button>
                      ) : (
                        // Event list: only clear the registrations, keep the event.
                        <button
                          type="button"
                          onClick={() => {
                            setClearing(ev);
                            setClearConfirming(false);
                          }}
                          disabled={list.length === 0}
                          className="rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25 disabled:opacity-50"
                        >
                          Clear list
                        </button>
                      )}
                    </div>

                    {(regs[ev.id]?.length ?? 0) > 0 && (
                      <div className="relative">
                        <input
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          placeholder="Filter participants by name…"
                          autoComplete="off"
                          className="w-full min-w-0 rounded-xl bg-black/30 px-4 py-2.5 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                        />
                      </div>
                    )}

                    {regLoading && !regs[ev.id] ? (
                      <div className="h-20 animate-pulse rounded-2xl bg-black/25" />
                    ) : list.length === 0 ? (
                      <p className="rounded-2xl bg-black/25 p-5 text-center text-sm text-zinc-400 ring-1 ring-white/10">
                        Nobody has registered yet.
                      </p>
                    ) : visible.length === 0 ? (
                      <p className="rounded-2xl bg-black/25 p-5 text-center text-sm text-zinc-400 ring-1 ring-white/10">
                        No participants match &ldquo;{filter.trim()}&rdquo;.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {visible.map((reg) => (
                          <li
                            key={reg.id}
                            className="min-w-0 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Flag code={reg.flag} className="h-4 w-auto" />
                              <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-100">
                                {reg.displayName}
                              </span>
                              <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-200 ring-1 ring-violet-400/25">
                                🎴 {getCardVariant(reg.cardVariant).name}
                              </span>
                              <SourceBadge reg={reg} />
                            </div>
                            {reg.source === "self" && reg.profileUsername && (
                              <p className="mt-0.5 text-[11px] text-zinc-500">
                                from{" "}
                                <span className="text-zinc-300">@{reg.profileUsername}</span>
                              </p>
                            )}

                            {reg.blitzStats && (
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-black/30 px-2 py-1 text-center ring-1 ring-white/10">
                                  <div className="text-[9px] uppercase tracking-wide text-zinc-500">
                                    Battles
                                  </div>
                                  <div className="truncate text-xs font-bold tabular-nums text-emerald-200">
                                    {reg.blitzStats.battles.toLocaleString()}
                                  </div>
                                </div>
                                <div className="rounded-lg bg-black/30 px-2 py-1 text-center ring-1 ring-white/10">
                                  <div className="text-[9px] uppercase tracking-wide text-zinc-500">
                                    Win rate
                                  </div>
                                  <div className="truncate text-xs font-bold tabular-nums text-emerald-200">
                                    {reg.blitzStats.winrate.toFixed(2)}%
                                  </div>
                                </div>
                                <div className="rounded-lg bg-black/30 px-2 py-1 text-center ring-1 ring-white/10">
                                  <div className="text-[9px] uppercase tracking-wide text-zinc-500">
                                    Avg dmg
                                  </div>
                                  <div className="truncate text-xs font-bold tabular-nums text-emerald-200">
                                    {reg.blitzStats.avgDamage.toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            )}

                            {ev.registrationFields.length > 0 && (
                              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 xs:grid-cols-2">
                                {ev.registrationFields.map((f) => (
                                  <div key={f.key} className="min-w-0 text-xs">
                                    <dt className="text-zinc-500">{f.label}</dt>
                                    <dd className="truncate font-semibold text-zinc-200">
                                      {reg.values[f.key]?.trim() || "—"}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            )}

                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setError(null);
                                  setEditing({ event: ev, reg });
                                }}
                                className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setRemoving(reg)}
                                className="rounded-lg px-2.5 py-1 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/15"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add a participant manually. */}
      <RegistrationFormDialog
        isOpen={adding !== null}
        title="Add participant"
        description={adding ? `To "${adding.title}".` : undefined}
        fields={adding?.registrationFields ?? []}
        region={adding?.region ?? null}
        confirmLabel="Add participant"
        busy={busy}
        error={error}
        showNameField
        onSubmit={handleAdd}
        onCancel={() => {
          setAdding(null);
          setError(null);
        }}
      />

      {/* Edit a participant's data. */}
      <RegistrationFormDialog
        isOpen={editing !== null}
        title="Edit participant"
        fields={editing?.event.registrationFields ?? []}
        region={editing?.event.region ?? null}
        confirmLabel="Save changes"
        busy={busy}
        error={error}
        showNameField
        initialName={editing?.reg.displayName ?? ""}
        initialValues={editing?.reg.values ?? {}}
        initialBlitz={regToValidated(editing?.reg)}
        initialCardVariant={editing?.reg.cardVariant ?? null}
        initialFlag={editing?.reg.flag ?? null}
        onSubmit={handleEdit}
        onCancel={() => {
          setEditing(null);
          setError(null);
        }}
      />

      {/* Name a new standalone list, optionally pick a Blitz region. */}
      {creatingList &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Add participant list"
          >
            <div className="w-full max-w-md rounded-3xl bg-zinc-950/95 p-6 ring-1 ring-white/10 shadow-2xl">
              <h3 className="text-lg font-extrabold text-zinc-100">Add participant list</h3>
              <p className="mt-1 text-sm text-zinc-400">
                A standalone list — no event needed. Add players by validating their Blitz account,
                by hand, or import a CSV/Excel. It can be used when creating an auction.
              </p>
              <label className="mt-4 block">
                <span className="block text-sm font-semibold text-zinc-300">List name</span>
                <input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateList();
                    }
                  }}
                  placeholder="List name (e.g. EU qualifiers)"
                  maxLength={120}
                  autoFocus
                  className="mt-1.5 w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </label>
              <label className="mt-4 block">
                <span className="block text-sm font-semibold text-zinc-300">Blitz region</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Pick a region to add players by validating a real WoT Blitz account. Leave as
                  &ldquo;No validation&rdquo; for a plain list (manual / import only).
                </span>
                <select
                  value={newListRegion}
                  onChange={(e) => setNewListRegion(e.target.value as "" | BlitzRegion)}
                  className="mt-1.5 w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-3 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                  <option value="" className="bg-zinc-900 text-zinc-100">
                    No validation
                  </option>
                  <option value="eu" className="bg-zinc-900 text-zinc-100">
                    EU
                  </option>
                  <option value="na" className="bg-zinc-900 text-zinc-100">
                    NA
                  </option>
                  <option value="asia" className="bg-zinc-900 text-zinc-100">
                    ASIA
                  </option>
                </select>
              </label>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingList(false);
                    setNewListRegion("");
                  }}
                  disabled={busy}
                  className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateList}
                  disabled={busy || !newListName.trim()}
                  className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Creating…" : "Create list"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Import a list from CSV / Excel. */}
      <ImportListDialog
        isOpen={importingTo !== null}
        eventTitle={importingTo?.title ?? ""}
        busy={busy}
        onImport={handleImport}
        onCancel={() => setImportingTo(null)}
      />

      {/* Remove one participant. */}
      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove this participant?"
        message={`"${removing?.displayName ?? ""}" will be removed from the list.`}
        tone="danger"
        confirmLabel="Remove"
        busy={busy}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />

      {/* Clear an event's registrations — step 1: type the event title. */}
      <ConfirmByNameDialog
        eventName={clearing?.title ?? ""}
        title="Clear participant list"
        tone="danger"
        confirmLabel="Continue"
        description={
          <>
            This removes <span className="font-semibold text-zinc-200">every</span> registration
            for <span className="font-semibold text-zinc-200">{clearing?.title}</span>. The event
            itself stays.
          </>
        }
        isOpen={clearing !== null && !clearConfirming}
        busy={false}
        onConfirm={() => setClearConfirming(true)}
        onCancel={() => setClearing(null)}
      />

      {/* Clear an event's registrations — step 2: final confirm. */}
      <ConfirmDialog
        isOpen={clearConfirming}
        title="Clear the whole list?"
        message={`There's no undo. Every registration for "${clearing?.title ?? ""}" will be permanently deleted.`}
        tone="danger"
        confirmLabel="Yes, clear the list"
        busy={busy}
        onConfirm={handleClear}
        onCancel={() => {
          setClearing(null);
          setClearConfirming(false);
        }}
      />

      {/* Delete a standalone list entirely — single confirm, works when empty. */}
      <ConfirmDialog
        isOpen={deletingList !== null}
        title="Delete this list?"
        message={`"${deletingList?.title ?? ""}" and all its participants will be permanently removed. This can't be undone.`}
        tone="danger"
        confirmLabel="Yes, delete the list"
        busy={busy}
        onConfirm={handleDeleteList}
        onCancel={() => setDeletingList(null)}
      />
    </>
  );
}
