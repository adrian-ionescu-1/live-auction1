// Compute a FIFA-style standings table from played matches. Pure + stateless so
// both the admin editor and the user view derive the same table from the same
// data. Points: win = 3, draw = 1, loss = 0. Ranking: PTS, then goal/score
// difference, then scored-for, then name (stable, deterministic).

import { Standing, TournamentMatch, TournamentTeam } from "@/types/tournament.types";

export function computeStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[]
): Standing[] {
  const rows = new Map<string, Standing>();
  for (const team of teams) {
    rows.set(team.id, {
      teamId: team.id,
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scoredFor: 0,
      scoredAgainst: 0,
      scoreDiff: 0,
      points: 0,
      rank: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== "played" || m.homeScore == null || m.awayScore == null) continue;
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.scoredFor += m.homeScore;
    home.scoredAgainst += m.awayScore;
    away.scoredFor += m.awayScore;
    away.scoredAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const list = Array.from(rows.values());
  for (const row of list) row.scoreDiff = row.scoredFor - row.scoredAgainst;

  list.sort(
    (a, b) =>
      b.points - a.points ||
      b.scoreDiff - a.scoreDiff ||
      b.scoredFor - a.scoredFor ||
      a.team.name.localeCompare(b.team.name)
  );

  list.forEach((row, i) => {
    row.rank = i + 1;
  });
  return list;
}

/** Medal/trophy emoji for the top three ranks; empty otherwise. */
export function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}
