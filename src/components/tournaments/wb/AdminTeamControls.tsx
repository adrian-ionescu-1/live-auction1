// Admin per-team controls in a WoT Blitz registration list: edit the full roster
// (name, symbol AND players) or delete the team. Rendered inside TeamsList via
// its renderActions slot; the parent passes the tournament so the editor knows
// the format + validation region.

"use client";

import { useState } from "react";
import { TournamentsService, WbMemberInput } from "@/services/tournamentsService";
import { Tournament, TournamentTeam } from "@/types/tournament.types";
import WbRegisterDialog from "@/components/tournaments/wb/WbRegisterDialog";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";

export default function AdminTeamControls({
  team,
  tournament,
  onChanged,
}: {
  team: TournamentTeam;
  tournament: Tournament;
  onChanged: () => Promise<void> | void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async (result: { name: string; symbol: string | null; members: WbMemberInput[] }) => {
    setBusy(true);
    setError(null);
    const res = await TournamentsService.adminSaveWbTeam(
      team.id,
      result.name,
      result.symbol,
      result.members
    );
    setBusy(false);
    if (res.success) {
      setEditOpen(false);
      await onChanged();
    } else setError(res.error ?? "Could not save team");
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditOpen(true);
          }}
          className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          Edit team
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-lg bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
        >
          Delete
        </button>
      </div>

      <WbRegisterDialog
        isOpen={editOpen}
        tournament={tournament}
        initialTeam={team}
        busy={busy}
        error={error}
        onSubmit={save}
        onCancel={() => setEditOpen(false)}
      />

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
