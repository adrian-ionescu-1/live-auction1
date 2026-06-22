// Single-elimination bracket: one column per round (Round of N → Final),
// horizontally scrollable on small screens. Read-only for users; `editable` lets
// the admin score matches (the winner auto-advances to the next column).

"use client";

import { useMemo } from "react";
import { TournamentMatch, TournamentTeam } from "@/types/tournament.types";
import { buildBracket } from "@/lib/bracket";
import WbMatchCard from "@/components/tournaments/wb/WbMatchCard";

export default function BracketView({
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
  const rounds = useMemo(() => buildBracket(matches), [matches]);

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl bg-black/20 p-6 text-center text-sm text-zinc-400 ring-1 ring-white/10">
        The bracket has not been generated yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
      <div className="flex min-w-max gap-4">
        {rounds.map((r) => (
          <div key={r.round} className="flex w-64 shrink-0 flex-col">
            <div className="mb-2 text-xs font-extrabold uppercase tracking-wide text-zinc-400">
              {r.label}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {r.matches.map((m: TournamentMatch) => (
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
        ))}
      </div>
    </div>
  );
}
