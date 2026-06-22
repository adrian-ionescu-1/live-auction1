import { supabase } from "@/lib/supabase";
import { ADMIN_KEY_STORAGE } from "@/services/authService";
import {
  Tournament,
  TournamentMatch,
  TournamentRound,
  TournamentStatus,
  TournamentTeam,
  TournamentTeamMember,
  TournamentTeamPlayer,
} from "@/types/tournament.types";

// The access-key admin's key (Discord admins are authorized by their JWT and get
// null here). Sent to the guarded RPCs as p_admin_key. Mirrors the other services.
function adminKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

type RpcResult = { success: boolean; error: string | null };

function unwrap(data: unknown, error: { message: string } | null): RpcResult {
  if (error) return { success: false, error: error.message };
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    return { success: d.success === true, error: (d.error as string) ?? null };
  }
  return { success: true, error: null };
}

function mapTournament(row: Record<string, unknown>): Tournament {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "Untitled",
    format: (row.format as string) ?? "fifa_blitz",
    sourceEventId: (row.source_event_id as string) ?? null,
    status: (row.status as TournamentStatus) ?? "draft",
    startsAt: (row.starts_at as string) ?? null,
    championTeamId: (row.champion_team_id as string) ?? null,
    runnerUpTeamId: (row.runner_up_team_id as string) ?? null,
    thirdTeamId: (row.third_team_id as string) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    finishedAt: (row.finished_at as string) ?? null,
    teamFormat: (row.team_format as string) ?? null,
    region: (row.region as string) ?? null,
    description: (row.description as string) ?? null,
    registrationOpensAt: (row.registration_opens_at as string) ?? null,
    registrationClosesAt: (row.registration_closes_at as string) ?? null,
    stage: (row.stage as Tournament["stage"]) ?? null,
    groupCount: row.group_count != null ? Number(row.group_count) : null,
    advancePerGroup: row.advance_per_group != null ? Number(row.advance_per_group) : null,
  };
}

function mapTeamMember(row: Record<string, unknown>): TournamentTeamMember {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    slot: Number(row.slot) || 0,
    isReserve: !!row.is_reserve,
    playerName: (row.player_name as string) ?? "Player",
    accountId: row.account_id != null ? Number(row.account_id) : null,
    region: (row.region as string) ?? null,
    winrate: row.winrate != null ? Number(row.winrate) : null,
    battles: row.battles != null ? Number(row.battles) : null,
    avgDamage: row.avg_damage != null ? Number(row.avg_damage) : null,
  };
}

function mapTeamPlayer(row: Record<string, unknown>): TournamentTeamPlayer {
  return {
    id: row.id as string,
    teamId: row.team_id as string,
    playerName: (row.player_name as string) ?? "Player",
    amount: Number(row.amount) || 0,
  };
}

function mapTeam(row: Record<string, unknown>): TournamentTeam {
  const playersRaw = Array.isArray(row.tournament_team_players)
    ? (row.tournament_team_players as Record<string, unknown>[])
    : [];
  const membersRaw = Array.isArray(row.tournament_team_members)
    ? (row.tournament_team_members as Record<string, unknown>[])
    : [];
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    sourceUserId: (row.source_user_id as string) ?? null,
    profileId: (row.profile_id as string) ?? null,
    name: (row.name as string) ?? "Team",
    country: (row.country as string) ?? null,
    eliminated: !!row.eliminated,
    seed: row.seed != null ? Number(row.seed) : null,
    players: playersRaw
      .map(mapTeamPlayer)
      .sort((a, b) => b.amount - a.amount || a.playerName.localeCompare(b.playerName)),
    symbol: (row.symbol as string) ?? null,
    captainProfileId: (row.captain_profile_id as string) ?? null,
    locked: !!row.locked,
    groupLabel: (row.group_label as string) ?? null,
    strength: row.strength != null ? Number(row.strength) : null,
    members: membersRaw
      .map(mapTeamMember)
      .sort((a, b) => Number(a.isReserve) - Number(b.isReserve) || a.slot - b.slot),
  };
}

