// Group stage: per-group standings table + the group's matches. Read-only for
// users; `editable` lets the admin enter scores (recomputing the standings).

"use client";

import { useMemo } from "react";
import { TournamentMatch, TournamentTeam } from "@/types/tournament.types";
import { computeStandings } from "@/lib/standings";
import { groupLabels } from "@/lib/bracket";
import StandingsTable from "@/components/tournaments/StandingsTable";
import WbMatchCard from "@/components/tournaments/wb/WbMatchCard";

export default function GroupsView({
  teams,
  matches,
  editable = false,
  onSave,
}: {
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  editable?: boolean;
  onSave?: (matchId: string, homeScore: number, awayScore: number) => Promise<void> | void;
}) {
  const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const groupMatches = useMemo(() => matches.filter((m) => m.stage === "group"), [matches]);
  const labels = useMemo(
    () => groupLabels(teams.map((t) => t.groupLabel)),
    [teams]
  );

  if (labels.length === 0) {
    return (
      <div className="rounded-2xl bg-black/20 p-6 text-center text-sm text-zinc-400 ring-1 ring-white/10">
        Groups have not been drawn yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {labels.map((label) => {
        const gTeams = teams.filter((t) => t.groupLabel === label);
        const gMatches = groupMatches.filter((m) => m.groupLabel === label);
        const standings = computeStandings(gTeams, gMatches);
        return (
          <div key={label}>
            <h4 className="mb-2 text-sm font-extrabold text-zinc-100">Group {label}</h4>
            <StandingsTable standings={standings} />
            <div className="mt-3 space-y-2">
              {gMatches.map((m) => (
                <WbMatchCard
                  key={m.id}
                  match={m}
                  teamsById={teamsById}
                  editable={editable}
                  onSave={onSave}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
