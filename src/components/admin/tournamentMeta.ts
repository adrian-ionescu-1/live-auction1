// Shared metadata for tournaments: the lifecycle phase used by the 3-tab board
// (mirrors communityEventMeta.eventPhase) and a few small display helpers.

import { Tournament, TournamentPhase } from "@/types/tournament.types";

/**
 * Lifecycle phase of a tournament for the 3-tab board:
 *   * upcoming — not opened yet (draft) or scheduled to start in the future.
 *   * current  — published and started (or has no start date set).
 *   * past     — finished (moved to history).
 */
export function tournamentPhase(t: Tournament, now: number = Date.now()): TournamentPhase {
  if (t.status === "finished") return "past";
  if (t.status === "draft") return "upcoming";
  const starts = t.startsAt ? new Date(t.startsAt).getTime() : null;
  if (starts !== null && now < starts) return "upcoming";
  return "current";
}

/** Score the order in which tournaments should appear: newest activity first. */
export function tournamentSortKey(t: Tournament): number {
  const ref = t.finishedAt ?? t.startsAt ?? t.createdAt;
  return new Date(ref).getTime();
}
