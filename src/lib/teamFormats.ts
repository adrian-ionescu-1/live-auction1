// WoT Blitz team formats. Each format fixes how many starters a team must field
// and how many reserves it may carry. Drives the registration form (how many
// player validations are required vs optional) and the server-side checks.

export interface TeamFormat {
  id: string;
  label: string;
  /** Required starters (mandatory validations). */
  starters: number;
  /** Optional reserves (extra validations allowed). */
  reserves: number;
}

export const TEAM_FORMATS: TeamFormat[] = [
  { id: "1v1", label: "1 vs 1", starters: 1, reserves: 0 },
  { id: "2v2", label: "2 vs 2", starters: 2, reserves: 0 },
  { id: "3v3+1", label: "3 vs 3 + 1 reserve", starters: 3, reserves: 1 },
  { id: "5v5+1", label: "5 vs 5 + 1 reserve", starters: 5, reserves: 1 },
  { id: "7v7+2", label: "7 vs 7 + 2 reserves", starters: 7, reserves: 2 },
];

export function teamFormat(id: string | null | undefined): TeamFormat | null {
  if (!id) return null;
  return TEAM_FORMATS.find((f) => f.id === id) ?? null;
}
