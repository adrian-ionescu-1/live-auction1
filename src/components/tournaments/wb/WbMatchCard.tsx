// One WoT Blitz match (group or knockout). Read-only by default; when `editable`
// the admin can enter the score inline (which, for knockout, auto-advances the
// winner server-side). A TBD slot is shown for undecided bracket feeders.

"use client";

import { useState } from "react";
import { TournamentMatch, TournamentTeam } from "@/types/tournament.types";
import { WbTeamName } from "@/components/tournaments/wb/TeamsList";

function Side({
  team,
  isWinner,
  align,
}: {
  team: TournamentTeam | undefined;
  isWinner: boolean;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {team ? (
        <span className={isWinner ? "" : "opacity-80"}>
          <WbTeamName team={team} />
        </span>
      ) : (
        <span className="text-xs italic text-zinc-500">TBD</span>
      )}
    </div>
  );
}

export default function WbMatchCard({
  match,
  teamsById,
  editable = false,
  onSave,
}: {
  match: TournamentMatch;
  teamsById: Map<string, TournamentTeam>;
  editable?: boolean;
  onSave?: (matchId: string, homeScore: number, awayScore: number) => Promise<void> | void;
}) {
  const home = match.homeTeamId ? teamsById.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? teamsById.get(match.awayTeamId) : undefined;
  const played = match.status === "played" && match.homeScore != null && match.awayScore != null;
  const bye = match.status === "played" && (match.homeTeamId == null || match.awayTeamId == null);

  const [editing, setEditing] = useState(false);
  const [h, setH] = useState(match.homeScore != null ? String(match.homeScore) : "");
  const [a, setA] = useState(match.awayScore != null ? String(match.awayScore) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canScore = editable && match.homeTeamId != null && match.awayTeamId != null;

  const save = async () => {
    if (!onSave) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(match.id, h === "" ? 0 : Number(h), a === "" ? 0 : Number(a));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const homeWin = played && match.winnerTeamId === match.homeTeamId;
  const awayWin = played && match.winnerTeamId === match.awayTeamId;

  return (
    <div className="rounded-2xl bg-black/25 p-2.5 ring-1 ring-white/10">
      <div className="flex items-center gap-2">
        <Side team={home} isWinner={homeWin} align="right" />
        <div className="shrink-0 px-1 text-center">
          {bye ? (
            <span className="text-[10px] font-bold uppercase text-zinc-500">bye</span>
          ) : played ? (
            <span className="rounded-lg bg-black/50 px-2 py-0.5 text-sm font-extrabold tabular-nums text-zinc-100 ring-1 ring-white/10">
              {match.homeScore}<span className="text-zinc-500">:</span>{match.awayScore}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase text-zinc-500">vs</span>
          )}
        </div>
        <Side team={away} isWinner={awayWin} align="left" />
        {canScore && (
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            {editing ? "Close" : played ? "Edit" : "Score"}
          </button>
        )}
      </div>

      {editing && canScore && (
        <div className="mt-2 flex items-center gap-2 border-t border-white/10 pt-2">
          <input
            type="number"
            inputMode="numeric"
            value={h}
            onChange={(e) => setH(e.target.value)}
            aria-label="Home score"
            className="w-14 rounded-lg bg-black/40 px-2 py-1.5 text-center text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
          <span className="text-zinc-500">:</span>
          <input
            type="number"
            inputMode="numeric"
            value={a}
            onChange={(e) => setA(e.target.value)}
            aria-label="Away score"
            className="w-14 rounded-lg bg-black/40 px-2 py-1.5 text-center text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          />
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="ml-auto rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
