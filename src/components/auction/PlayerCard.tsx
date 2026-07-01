'use client';

// Thin dispatcher over the card design system: it normalizes a Player (+ an
// optional starting bid / variant / flag override) and renders the chosen design
// from cardDesigns. The 10 designs live in cardDesigns.tsx; this file just maps
// the auction's Player shape onto their shared props.

import { Player } from '@/types/auction.types';
import CardArt from './cardDesigns';

interface PlayerCardProps {
  player: Player;
  /** The opening bid to show (the live event's chosen starting bid). */
  startingBid?: number;
  /** Override the card design; falls back to the player's stored variant. */
  variant?: string | null;
  /** Override the flag (ISO code); falls back to the player's stored flag. */
  flag?: string | null;
}

export default function PlayerCard({ player, startingBid, variant, flag }: PlayerCardProps) {
  const opening = startingBid ?? player.basePrice;
  // A list-imported / unvalidated participant may have no real stats; in that
  // case the design hides the stat grid instead of showing zeros.
  const hasStats =
    (player.battles ?? 0) > 0 ||
    (player.winrate ?? 0) > 0 ||
    (player.avg_damage ?? 0) > 0;

  return (
    <CardArt
      variant={variant ?? player.variant ?? null}
      name={player.name}
      flag={flag ?? player.flag ?? null}
      winrate={hasStats ? player.winrate : null}
      battles={hasStats ? player.battles : null}
      avgDamage={hasStats ? player.avg_damage : null}
      startingBid={opening ?? null}
      hasStats={hasStats}
      customFields={player.customFields ?? []}
    />
  );
}
