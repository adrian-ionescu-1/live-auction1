// The FIFA-style standings table + (when the tournament is finished and a podium
// is set) a trophy card above it. Read-only and shared by the user view and the
// admin manager. Columns: P W D L SF SA SD PTS. Mobile-first: the table scrolls
// horizontally on narrow screens; the top rows are tinted gold/silver/bronze.

"use client";

import { Standing, TournamentTeam } from "@/types/tournament.types";
import { rankMedal } from "@/lib/standings";
import TeamLabel from "@/components/tournaments/TeamLabel";

const COLS: { key: keyof Standing; label: string; title: string }[] = [
  { key: "played", label: "P", title: "Played" },
  { key: "won", label: "W", title: "Won" },
  { key: "drawn", label: "D", title: "Drawn" },
  { key: "lost", label: "L", title: "Lost" },
  { key: "scoredFor", label: "SF", title: "Score for" },
  { key: "scoredAgainst", label: "SA", title: "Score against" },
  { key: "scoreDiff", label: "SD", title: "Score difference" },
  { key: "points", label: "PTS", title: "Points" },
];

function rankTint(rank: number): string {
  if (rank === 1) return "bg-amber-400/10";
  if (rank === 2) return "bg-zinc-300/10";
  if (rank === 3) return "bg-orange-400/10";
  return "";
}

function PodiumCard({
  champion,
  runnerUp,
  third,
}: {
  champion: TournamentTeam | null;
  runnerUp: TournamentTeam | null;
  third: TournamentTeam | null;
}) {
  const steps: { team: TournamentTeam | null; medal: string; label: string; ring: string }[] = [
    { team: champion, medal: "🥇", label: "Champion", ring: "ring-amber-400/40 bg-amber-400/10" },
    { team: runnerUp, medal: "🥈", label: "Runner-up", ring: "ring-zinc-300/30 bg-zinc-300/10" },
    { team: third, medal: "🥉", label: "Third", ring: "ring-orange-400/30 bg-orange-400/10" },
  ].filter((s) => s.team);

  if (steps.length === 0) return null;

  return (
    <div className="mb-4 rounded-3xl bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent p-5 ring-1 ring-amber-400/20">
      <div className="flex items-center gap-2 text-sm font-extrabold text-amber-100">
        <span aria-hidden>🏆</span> Final podium
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.label}
            className={`flex items-center gap-2.5 rounded-2xl p-3 ring-1 ${s.ring}`}
          >
            <span aria-hidden className="text-2xl">
              {s.medal}
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-zinc-400">{s.label}</div>
              <TeamLabel team={s.team!} flagClassName="h-4 w-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StandingsTable({
  standings,
  podium,
}: {
  standings: Standing[];
  podium?: {
    champion: TournamentTeam | null;
    runnerUp: TournamentTeam | null;
    third: TournamentTeam | null;
  };
}) {
  if (standings.length === 0) {
    return (
      <div className="rounded-2xl bg-black/20 p-6 text-center text-sm text-zinc-400 ring-1 ring-white/10">
        No teams yet.
      </div>
    );
  }

  return (
    <div>
      {podium && (
        <PodiumCard champion={podium.champion} runnerUp={podium.runnerUp} third={podium.third} />
      )}

      <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10 [scrollbar-width:thin]">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="bg-white/5 text-zinc-400">
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">
                #
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">
                Team
              </th>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  title={c.title}
                  className="px-2.5 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => (
              <tr
                key={row.teamId}
                className={`border-t border-white/5 ${rankTint(row.rank)}`}
              >
                <td className="whitespace-nowrap px-3 py-2.5 text-left font-bold tabular-nums text-zinc-300">
                  <span className="inline-flex items-center gap-1">
                    {rankMedal(row.rank) || row.rank}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <TeamLabel team={row.team} muted />
                </td>
                {COLS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-2.5 py-2.5 text-center tabular-nums ${
                      c.key === "points"
                        ? "font-extrabold text-emerald-200"
                        : "text-zinc-300"
                    }`}
                  >
                    {c.key === "scoreDiff" && row.scoreDiff > 0 ? "+" : ""}
                    {row[c.key] as number}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
