import { describe, it, expect } from "vitest";
import { computeStandings, rankMedal } from "./standings";
import { TournamentMatch, TournamentTeam } from "@/types/tournament.types";

function team(id: string, name: string, over: Partial<TournamentTeam> = {}): TournamentTeam {
  return {
    id,
    tournamentId: "t1",
    sourceUserId: null,
    profileId: null,
    name,
    country: null,
    eliminated: false,
    seed: null,
    players: [],
    symbol: null,
    captainProfileId: null,
    locked: false,
    groupLabel: null,
    strength: null,
    members: [],
    ...over,
  };
}

function match(
  id: string,
  home: string,
  away: string,
  hs: number | null,
  as: number | null
): TournamentMatch {
  return {
    id,
    tournamentId: "t1",
    roundId: null,
    homeTeamId: home,
    awayTeamId: away,
    scheduledAt: null,
    homeScore: hs,
    awayScore: as,
    status: hs != null && as != null ? "played" : "scheduled",
    topDamagePlayer: null,
    topDamageTeamId: null,
    topKillPlayer: null,
    topKillTeamId: null,
    stage: "group",
    groupLabel: "A",
    bracketRound: null,
    bracketPosition: null,
    nextMatchId: null,
    nextSlot: null,
    winnerTeamId: null,
  };
}

describe("computeStandings", () => {
  const teams = [team("a", "Alpha"), team("b", "Bravo"), team("c", "Charlie")];
  const matches = [
    match("m1", "a", "b", 3, 1), // A win
    match("m2", "a", "c", 2, 2), // draw
    match("m3", "b", "c", 0, 1), // C win
  ];

  it("computes points (win=3, draw=1) and goal stats", () => {
    const table = computeStandings(teams, matches);
    const byId = Object.fromEntries(table.map((r) => [r.teamId, r]));

    expect(byId.a).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, points: 4, scoreDiff: 2 });
    expect(byId.b).toMatchObject({ played: 2, won: 0, drawn: 0, lost: 2, points: 0, scoreDiff: -3 });
    expect(byId.c).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, points: 4, scoreDiff: 1 });
  });

  it("ranks by points then score difference", () => {
    const table = computeStandings(teams, matches);
    expect(table.map((r) => r.teamId)).toEqual(["a", "c", "b"]);
    expect(table[0].rank).toBe(1);
    expect(table[2].rank).toBe(3);
  });

  it("ignores unplayed matches and unknown teams", () => {
    const table = computeStandings(teams, [
      match("m1", "a", "b", null, null),
      match("m2", "a", "zzz", 5, 0),
    ]);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });
});

describe("rankMedal", () => {
  it("returns medals for the top three only", () => {
    expect(rankMedal(1)).toBe("🥇");
    expect(rankMedal(2)).toBe("🥈");
    expect(rankMedal(3)).toBe("🥉");
    expect(rankMedal(4)).toBe("");
  });
});