function mapRound(row: Record<string, unknown>): TournamentRound {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    name: (row.name as string) ?? "Round",
    roundOrder: Number(row.round_order) || 1,
    scheduledAt: (row.scheduled_at as string) ?? null,
  };
}

function mapMatch(row: Record<string, unknown>): TournamentMatch {
  return {
    id: row.id as string,
    tournamentId: row.tournament_id as string,
    roundId: (row.round_id as string) ?? null,
    homeTeamId: (row.home_team_id as string) ?? null,
    awayTeamId: (row.away_team_id as string) ?? null,
    scheduledAt: (row.scheduled_at as string) ?? null,
    homeScore: row.home_score != null ? Number(row.home_score) : null,
    awayScore: row.away_score != null ? Number(row.away_score) : null,
    status: row.status === "played" ? "played" : "scheduled",
    topDamagePlayer: (row.top_damage_player as string) ?? null,
    topDamageTeamId: (row.top_damage_team_id as string) ?? null,
    topKillPlayer: (row.top_kill_player as string) ?? null,
    topKillTeamId: (row.top_kill_team_id as string) ?? null,
    stage: (row.stage as string) ?? null,
    groupLabel: (row.group_label as string) ?? null,
    bracketRound: row.bracket_round != null ? Number(row.bracket_round) : null,
    bracketPosition: row.bracket_position != null ? Number(row.bracket_position) : null,
    nextMatchId: (row.next_match_id as string) ?? null,
    nextSlot: (row.next_slot as string) ?? null,
    winnerTeamId: (row.winner_team_id as string) ?? null,
  };
}

/** Everything needed to render one tournament (teams + rounds + matches). */
export interface TournamentDetail {
  teams: TournamentTeam[];
  rounds: TournamentRound[];
  matches: TournamentMatch[];
}

