import { describe, it, expect } from "vitest";
import { buildBracket, roundLabel, groupLabels } from "./bracket";
import { TournamentMatch } from "@/types/tournament.types";

function ko(id: string, round: number, position: number): TournamentMatch {
  return {
    id,
    tournamentId: "t1",
    roundId: null,
    homeTeamId: null,
    awayTeamId: null,
    scheduledAt: null,
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    topDamagePlayer: null,
    topDamageTeamId: null,
    topKillPlayer: null,
    topKillTeamId: null,
    stage: "knockout",
    groupLabel: null,
    bracketRound: round,
    bracketPosition: position,
    nextMatchId: null,
    nextSlot: null,
    winnerTeamId: null,
  };
}

describe("roundLabel", () => {
  it("names rounds by how many matches they hold", () => {
    expect(roundLabel(1)).toBe("Final");
    expect(roundLabel(2)).toBe("Semifinals");
    expect(roundLabel(4)).toBe("Quarterfinals");
    expect(roundLabel(8)).toBe("Round of 16");
  });
});

describe("buildBracket", () => {
  it("groups knockout matches into ordered rounds, sorted by position", () => {
    const matches = [
      ko("f", 2, 0),
      ko("s2", 1, 1),
      ko("s1", 1, 0),
    ];
    const rounds = buildBracket(matches);
    expect(rounds.map((r) => r.round)).toEqual([1, 2]);
    expect(rounds[0].label).toBe("Semifinals");
    expect(rounds[0].matches.map((m) => m.id)).toEqual(["s1", "s2"]);
    expect(rounds[1].label).toBe("Final");
  });

  it("ignores non-knockout matches", () => {
    const group: TournamentMatch = { ...ko("g", 1, 0), stage: "group" };
    expect(buildBracket([group])).toEqual([]);
  });
});

describe("groupLabels", () => {
  it("returns unique, sorted, non-null labels", () => {
    expect(groupLabels(["B", "A", "B", null, "C", null])).toEqual(["A", "B", "C"]);
    expect(groupLabels([null, null])).toEqual([]);
  });
});
