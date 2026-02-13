export const TARGET_PLAYERS = 10;

export const MIN_PLAYER_COST = 110;

export function calcReserve(remainingSlots: number) {
  return Math.max(0, remainingSlots) * MIN_PLAYER_COST;
}
