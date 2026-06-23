import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StandingsTable from "./StandingsTable";
import { Standing, TournamentTeam } from "@/types/tournament.types";

function team(id: string, name: string): TournamentTeam {
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
  };
}

function standing(id: string, name: string, rank: number, points: number): Standing {
  return {
    teamId: id,
    team: team(id, name),
    played: 2,
    won: 1,
    drawn: 0,
    lost: 1,
    scoredFor: 3,
    scoredAgainst: 2,
    scoreDiff: 1,
    points,
    rank,
  };
}

describe("StandingsTable", () => {
  it("renders a row per team with the points", () => {
    render(<StandingsTable standings={[standing("a", "Alpha", 1, 6), standing("b", "Bravo", 2, 3)]} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Bravo")).toBeInTheDocument();
    expect(screen.getByText("🥇")).toBeInTheDocument();
  });

  it("shows an empty state with no teams", () => {
    render(<StandingsTable standings={[]} />);
    expect(screen.getByText(/no teams yet/i)).toBeInTheDocument();
  });

  it("renders a podium card when champion is provided", () => {
    render(
      <StandingsTable
        standings={[standing("a", "Alpha", 1, 6)]}
        podium={{ champion: team("a", "Alpha"), runnerUp: null, third: null }}
      />
    );
    expect(screen.getByText(/final podium/i)).toBeInTheDocument();
    expect(screen.getByText("Champion")).toBeInTheDocument();
  });
});
