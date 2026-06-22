// Admin per-team controls in a WoT Blitz registration list: rename (+ symbol)
// and delete. Roster edits stay with the captain; the admin manages identity and
// removal. Rendered inside TeamsList via its renderActions slot.

"use client";

import { useState } from "react";
import { TournamentsService } from "@/services/tournamentsService";
import { TournamentTeam } from "@/types/tournament.types";
import SymbolPicker from "@/components/tournaments/wb/SymbolPicker";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";

export default function AdminTeamControls({
  team,
  onChanged,
}: {
  team: TournamentTeam;
  onChanged: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [symbol, setSymbol] = useState<string | null>(team.symbol);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await TournamentsService.adminUpdateWbTeam(team.id, name, symbol);
    setBusy(false);
    if (res.success) {
      setEditing(false);
      await onChanged();
    }
  };

  const remove = async () => {
    setBusy(true);
    await TournamentsService.deleteTeam(team.id);
    setBusy(false);
    setConfirmDelete(false);
    await onChanged();
  };

  return (
    <div className="w-full">
      {editing ? (
        <div className="w-full space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
          <SymbolPicker value={symbol} onChange={setSymbol} />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
          >
            Delete
          </button>
        </div>
      )}

      <ConfirmActionDialog
        isOpen={confirmDelete}
        title="Delete team"
        description={`Remove "${team.name}" from this tournament?`}
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
