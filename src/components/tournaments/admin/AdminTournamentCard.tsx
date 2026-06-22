// One tournament in the admin manager: a collapsible card with lifecycle actions
// (edit name/date, publish to users, finish → history, delete) and two editable
// sub-tabs — "Teams & standings" (teams editor + live standings + podium) and
// "Matches" (mix, rounds, scores, top-damage / top-kill tags).

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TournamentsService, TournamentDetail } from "@/services/tournamentsService";
import { Tournament } from "@/types/tournament.types";
import { tournamentPhase } from "@/components/admin/tournamentMeta";
import { fmtDateTime, localInputValue } from "@/components/admin/communityEventMeta";
import { computeStandings } from "@/lib/standings";
import StandingsTable from "@/components/tournaments/StandingsTable";
import TeamsEditor from "@/components/tournaments/admin/TeamsEditor";
import MatchesEditor from "@/components/tournaments/admin/MatchesEditor";
import PodiumEditor from "@/components/tournaments/admin/PodiumEditor";
import ConfirmByNameDialog from "@/components/admin/ConfirmByNameDialog";

function StatusBadge({ tournament }: { tournament: Tournament }) {
  if (tournament.status === "draft") {
    return (
      <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 ring-1 ring-amber-400/25">
        Draft
      </span>
    );
  }
  if (tournament.status === "finished") {
    return (
      <span className="rounded-full bg-zinc-500/15 px-2.5 py-0.5 text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
        Finished
      </span>
    );
  }
  const phase = tournamentPhase(tournament);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-400/25">
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
      {phase === "upcoming" ? "Published · upcoming" : "Published · live"}
    </span>
  );
}

export default function AdminTournamentCard({
  tournament,
  onChanged,
}: {
  tournament: Tournament;
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<"teams" | "matches">("teams");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tournament.name);
  const [startsAt, setStartsAt] = useState(
    tournament.startsAt ? localInputValue(new Date(tournament.startsAt)) : ""
  );
  const [busy, setBusy] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    const d = await TournamentsService.loadDetail(tournament.id);
    setDetail(d);
    setLoading(false);
  }, [tournament.id]);

  useEffect(() => {
    if (open && !detail) void loadDetail();
  }, [open, detail, loadDetail]);

  // Reload both the card detail and the parent list after a change.
  const refresh = useCallback(async () => {
    await Promise.all([loadDetail(), Promise.resolve(onChanged())]);
  }, [loadDetail, onChanged]);

  const standings = useMemo(
    () => (detail ? computeStandings(detail.teams, detail.matches) : []),
    [detail]
  );

  const podium = useMemo(() => {
    if (!detail) return undefined;
    const byId = new Map(detail.teams.map((t) => [t.id, t]));
    return {
      champion: tournament.championTeamId ? byId.get(tournament.championTeamId) ?? null : null,
      runnerUp: tournament.runnerUpTeamId ? byId.get(tournament.runnerUpTeamId) ?? null : null,
      third: tournament.thirdTeamId ? byId.get(tournament.thirdTeamId) ?? null : null,
    };
  }, [detail, tournament]);

  const saveMeta = async () => {
    setBusy(true);
    const iso = startsAt ? new Date(startsAt).toISOString() : null;
    const res = await TournamentsService.updateTournament(tournament.id, name, iso);
    setBusy(false);
    if (res.success) {
      setEditing(false);
      await onChanged();
    }
  };

  const publish = async () => {
    setBusy(true);
    await TournamentsService.publishTournament(tournament.id);
    setBusy(false);
    await onChanged();
  };

  const finish = async () => {
    setBusy(true);
    await TournamentsService.finishTournament(tournament.id);
    setBusy(false);
    setConfirmFinish(false);
    await onChanged();
  };

  const remove = async () => {
    setBusy(true);
    await TournamentsService.deleteTournament(tournament.id);
    setBusy(false);
    setConfirmDelete(false);
    await onChanged();
  };

  return (
    <div className="min-w-0 animate-fade-up rounded-3xl bg-white/5 ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="truncate text-base font-extrabold text-zinc-100">{tournament.name}</span>
          <StatusBadge tournament={tournament} />
        </div>
        <span aria-hidden className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4 sm:px-5">
          {/* Lifecycle / meta actions */}
          <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
            {editing ? (
              <div className="space-y-2">
                <label className="block">
                  <span className="block text-xs font-semibold text-zinc-400">Tournament name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold text-zinc-400">Start date &amp; time (optional)</span>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 [color-scheme:dark]"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={saveMeta}
                    className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-xs text-zinc-500">
                  {tournament.startsAt ? `🗓️ Starts ${fmtDateTime(tournament.startsAt)}` : "No start date set"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Edit details
                </button>
                {tournament.status === "draft" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={publish}
                    className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    Open to users →
                  </button>
                )}
                {tournament.status === "published" && (
                  <button
                    type="button"
                    onClick={() => setConfirmFinish(true)}
                    className="rounded-xl bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 ring-1 ring-cyan-400/25 transition hover:bg-cyan-500/25"
                  >
                    Finish → history
                  </button>
                )}
                {tournament.status === "finished" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={publish}
                    className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-xl bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="inline-flex rounded-2xl bg-black/30 p-1 ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setSubTab("teams")}
              aria-current={subTab === "teams" ? "page" : undefined}
              className={`rounded-xl px-4 py-1.5 text-sm font-bold transition ${
                subTab === "teams" ? "bg-white/10 text-zinc-100 ring-1 ring-white/15" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              Teams &amp; standings
            </button>
            <button
              type="button"
              onClick={() => setSubTab("matches")}
              aria-current={subTab === "matches" ? "page" : undefined}
              className={`rounded-xl px-4 py-1.5 text-sm font-bold transition ${
                subTab === "matches" ? "bg-white/10 text-zinc-100 ring-1 ring-white/15" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              Matches
            </button>
          </div>

          {loading || !detail ? (
            <div className="h-32 animate-pulse rounded-2xl bg-black/20" />
          ) : subTab === "teams" ? (
            <div className="space-y-5">
              <TeamsEditor tournamentId={tournament.id} teams={detail.teams} onChanged={refresh} />
              <div>
                <h4 className="mb-2 text-sm font-extrabold text-zinc-100">Live standings</h4>
                <StandingsTable standings={standings} podium={podium} />
              </div>
              <PodiumEditor tournament={tournament} teams={detail.teams} onChanged={onChanged} />
            </div>
          ) : (
            <MatchesEditor
              tournamentId={tournament.id}
              tournamentName={tournament.name}
              teams={detail.teams}
              rounds={detail.rounds}
              matches={detail.matches}
              onChanged={refresh}
            />
          )}
        </div>
      )}

      <ConfirmByNameDialog
        eventName={tournament.name}
        title="Finish tournament"
        tone="primary"
        confirmLabel="Finish & archive"
        description={
          <>
            Close <span className="font-semibold text-zinc-200">{tournament.name}</span> and move it
            to history. Users see it under “Ended”. Set the podium first so the trophy card shows.
            You can reopen it later.
          </>
        }
        isOpen={confirmFinish}
        busy={busy}
        onConfirm={finish}
        onCancel={() => setConfirmFinish(false)}
      />

      <ConfirmByNameDialog
        eventName={tournament.name}
        title="Delete tournament"
        tone="danger"
        confirmLabel="Delete permanently"
        description={
          <>
            This permanently deletes <span className="font-semibold text-zinc-200">{tournament.name}</span>{" "}
            with all its teams, rounds and matches. There is no undo.
          </>
        }
        isOpen={confirmDelete}
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
