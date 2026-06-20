// Fallback auction rules. The real numbers now come from the live event
// (auction_events.player_limit / reserve_per_player), surfaced through the
// auction store as `liveEvent`. These defaults only apply if no event is bound
// yet (e.g. a fresh database before the first event is created).

export const DEFAULT_TARGET_PLAYERS = 10;

export const DEFAULT_RESERVE_PER_PLAYER = 110;

/**
 * Reserve to keep for the given number of unfilled slots. Pass the live event's
 * reservePerPlayer; falls back to the default when no event is bound.
 */
export function calcReserve(
  remainingSlots: number,
  reservePerPlayer: number = DEFAULT_RESERVE_PER_PLAYER
): number {
  return Math.max(0, remainingSlots) * reservePerPlayer;
}
