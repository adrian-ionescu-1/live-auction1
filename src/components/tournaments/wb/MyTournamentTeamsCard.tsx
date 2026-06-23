// The teams the signed-in member captains, shown on their Profile. Each team can
// be edited or cancelled under the SAME conditions as the Events/Tournaments card
// — only while the tournament's sign-up window is open. Once it closes the team
// is locked in (groups/bracket follow).

"use client";

import { useCallback, useEffect, useState } from "react";
import { TournamentsService, WbMemberInput } from "@/services/tournamentsService";
import { MyTournamentTeam, Tournament, TournamentTeam } from "@/types/tournament.types";
import { teamFormat } from "@/lib/teamFormats";
import { WbTeamName } from "@/components/tournaments/wb/TeamsList";
import WbRegisterDialog from "@/components/tournaments/wb/WbRegisterDialog";
import ConfirmActionDialog from "@/components/admin/ConfirmActionDialog";

function isRegOpen(t: Tournament): boolean {
  if ((t.stage ?? "registration") !== "registration") return false;
  const now = Date.now();
  if (t.registrationOpensAt && now < new Date(t.registrationOpensAt).getTime()) return false;
  if (t.registrationClosesAt && now > new Date(t.registrationClosesAt).getTime()) return false;
  return true;
}

function statusBadge(t: Tournament): { label: string; cls: string } {
  const stage = t.stage ?? "registration";
  if (stage !== "registration") {
    const map: Record<string, { label: string; cls: string }> = {
      groups: { label: "Groups", cls: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/25" },
      knockout: { label: "Knockout", cls: "bg-violet-500/15 text-violet-200 ring-violet-400/25" },
      done: { label: "Finished", cls: "bg-zinc-500/15 text-zinc-300 ring-white/10" },
    };
    return map[stage] ?? map.done;
  }
  return isRegOpen(t)
    ? { label: "Sign-ups open", cls: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25" }
    : { label: "Sign-ups closed", cls: "bg-amber-500/15 text-amber-200 ring-amber-400/25" };
}

function TeamRow({
  team,
  tournament,
  onChanged,
}: {
  team: TournamentTeam;
  tournament: Tournament;
  onChanged: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const regOpen = isRegOpen(tournament);
  const badge = statusBadge(tournament);
  const fmt = teamFormat(tournament.teamFormat);

  const save = async (result: { name: string; symbol: string | null; members: WbMemberInput[] }) => {
    setBusy(true);
    setError(null);
    const res = await TournamentsService.updateOwnTeam(
      team.id,
      result.name,
      result.symbol,
      result.members
    );
    setBusy(false);
    if (res.success) {
      setEditOpen(false);
      onChanged();
    } else setError(res.error ?? "Could not save your team");
  };

  const cancel = async () => {
    setBusy(true);
    await TournamentsService.withdrawOwnTeam(team.id);
    setBusy(false);
    setConfirmCancel(false);
    onChanged();
  };

  return (
    <li className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
          {tournament.name}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <WbTeamName team={team} />
        {fmt && (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 ring-1 ring-white/10">
            {fmt.label}
          </span>
        )}
      </div>

      {team.members.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {team.members.map((m) => (
            <li
              key={m.id}
              className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-zinc-300 ring-1 ring-white/10"
            >
              {m.isReserve && <span className="text-zinc-500">[R] </span>}
              {m.playerName}
            </li>
          ))}
        </ul>
      )}

      {/* Edit / cancel only while sign-ups are open — same rule as the Events card. */}
      {regOpen ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditOpen(true);
            }}
            className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-zinc-100 ring-1 ring-white/15 transition hover:bg-white/20"
          >
            Edit team
          </button>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="rounded-xl bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/25"
          >
            Cancel team
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-zinc-500">Sign-ups are closed — your team is locked in.</p>
      )}

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
        isOpen={confirmCancel}
        title="Cancel team"
        description="Remove your team from this tournament? You can register again while sign-ups are open."
        confirmLabel="Cancel team"
        tone="danger"
        busy={busy}
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </li>
  );
}

export default function MyTournamentTeamsCard({ profileId }: { profileId: string }) {
  const [teams, setTeams] = useState<MyTournamentTeam[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    TournamentsService.listMyTeams(profileId).then((rows) => {
      setTeams(rows);
      setLoading(false);
    });
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || teams.length === 0) return null;

  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">My tournament teams</div>
      <ul className="mt-4 space-y-3">
        {teams.map((t) => (
          <TeamRow key={t.team.id} team={t.team} tournament={t.tournament} onChanged={load} />
        ))}
      </ul>
    </div>
  );
}
