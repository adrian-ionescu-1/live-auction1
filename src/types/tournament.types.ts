// Types for tournaments — the post-auction competition. The first format,
// 'fifa_blitz', turns each auction bidder into a national team (their won squad
// is the roster) that plays matches feeding an auto-computed standings table.
// See supabase/migrations/20260622060000_tournaments.sql.

export type TournamentStatus = "draft" | "published" | "finished";

/** Format slug. 'fifa_blitz' (auction-sourced) or 'wotblitz_bracket' (registration). */
export type TournamentFormat = "fifa_blitz" | "wotblitz_bracket";

/** WoT Blitz lifecycle inside a published tournament. */
export type WbStage = "registration" | "groups" | "knockout" | "done";

/** Where a published tournament sits for users (mirrors community-event phases). */
export type TournamentPhase = "upcoming" | "current" | "past";

export interface Tournament {
  id: string;
  name: string;
  /** Format slug. 'fifa_blitz' or 'wotblitz_bracket'. */
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

  // ── WoT Blitz fields (null for fifa_blitz) ──
  /** Team size format, e.g. '3v3+1'. */
  teamFormat: string | null;
  /** Validation region 'eu'|'na'|'asia', or null for no validation. */
  region: string | null;
  description: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  stage: WbStage | null;
  groupCount: number | null;
  advancePerGroup: number | null;
  /** Roles allowed to see + register for this tournament (lowercased slugs). */
  visibleRoles: string[];
}

/** One player on a team's roster (snapshot of an auction win). */
export interface TournamentTeamPlayer {
  id: string;
  teamId: string;
  playerName: string;
  amount: number;
}

/** A validated WoT Blitz player on a registered team. */
export interface TournamentTeamMember {
  id: string;
  teamId: string;
  slot: number;
  isReserve: boolean;
  playerName: string;
  accountId: number | null;
  region: string | null;
  winrate: number | null;
  battles: number | null;
  avgDamage: number | null;
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

  // ── WoT Blitz fields ──
  /** Emoji/symbol shown before the team name. */
  symbol: string | null;
  /** The member who registered + owns the team. */
  captainProfileId: string | null;
  /** Captain closed the team (no more edits). */
  locked: boolean;
  /** Group assignment ('A', 'B', …) once drawn. */
  groupLabel: string | null;
  /** Average starter win-rate, set at draw time (seeding). */
  strength: number | null;
  /** Validated players (WoT Blitz). Empty when not loaded / not applicable. */
  members: TournamentTeamMember[];
}

/** A team the signed-in member captains, with its full tournament (Profile). */
export interface MyTournamentTeam {
  team: TournamentTeam;
  tournament: Tournament;
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
  /** Nullable: a knockout slot can be "to be decided" until feeders resolve. */
  homeTeamId: string | null;
  awayTeamId: string | null;
  scheduledAt: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: TournamentMatchStatus;
  /** Standout player names; null = "none". The team id ties a tag to a side. */
  topDamagePlayer: string | null;
  topDamageTeamId: string | null;
  topKillPlayer: string | null;
  topKillTeamId: string | null;

  // ── WoT Blitz fields ──
  /** 'group' | 'knockout' for WoT Blitz; null for fifa_blitz. */
  stage: string | null;
  groupLabel: string | null;
  bracketRound: number | null;
  bracketPosition: number | null;
  nextMatchId: string | null;
  nextSlot: string | null;
  winnerTeamId: string | null;
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
