// Admin management for a WoT Blitz tournament. A collapsible card that adapts to
// the stage: registration (team list + draw groups), groups (editable standings
// + generate bracket), knockout (editable bracket + finalize). High-impact
// actions (draw, bracket, finalize, delete) require typing the tournament name.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TournamentsService, TournamentDetail } from "@/services/tournamentsService";
import { Tournament } from "@/types/tournament.types";
import { teamFormat } from "@/lib/teamFormats";
import { fmtDateTime } from "@/components/admin/communityEventMeta";
import TeamsList, { WbTeamName } from "@/components/tournaments/wb/TeamsList";
import AdminTeamControls from "@/components/tournaments/wb/AdminTeamControls";
import GroupsView from "@/components/tournaments/wb/GroupsView";
import BracketView from "@/components/tournaments/wb/BracketView";
import ConfirmByNameDialog from "@/components/admin/ConfirmByNameDialog";

function StageBadge({ t }: { t: Tournament }) {
  const map: Record<string, { label: string; cls: string }> = {
    registration: { label: "Registration", cls: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25" },
    groups: { label: "Groups", cls: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/25" },
    knockout: { label: "Knockout", cls: "bg-violet-500/15 text-violet-200 ring-violet-400/25" },
    done: { label: "Finished", cls: "bg-zinc-500/15 text-zinc-300 ring-white/10" },
  };
  const s = map[t.stage ?? "registration"] ?? map.registration;
  const draft = t.status === "draft";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${s.cls}`}>{s.label}</span>
      {draft && (
        <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 ring-1 ring-amber-400/25">
          Draft
        </span>
      )}
    </span>
  );
}

export default function AdminWbTournamentCard({
  tournament,
  onChanged,
}: {
  tournament: Tournament;
  onChanged: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [groupCount, setGroupCount] = useState(2);
  const [advance, setAdvance] = useState(2);

  const [confirmGroups, setConfirmGroups] = useState(false);
  const [confirmBracket, setConfirmBracket] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);
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

  const refresh = useCallback(async () => {
    await Promise.all([loadDetail(), Promise.resolve(onChanged())]);
  }, [loadDetail, onChanged]);

  const fmt = teamFormat(tournament.teamFormat);
  const stage = tournament.stage ?? "registration";

  const onSaveScore = useCallback(
    async (matchId: string, h: number, a: number) => {
      const res = await TournamentsService.setMatchScore(matchId, h, a);
      if (!res.success) throw new Error(res.error ?? "Could not save score");
      await refresh();
    },
    [refresh]
  );

  const teamCount = detail?.teams.length ?? 0;

  const champion = useMemo(
    () => detail?.teams.find((t) => t.id === tournament.championTeamId) ?? null,
    [detail, tournament.championTeamId]
  );

  const doGenerateGroups = async () => {
    setBusy(true);
    setNotice(null);
    const res = await TournamentsService.generateGroups(tournament.id, groupCount);
    setBusy(false);
    setConfirmGroups(false);
    if (res.success) {
      setNotice(`Drew ${res.teams} teams into ${res.groups} group(s).`);
      await refresh();
    } else setNotice(res.error ?? "Could not draw groups");
  };

  const doGenerateBracket = async () => {
    setBusy(true);
    setNotice(null);
    const res = await TournamentsService.generateBracket(tournament.id, advance);
    setBusy(false);
    setConfirmBracket(false);
    if (res.success) {
      setNotice(`Bracket created with ${res.qualified} qualified team(s).`);
      await refresh();
    } else setNotice(res.error ?? "Could not generate bracket");
  };

  const doFinalize = async () => {
    setBusy(true);
    await TournamentsService.finalizeWb(tournament.id);
    setBusy(false);
    setConfirmFinalize(false);
    await refresh();
  };

  const doPublish = async () => {
    setBusy(true);
    await TournamentsService.publishTournament(tournament.id);
    setBusy(false);
    await onChanged();
  };

  const doDelete = async () => {
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
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-400 ring-1 ring-white/10">
            WoT Blitz
          </span>
          <StageBadge t={tournament} />
        </div>
        <span aria-hidden className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/10 px-4 py-4 sm:px-5">
          {/* Meta + lifecycle */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
            <span className="mr-auto text-xs text-zinc-500">
              {fmt?.label}
              {tournament.region ? ` · ${tournament.region.toUpperCase()}` : " · no validation"}
              {tournament.registrationClosesAt
                ? ` · reg. closes ${fmtDateTime(tournament.registrationClosesAt)}`
                : ""}
            </span>
            {tournament.status === "draft" && (
              <button
                type="button"
                disabled={busy}
                onClick={doPublish}
                className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:opacity-50"
              >
                Open registration →
              </button>
            )}
            {tournament.status === "finished" && (
              <button
                type="button"
                disabled={busy}
                onClick={doPublish}
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

          {notice && <p className="text-xs text-emerald-300">{notice}</p>}

          {champion && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-400/15 to-transparent p-3 ring-1 ring-amber-400/25">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-200/80">Champion</span>
              <div className="mt-1">🏆 <WbTeamName team={champion} /></div>
            </div>
          )}

          {loading || !detail ? (
            <div className="h-32 animate-pulse rounded-2xl bg-black/20" />
          ) : (
            <>
              {/* Registration management */}
              {stage === "registration" && (
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 text-sm font-extrabold text-zinc-100">
                      Registered teams ({teamCount})
                    </h4>
                    <TeamsList
                      teams={detail.teams}
                      renderActions={(t) => <AdminTeamControls team={t} onChanged={refresh} />}
                    />
                  </div>

                  <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                    <h4 className="text-sm font-extrabold text-zinc-100">Draw groups</h4>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Seeds teams by average starter win-rate (snake draw) and creates the
                      round-robin matches. Closes registration.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="text-xs text-zinc-400">
                        Groups
                        <input
                          type="number"
                          min={1}
                          value={groupCount}
                          onChange={(e) => setGroupCount(Math.max(1, Number(e.target.value) || 1))}
                          className="ml-2 w-16 rounded-lg bg-black/40 px-2 py-1 text-sm text-zinc-100 ring-1 ring-white/10"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={teamCount < 2}
                        onClick={() => setConfirmGroups(true)}
                        className="rounded-xl bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-200 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25 disabled:opacity-50"
                      >
                        🎲 Draw groups
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Group stage */}
              {stage === "groups" && (
                <div className="space-y-4">
                  <GroupsView teams={detail.teams} matches={detail.matches} editable onSave={onSaveScore} />
                  <div className="rounded-2xl bg-black/25 p-3 ring-1 ring-white/10">
                    <h4 className="text-sm font-extrabold text-zinc-100">Generate bracket</h4>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Takes the top teams of each group into a single-elimination bracket
                      (strongest vs weakest). Play the group matches first.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <label className="text-xs text-zinc-400">
                        Advance / group
                        <input
                          type="number"
                          min={1}
                          value={advance}
                          onChange={(e) => setAdvance(Math.max(1, Number(e.target.value) || 1))}
                          className="ml-2 w-16 rounded-lg bg-black/40 px-2 py-1 text-sm text-zinc-100 ring-1 ring-white/10"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setConfirmBracket(true)}
                        className="rounded-xl bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-200 ring-1 ring-violet-400/25 transition hover:bg-violet-500/25"
                      >
                        Generate bracket →
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmGroups(true)}
                        className="rounded-xl bg-white/5 px-4 py-2 text-sm font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
                      >
                        Re-draw groups
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Knockout stage */}
              {(stage === "knockout" || stage === "done") && (
                <div className="space-y-4">
                  <BracketView teams={detail.teams} matches={detail.matches} editable onSave={onSaveScore} />
                  {stage === "knockout" && (
                    <button
                      type="button"
                      onClick={() => setConfirmFinalize(true)}
                      className="rounded-2xl bg-cyan-500/15 px-5 py-3 text-sm font-bold text-cyan-200 ring-1 ring-cyan-400/25 transition hover:bg-cyan-500/25"
                    >
                      Finalize → history
                    </button>
                  )}
                  {detail.teams.some((t) => t.groupLabel) && (
                    <details className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                      <summary className="cursor-pointer text-sm font-bold text-zinc-300">
                        Group results
                      </summary>
                      <div className="mt-3">
                        <GroupsView teams={detail.teams} matches={detail.matches} />
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmByNameDialog
        eventName={tournament.name}
        title="Draw groups"
        tone="primary"
        confirmLabel="Draw groups"
        description="This (re)draws the groups and recreates the group matches, replacing any existing group draw."
        isOpen={confirmGroups}
        busy={busy}
        onConfirm={doGenerateGroups}
        onCancel={() => setConfirmGroups(false)}
      />
      <ConfirmByNameDialog
        eventName={tournament.name}
        title="Generate bracket"
        tone="primary"
        confirmLabel="Generate bracket"
        description="This builds the knockout bracket from the current group standings, replacing any existing bracket."
        isOpen={confirmBracket}
        busy={busy}
        onConfirm={doGenerateBracket}
        onCancel={() => setConfirmBracket(false)}
      />
      <ConfirmByNameDialog
        eventName={tournament.name}
        title="Finalize tournament"
        tone="primary"
        confirmLabel="Finalize & archive"
        description="Sets the podium from the final and moves the tournament to history (Ended)."
        isOpen={confirmFinalize}
        busy={busy}
        onConfirm={doFinalize}
        onCancel={() => setConfirmFinalize(false)}
      />
      <ConfirmByNameDialog
        eventName={tournament.name}
        title="Delete tournament"
        tone="danger"
        confirmLabel="Delete permanently"
        description="Permanently deletes this tournament with all teams, groups and bracket. No undo — including from history."
        isOpen={confirmDelete}
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