// Reads use the open select policies; admin writes go through guarded RPCs.
export class TournamentsService {
  /** All tournaments, newest first (admin views). */
  static async listTournaments(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading tournaments:", error);
      return [];
    }
    return (data ?? []).map((r) => mapTournament(r as Record<string, unknown>));
  }

  /** Tournaments users may see: published + finished only. */
  static async listVisibleTournaments(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .in("status", ["published", "finished"])
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading tournaments:", error);
      return [];
    }
    return (data ?? []).map((r) => mapTournament(r as Record<string, unknown>));
  }

  /** Load a tournament's teams (with rosters), rounds and matches. */
  static async loadDetail(tournamentId: string): Promise<TournamentDetail> {
    const [teamsRes, roundsRes, matchesRes] = await Promise.all([
      supabase
        .from("tournament_teams")
        .select("*, tournament_team_players(*), tournament_team_members(*)")
        .eq("tournament_id", tournamentId)
        .order("seed", { ascending: true }),
      supabase
        .from("tournament_rounds")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round_order", { ascending: true }),
      supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: true }),
    ]);

    if (teamsRes.error) console.error("Error loading teams:", teamsRes.error);
    if (roundsRes.error) console.error("Error loading rounds:", roundsRes.error);
    if (matchesRes.error) console.error("Error loading matches:", matchesRes.error);

    return {
      teams: (teamsRes.data ?? []).map((r) => mapTeam(r as Record<string, unknown>)),
      rounds: (roundsRes.data ?? []).map((r) => mapRound(r as Record<string, unknown>)),
      matches: (matchesRes.data ?? []).map((r) => mapMatch(r as Record<string, unknown>)),
    };
  }

  // ── Tournament lifecycle ───────────────────────────────────────────────────

  static async createTournament(
    name: string,
    sourceEventId: string | null
  ): Promise<{ success: boolean; tournamentId: string | null; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_create_tournament", {
      p_name: name,
      p_source_event_id: sourceEventId,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, tournamentId: null, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      tournamentId: (d.tournament_id as string) ?? null,
      error: (d.error as string) ?? null,
    };
  }

  static async updateTournament(
    tournamentId: string,
    name: string,
    startsAt: string | null
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_update_tournament", {
      p_tournament_id: tournamentId,
      p_name: name,
      p_starts_at: startsAt,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async publishTournament(tournamentId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_publish_tournament", {
      p_tournament_id: tournamentId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async finishTournament(tournamentId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_finish_tournament", {
      p_tournament_id: tournamentId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async setPodium(
    tournamentId: string,
    championTeamId: string | null,
    runnerUpTeamId: string | null,
    thirdTeamId: string | null
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_set_tournament_podium", {
      p_tournament_id: tournamentId,
      p_champion_team_id: championTeamId,
      p_runner_up_team_id: runnerUpTeamId,
      p_third_team_id: thirdTeamId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async deleteTournament(tournamentId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_delete_tournament", {
      p_tournament_id: tournamentId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  // ── Teams ──────────────────────────────────────────────────────────────────

  static async addTeam(
    tournamentId: string,
    name: string,
    country: string | null,
    profileId: string | null = null
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_add_team", {
      p_tournament_id: tournamentId,
      p_name: name,
      p_country: country,
      p_profile_id: profileId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async updateTeam(
    teamId: string,
    name: string,
    country: string | null,
    eliminated: boolean
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_update_team", {
      p_team_id: teamId,
      p_name: name,
      p_country: country,
      p_eliminated: eliminated,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async deleteTeam(teamId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_delete_team", {
      p_team_id: teamId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  // ── Rounds ─────────────────────────────────────────────────────────────────

  static async createRound(
    tournamentId: string,
    name: string,
    scheduledAt: string | null
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_create_round", {
      p_tournament_id: tournamentId,
      p_name: name,
      p_scheduled_at: scheduledAt,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async updateRound(
    roundId: string,
    name: string,
    scheduledAt: string | null
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_update_round", {
      p_round_id: roundId,
      p_name: name,
      p_scheduled_at: scheduledAt,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async deleteRound(roundId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_delete_round", {
      p_round_id: roundId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  // ── Matches ────────────────────────────────────────────────────────────────

  static async createMatch(
    tournamentId: string,
    roundId: string | null,
    homeTeamId: string,
    awayTeamId: string,
    scheduledAt: string | null
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_create_match", {
      p_tournament_id: tournamentId,
      p_round_id: roundId,
      p_home_team_id: homeTeamId,
      p_away_team_id: awayTeamId,
      p_scheduled_at: scheduledAt,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async updateMatch(input: {
    matchId: string;
    scheduledAt: string | null;
    homeScore: number | null;
    awayScore: number | null;
    topDamagePlayer: string | null;
    topDamageTeamId: string | null;
    topKillPlayer: string | null;
    topKillTeamId: string | null;
  }): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_update_match", {
      p_match_id: input.matchId,
      p_scheduled_at: input.scheduledAt,
      p_home_score: input.homeScore,
      p_away_score: input.awayScore,
      p_top_damage_player: input.topDamagePlayer,
      p_top_damage_team_id: input.topDamageTeamId,
      p_top_kill_player: input.topKillPlayer,
      p_top_kill_team_id: input.topKillTeamId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  static async deleteMatch(matchId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_delete_match", {
      p_match_id: matchId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /** Shuffle the active teams into round-1 fixtures (re-runnable). */
  static async mixRound(
    tournamentId: string
  ): Promise<{ success: boolean; matches: number; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_mix_round", {
      p_tournament_id: tournamentId,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, matches: 0, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      matches: Number(d.matches) || 0,
      error: (d.error as string) ?? null,
    };
  }

  /** Set a member's default country tag (from the Members page). */
  static async setMemberCountry(memberId: string, country: string | null): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_set_member_country", {
      p_member_id: memberId,
      p_country: country,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  // ── WoT Blitz tournaments ────────────────────────────────────────────────

  /** Admin: create a registration-based WoT Blitz tournament. */
  static async createWbTournament(input: {
    name: string;
    teamFormat: string;
    region: string | null;
    description: string | null;
    startsAt: string | null;
    registrationOpensAt: string | null;
    registrationClosesAt: string | null;
  }): Promise<{ success: boolean; tournamentId: string | null; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_create_wb_tournament", {
      p_name: input.name,
      p_team_format: input.teamFormat,
      p_region: input.region,
      p_description: input.description,
      p_starts_at: input.startsAt,
      p_registration_opens_at: input.registrationOpensAt,
      p_registration_closes_at: input.registrationClosesAt,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, tournamentId: null, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      tournamentId: (d.tournament_id as string) ?? null,
      error: (d.error as string) ?? null,
    };
  }

  /** Member (captain): register a team with validated players. */
  static async registerTeam(
    tournamentId: string,
    name: string,
    symbol: string | null,
    members: WbMemberInput[]
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("register_wb_team", {
      p_tournament_id: tournamentId,
      p_name: name,
      p_symbol: symbol,
      p_members: members,
    });
    return unwrap(data, error);
  }

  /** Member (captain): edit own team while registration is open. */
  static async updateOwnTeam(
    teamId: string,
    name: string,
    symbol: string | null,
    members: WbMemberInput[]
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("update_wb_team", {
      p_team_id: teamId,
      p_name: name,
      p_symbol: symbol,
      p_members: members,
    });
    return unwrap(data, error);
  }

  /** Member (captain): close the team (no more edits). */
  static async lockOwnTeam(teamId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("lock_wb_team", { p_team_id: teamId });
    return unwrap(data, error);
  }

  /** Member (captain): withdraw the team while registration is open. */
  static async withdrawOwnTeam(teamId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("withdraw_wb_team", { p_team_id: teamId });
    return unwrap(data, error);
  }

  /** Admin: rename / re-symbol a team. */
  static async adminUpdateWbTeam(
    teamId: string,
    name: string,
    symbol: string | null
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_wb_update_team", {
      p_team_id: teamId,
      p_name: name,
      p_symbol: symbol,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /** Admin: draw teams into groups (seeded) + create round-robin matches. */
  static async generateGroups(
    tournamentId: string,
    groupCount: number
  ): Promise<{ success: boolean; groups: number; teams: number; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_wb_generate_groups", {
      p_tournament_id: tournamentId,
      p_group_count: groupCount,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, groups: 0, teams: 0, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      groups: Number(d.groups) || 0,
      teams: Number(d.teams) || 0,
      error: (d.error as string) ?? null,
    };
  }

  /** Admin: build the single-elimination bracket from the group qualifiers. */
  static async generateBracket(
    tournamentId: string,
    advancePerGroup: number
  ): Promise<{ success: boolean; qualified: number; error: string | null }> {
    const { data, error } = await supabase.rpc("admin_wb_generate_bracket", {
      p_tournament_id: tournamentId,
      p_advance_per_group: advancePerGroup,
      p_admin_key: adminKey(),
    });
    if (error) return { success: false, qualified: 0, error: error.message };
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      success: d.success === true,
      qualified: Number(d.qualified) || 0,
      error: (d.error as string) ?? null,
    };
  }

  /** Admin: set a match score (auto-advances the knockout winner). */
  static async setMatchScore(
    matchId: string,
    homeScore: number,
    awayScore: number
  ): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_wb_set_match_score", {
      p_match_id: matchId,
      p_home_score: homeScore,
      p_away_score: awayScore,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /** Admin: delete a WoT Blitz match. */
  static async deleteWbMatch(matchId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_wb_delete_match", {
      p_match_id: matchId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }

  /** Admin: finalize — set the podium from the final and move to history. */
  static async finalizeWb(tournamentId: string): Promise<RpcResult> {
    const { data, error } = await supabase.rpc("admin_wb_finalize", {
      p_tournament_id: tournamentId,
      p_admin_key: adminKey(),
    });
    return unwrap(data, error);
  }
}

/** A team member as sent to the register/update RPCs. */
export interface WbMemberInput {
  slot: number;
  is_reserve: boolean;
  player_name: string;
  account_id: number | null;
  region: string | null;
  winrate: number | null;
  battles: number | null;
  avg_damage: number | null;
}
