// A small palette of emoji symbols a captain can pick for their team. Shown in
// front of the team name everywhere the team appears. Stored as the emoji itself.

export const TEAM_SYMBOLS: string[] = [
  "⚔️", "🛡️", "🐉", "🦅", "🔥", "⚡", "🌟", "💀", "👑", "🐺",
  "🦁", "🐯", "🦈", "🐻", "🦂", "🐍", "🦾", "💣", "🚀", "❄️",
  "☠️", "🎯", "🏆", "🥷", "👽", "🤖", "🐝", "🦇", "🐙", "🌪️",
];

export function isKnownSymbol(s: string | null | undefined): boolean {
  return !!s && TEAM_SYMBOLS.includes(s);
}
