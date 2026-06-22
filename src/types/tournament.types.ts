// Types for tournaments — the post-auction competition. The first format,
// 'fifa_blitz', turns each auction bidder into a national team (their won squad
// is the roster) that plays matches feeding an auto-computed standings table.
// See supabase/migrations/20260622060000_tournaments.sql.

export type TournamentStatus = "draft" | "published" | "finished";

/** Where a published tournament sits for users (mirrors community-event phases). */
export type TournamentPhase = "upcoming" | "current" | "past";

export interface Tournament {
  id: string;
  name: string;
  /** Format slug. Only 'fifa_blitz' for now; kept for future formats. */
  format: string;
  /** The finished auction this tournament was built from, or null. */
  sourceEventId: string | null;
  status: TournamentStatus;
  /** Informational start; drives the upcoming/current split. */
  startsAt: string | null;
  championTeamId: string | null;
  runnerUpTeamId: string | null;
  thirdTeamId: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
}

/** One player on a team's roster (snapshot of an auction win). */
export interface TournamentTeamPlayer {
  id: string;
  teamId: string;
  playerName: string;
  amount: number;
}

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  /** Auction bidder this team came from (null for a manually-added team). */
  sourceUserId: string | null;
  profileId: string | null;
  name: string;
  /** ISO 3166-1 alpha-2 country code (lowercase), or null. */
  country: string | null;
  /** Admin-flagged as out of the competition (still shown in standings). */
  eliminated: boolean;
  seed: number | null;
  /** Roster, joined in for display. Empty when not loaded. */
  players: TournamentTeamPlayer[];
}

export interface TournamentRound {
  id: string;
  tournamentId: string;
  name: string;
  roundOrder: number;
  scheduledAt: string | null;
}

export type TournamentMatchStatus = "scheduled" | "played";

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundId: string | null;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: TournamentMatchStatus;
  /** Standout player names; null = "none". The team id ties a tag to a side. */
  topDamagePlayer: string | null;
  topDamageTeamId: string | null;
  topKillPlayer: string | null;
  topKillTeamId: string | null;
}

/** A computed standings row (not stored — derived from played matches). */
export interface Standing {
  teamId: string;
  team: TournamentTeam;
  /** Played, Won, Drawn, Lost. */
  played: number;
  won: number;
  drawn: number;
  lost: number;
  /** Score For / Against / Difference. */
  scoredFor: number;
  scoredAgainst: number;
  scoreDiff: number;
  points: number;
  /** 1-based rank after sorting. */
  rank: number;
}
