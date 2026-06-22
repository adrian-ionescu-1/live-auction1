// Admin editor for a tournament's teams: rename, set the country flag, mark a
// team eliminated, preview its roster, remove it, or add a new (manual) team.
// Each row saves on its own; the parent reloads the tournament after a change.

"use client";

import { useState } from "react";
import { TournamentsService } from "@/services/tournamentsService";
import { TournamentTeam } from "@/types/tournament.types";
import FlagPicker from "@/components/community/FlagPicker";
import TeamLabel from "@/components/tournaments/TeamLabel";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";

function TeamRow({
  team,
  onChanged,
}: {
  team: TournamentTeam;
  onChanged: () => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [country, setCountry] = useState<string | null>(team.country);
  const [eliminated, setEliminated] = useState(team.eliminated);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await TournamentsService.updateTeam(team.id, name, country, eliminated);
    setBusy(false);
    if (res.success) {
      setEditing(false);
      await onChanged();
    } else {
      setError(res.error ?? "Could not save");
    }
  };

  const remove = async () => {
    setBusy(true);
    const res = await TournamentsService.deleteTeam(team.id);
    setBusy(false);
    setConfirmDelete(false);
    if (res.success) await onChanged();
    else setError(res.error ?? "Could not delete");
  };

  return (
    <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <TeamLabel team={{ name: team.name, country: team.country, eliminated: team.eliminated }} muted />
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {team.players.length} player{team.players.length === 1 ? "" : "s"}
            {team.eliminated && " · eliminated"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRosterOpen((o) => !o)}
          className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          Roster
        </button>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {rosterOpen && (
        <div className="mt-2 rounded-xl bg-black/30 p-2.5 ring-1 ring-white/10">
          {team.players.length === 0 ? (
            <p className="text-xs text-zinc-500">No players recorded.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {team.players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs"
                >
                  <span className="min-w-0 truncate text-zinc-200">{p.playerName}</span>
                  {p.amount > 0 && (
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      ${p.amount.toLocaleString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
          <label className="block">
            <span className="block text-xs font-semibold text-zinc-400">Team name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>

          <FlagPicker value={country} onChange={setCountry} />

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={eliminated}
              onChange={(e) => setEliminated(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/40 accent-emerald-500"
            />
            Eliminated (out of the competition)
          </label>

          {error && <p className="text-xs text-red-300">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={save}
              className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl bg-red-500/15 px-4 py-2 text-sm font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
            >
              Remove team
            </button>
          </div>
        </div>
      )}

      <ConfirmActionDialog
        isOpen={confirmDelete}
        title="Remove team"
        description={
          <>
            Remove <span className="font-semibold text-zinc-200">{team.name}</span> from this
            tournament? Its matches are removed too.
          </>
        }
        confirmLabel="Remove"
        tone="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default function TeamsEditor({
  tournamentId,
  teams,
  onChanged,
}: {
  tournamentId: string;
  teams: TournamentTeam[];
  onChanged: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCountry, setNewCountry] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTeam = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const res = await TournamentsService.addTeam(tournamentId, newName.trim(), newCountry);
    setBusy(false);
    if (res.success) {
      setNewName("");
      setNewCountry(null);
      setAdding(false);
      await onChanged();
    } else {
      setError(res.error ?? "Could not add team");
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {teams.length === 0 ? (
          <p className="rounded-2xl bg-black/20 p-4 text-center text-sm text-zinc-400 ring-1 ring-white/10">
            No teams yet. Create the tournament from a finished auction, or add teams manually.
          </p>
        ) : (
          teams.map((t) => <TeamRow key={t.id} team={t} onChanged={onChanged} />)
        )}
      </div>

      {adding ? (
        <div className="space-y-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
          <label className="block">
            <span className="block text-xs font-semibold text-zinc-400">New team name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. a bidder / squad name"
              className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          <FlagPicker value={newCountry} onChange={setNewCountry} />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !newName.trim()}
              onClick={addTeam}
              className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add team"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm font-semibold text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
        >
          + Add a team manually
        </button>
      )}
    </div>
  );
}
