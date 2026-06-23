// Edit a WoT Blitz tournament's info: title, description, validation region, the
// roles that can see it, and the start + registration window. Portaled,
// mobile-first. The team format is NOT editable (teams already register against
// it). Saving calls admin_wb_update_tournament via the parent.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Tournament } from "@/types/tournament.types";
import { roleMeta, TOURNAMENT_AUDIENCE_ROLES } from "@/components/admin/roleMeta";
import { localInputValue } from "@/components/admin/communityEventMeta";

const inputClass =
  "w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";
const selectClass =
  "w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-3 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

export interface EditWbPayload {
  name: string;
  description: string | null;
  region: string | null;
  visibleRoles: string[];
  startsAt: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
}

const toLocal = (iso: string | null) => (iso ? localInputValue(new Date(iso)) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export default function EditWbTournamentDialog({
  tournament,
  isOpen,
  busy,
  error,
  onSave,
  onCancel,
}: {
  tournament: Tournament | null;
  isOpen: boolean;
  busy: boolean;
  error?: string | null;
  onSave: (payload: EditWbPayload) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [startsAt, setStartsAt] = useState("");
  const [regOpensAt, setRegOpensAt] = useState("");
  const [regClosesAt, setRegClosesAt] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen || !tournament) return;
    setName(tournament.name);
    setDescription(tournament.description ?? "");
    setRegion(tournament.region ?? "");
    setRoles(new Set(tournament.visibleRoles));
    setStartsAt(toLocal(tournament.startsAt));
    setRegOpensAt(toLocal(tournament.registrationOpensAt));
    setRegClosesAt(toLocal(tournament.registrationClosesAt));
  }, [isOpen, tournament]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted || !tournament) return null;

  const toggleRole = (role: string) =>
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });

  const nameOk = name.trim().length > 0;
  const rolesOk = roles.size > 0;
  const canSave = nameOk && rolesOk && !busy;

  const save = () => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      region: region || null,
      visibleRoles: Array.from(roles),
      startsAt: toIso(startsAt),
      registrationOpensAt: toIso(regOpensAt),
      registrationClosesAt: toIso(regClosesAt),
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit tournament"
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div className="my-4 w-full max-w-md min-w-0 rounded-3xl bg-zinc-950/95 p-5 ring-1 ring-white/10 shadow-2xl sm:p-6">
          <h3 className="text-lg font-extrabold text-zinc-100">Edit tournament</h3>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="block text-sm font-semibold text-zinc-300">Title</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className={`${inputClass} mt-1.5`}
              />
              {!nameOk && (
                <span className="mt-1 block text-xs font-semibold text-amber-200">Required.</span>
              )}
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-zinc-300">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                className={`${inputClass} mt-1.5 min-h-[5rem] resize-y`}
              />
            </label>

            <label className="block">
              <span className="block text-sm font-semibold text-zinc-300">Validation region</span>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={`${selectClass} mt-1.5`}>
                <option value="" className="bg-zinc-900">No validation</option>
                <option value="eu" className="bg-zinc-900">EU</option>
                <option value="na" className="bg-zinc-900">NA</option>
                <option value="asia" className="bg-zinc-900">ASIA</option>
              </select>
            </label>

            <div>
              <span className="block text-sm font-semibold text-zinc-300">Who can see it</span>
              <div className="mt-1.5 grid grid-cols-1 gap-2 xs:grid-cols-3">
                {TOURNAMENT_AUDIENCE_ROLES.map((role) => {
                  const active = roles.has(role);
                  return (
                    <label
                      key={role}
                      className={`flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2.5 text-sm ring-1 transition ${
                        active
                          ? "bg-emerald-500/15 text-emerald-100 ring-emerald-400/25"
                          : "bg-black/25 text-zinc-300 ring-white/10 hover:bg-white/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      <span className="font-semibold">{roleMeta(role).label}</span>
                    </label>
                  );
                })}
              </div>
              {!rolesOk && (
                <p className="mt-1 text-xs font-semibold text-amber-200">Select at least one role.</p>
              )}
            </div>

            <label className="block">
              <span className="block text-sm font-semibold text-zinc-300">Start date</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={`${inputClass} mt-1.5`}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="block text-sm font-semibold text-zinc-300">Registration opens</span>
                <input
                  type="datetime-local"
                  value={regOpensAt}
                  onChange={(e) => setRegOpensAt(e.target.value)}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className="block text-sm font-semibold text-zinc-300">Registration closes</span>
                <input
                  type="datetime-local"
                  value={regClosesAt}
                  onChange={(e) => setRegClosesAt(e.target.value)}
                  className={`${inputClass} mt-1.5`}
                />
              </label>
            </div>
          </div>

          {error && <p className="mt-3 text-sm font-semibold text-red-200">{error}</p>}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
