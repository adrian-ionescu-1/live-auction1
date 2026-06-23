// Member-facing view of a WoT Blitz tournament. Adapts to the stage:
//   * registration → register / edit / withdraw your team + the registered list
//   * groups       → group standings + matches (read-only)
//   * knockout/done→ bracket (+ groups, teams), champion banner when done
// The captain (whoever registered the team) can edit or withdraw while the
// registration window is open. Everything else is read-only.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TournamentsService, TournamentDetail, WbMemberInput } from "@/services/tournamentsService";
import { Tournament, TournamentTeam } from "@/types/tournament.types";
import { fmtDateTime } from "@/components/admin/communityEventMeta";
import { teamFormat } from "@/lib/teamFormats";
import WbRegisterDialog from "@/components/tournaments/wb/WbRegisterDialog";
import TeamsList, { WbTeamName } from "@/components/tournaments/wb/TeamsList";
import GroupsView from "@/components/tournaments/wb/GroupsView";
import BracketView from "@/components/tournaments/wb/BracketView";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";

type SubTab = "bracket" | "groups" | "teams";

export default function WbTournamentView({
  tournament,
  myProfileId,
}: {
  tournament: Tournament;
  myProfileId: string | null;
}) {
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<TournamentTeam | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>("bracket");

  const load = useCallback(async () => {
    const d = await TournamentsService.loadDetail(tournament.id);
    setDetail(d);
    setLoading(false);
  }, [tournament.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const stage = tournament.stage ?? "registration";
  const fmt = teamFormat(tournament.teamFormat);

  const regOpen = useMemo(() => {
    if (stage !== "registration") return false;
    const now = Date.now();
    if (tournament.registrationOpensAt && now < new Date(tournament.registrationOpensAt).getTime())
      return false;
    if (tournament.registrationClosesAt && now > new Date(tournament.registrationClosesAt).getTime())
      return false;
    return true;
  }, [stage, tournament.registrationOpensAt, tournament.registrationClosesAt]);

  const myTeam = useMemo(
    () => detail?.teams.find((t) => myProfileId && t.captainProfileId === myProfileId) ?? null,
    [detail, myProfileId]
  );

  const champion = useMemo(() => {
    if (tournament.status !== "finished" || !detail) return null;
    return detail.teams.find((t) => t.id === tournament.championTeamId) ?? null;
  }, [detail, tournament]);

  const submitTeam = async (result: {
    name: string;
    symbol: string | null;
    members: WbMemberInput[];
  }) => {
    setBusy(true);
    setError(null);
    const res = editTeam
      ? await TournamentsService.updateOwnTeam(editTeam.id, result.name, result.symbol, result.members)
      : await TournamentsService.registerTeam(tournament.id, result.name, result.symbol, result.members);
    setBusy(false);
    if (res.success) {
      setDialogOpen(false);
      setEditTeam(null);
      await load();
    } else {
      setError(res.error ?? "Could not save your team");
    }
  };

  const withdraw = async () => {
    if (!myTeam) return;
    setBusy(true);
    await TournamentsService.withdrawOwnTeam(myTeam.id);
    setBusy(false);
    setConfirmWithdraw(false);
    await load();
  };

  if (loading || !detail) {
    return <div className="h-28 animate-pulse rounded-2xl bg-black/20" />;
  }

  const hasGroups = detail.teams.some((t) => t.groupLabel);
  const hasBracket = detail.matches.some((m) => m.stage === "knockout");

  // Pick a sensible default sub-tab for the current stage.
  const availableTabs: SubTab[] = [
    ...(hasBracket ? (["bracket"] as SubTab[]) : []),
    ...(hasGroups ? (["groups"] as SubTab[]) : []),
    "teams",
  ];
  const activeTab = availableTabs.includes(subTab) ? subTab : availableTabs[0];

  return (
    <div className="space-y-4">
      {tournament.description && (
        <p className="whitespace-pre-wrap text-sm text-zinc-300">{tournament.description}</p>
      )}

      <div className="flex flex-wrap gap-2 text-[11px]">
        {fmt && (
          <span className="rounded-full bg-white/5 px-2.5 py-1 font-semibold text-zinc-300 ring-1 ring-white/10">
            {fmt.label}
          </span>
        )}
        {tournament.region && (
          <span className="rounded-full bg-white/5 px-2.5 py-1 font-semibold uppercase text-zinc-300 ring-1 ring-white/10">
            {tournament.region}
          </span>
        )}
        {tournament.registrationClosesAt && stage === "registration" && (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-zinc-400 ring-1 ring-white/10">
            Registration closes {fmtDateTime(tournament.registrationClosesAt)}
          </span>
        )}
      </div>

      {champion && (
        <div className="rounded-2xl bg-gradient-to-br from-amber-400/15 to-transparent p-4 ring-1 ring-amber-400/25">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-200/80">Champion</div>
          <div className="mt-1 text-lg">
            🏆 <WbTeamName team={champion} className="text-lg" />
          </div>
        </div>
      )}

      {/* Registration stage */}
      {stage === "registration" && (
        <div className="space-y-3">
          {myProfileId && (
            myTeam ? (
              <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/25">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wide text-emerald-200/80">
                      Your team
                    </div>
                    <WbTeamName team={myTeam} />
                  </div>
                  {regOpen ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTeam(myTeam);
                          setDialogOpen(true);
                        }}
                        className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-zinc-100 ring-1 ring-white/15 transition hover:bg-white/20"
                      >
                        Edit team
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmWithdraw(true)}
                        className="rounded-xl bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
                      >
                        Cancel team
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-zinc-300 ring-1 ring-white/10">
                      Locked in
                    </span>
                  )}
                </div>
              </div>
            ) : regOpen ? (
              <button
                type="button"
                onClick={() => {
                  setEditTeam(null);
                  setDialogOpen(true);
                }}
                className="w-full rounded-2xl bg-emerald-500/20 px-5 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98]"
              >
                + Register your team
              </button>
            ) : (
              <p className="rounded-2xl bg-black/20 p-4 text-center text-sm text-zinc-400 ring-1 ring-white/10">
                Registration is not open.
              </p>
            )
          )}

          <div>
            <h4 className="mb-2 text-sm font-extrabold text-zinc-100">
              Registered teams ({detail.teams.length})
            </h4>
            <TeamsList teams={detail.teams} />
          </div>
        </div>
      )}

      {/* Groups / knockout stages */}
      {stage !== "registration" && (
        <div>
          <div className="mb-4 inline-flex rounded-2xl bg-black/30 p-1 ring-1 ring-white/10">
            {availableTabs.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubTab(id)}
                aria-current={activeTab === id ? "page" : undefined}
                className={`rounded-xl px-4 py-1.5 text-sm font-bold capitalize transition ${
                  activeTab === id
                    ? "bg-white/10 text-zinc-100 ring-1 ring-white/15"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {id}
              </button>
            ))}
          </div>

          {activeTab === "bracket" && <BracketView teams={detail.teams} matches={detail.matches} />}
          {activeTab === "groups" && <GroupsView teams={detail.teams} matches={detail.matches} />}
          {activeTab === "teams" && <TeamsList teams={detail.teams} />}
        </div>
      )}

      <WbRegisterDialog
        isOpen={dialogOpen}
        tournament={tournament}
        initialTeam={editTeam}
        busy={busy}
        error={error}
        onSubmit={submitTeam}
        onCancel={() => {
          setDialogOpen(false);
          setEditTeam(null);
          setError(null);
        }}
      />

      <ConfirmActionDialog
        isOpen={confirmWithdraw}
        title="Cancel team"
        description="Remove your team from this tournament? You can register again while sign-ups are open."
        confirmLabel="Cancel team"
        tone="danger"
        busy={busy}
        onConfirm={withdraw}
        onCancel={() => setConfirmWithdraw(false)}
      />
    </div>
  );
}
