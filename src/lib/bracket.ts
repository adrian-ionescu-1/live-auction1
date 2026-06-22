// Helpers to render a single-elimination bracket from the flat list of knockout
// matches. Matches carry bracket_round (1 = first round) and bracket_position.

import { TournamentMatch } from "@/types/tournament.types";

export interface BracketRound {
  round: number;
  /** Human label: Final, Semifinals, Quarterfinals, else "Round of N". */
  label: string;
  matches: TournamentMatch[];
}

/** Name a knockout round from how many matches it contains. */
export function roundLabel(matchesInRound: number): string {
  if (matchesInRound === 1) return "Final";
  if (matchesInRound === 2) return "Semifinals";
  if (matchesInRound === 4) return "Quarterfinals";
  return `Round of ${matchesInRound * 2}`;
}

/** Group knockout matches into ordered rounds (round 1 first). */
export function buildBracket(matches: TournamentMatch[]): BracketRound[] {
  const knockout = matches.filter((m) => m.stage === "knockout");
  const byRound = new Map<number, TournamentMatch[]>();
  for (const m of knockout) {
    const r = m.bracketRound ?? 1;
    const list = byRound.get(r) ?? [];
    list.push(m);
    byRound.set(r, list);
  }
  return Array.from(byRound.keys())
    .sort((a, b) => a - b)
    .map((round) => {
      const list = byRound
        .get(round)!
        .slice()
        .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
      return { round, label: roundLabel(list.length), matches: list };
    });
}

/** Distinct group labels present on the matches/teams, sorted A→Z. */
export function groupLabels(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}
