// Types for real accounts created via Discord sign-in. Kept separate from
// auction.types.ts (key-based auction participants) because this is a distinct
// domain: persistent accounts with an admin-assigned role.

import { BlitzRegion } from "@/types/community-event.types";
import { BlitzAccountDetails } from "@/types/blitz.types";

/** A member's self-linked WoT Blitz in-game account (with cached career stats). */
export interface BlitzLink {
  region: BlitzRegion;
  accountId: number;
  nickname: string;
  /** Career profile captured at link time; null if it couldn't be cached. */
  details: BlitzAccountDetails | null;
}

export interface Profile {
  id: string;
  discordId: string | null;
  username: string;
  avatarUrl: string | null;
  /**
   * The member's "primary" role (derived from {@link roles} by precedence). Kept
   * for displays and legacy single-role checks. Prefer `roles` for capability
   * checks, since a member can hold several at once.
   */
  role: string;
  /** The full set of roles the member holds (lowercased). */
  roles: string[];
  createdAt: string;
  /** When the member consented to WoT Blitz, or null if they haven't. */
  wotblitzConsentedAt: string | null;
  /** The member's linked WoT Blitz account, or null if none linked yet. */
  blitz: BlitzLink | null;
}

/** The default role every Discord account receives until they consent / an admin changes it. */
export const DEFAULT_ACCOUNT_ROLE = "guest";

/** The role a guest gets after consenting to WoT Blitz. */
export const WOTBLITZ_ROLE = "wotblitz";

/** The role an admin grants to let a member bid in auctions. */
export const BIDDER_ROLE = "bidder";

/**
 * The role an admin grants to a member who broadcasts the live auction on
 * YouTube / Twitch / TikTok. A streamer joins the auction room as a watch-only
 * viewer (they see the live player, timer, price and bids, but never bid).
 * Replaces the old key-based "spectator" concept.
 */
export const STREAMER_ROLE = "streamer";

/**
 * A member an admin has barred from the site (broke the rules / terms). They can
 * still sign in, but their dashboard is replaced by a full-screen exclusion
 * notice and they can't bid or reach any admin area.
 */
export const EXCLUDED_ROLE = "excluded";

/** A community member (Discord account) as seen in the admin directory. */
export interface Member {
  id: string;
  /** The name shown everywhere: the admin override if set, else the original. */
  username: string;
  /** The name the member registered with on Discord (never changes). */
  originalUsername: string;
  /** Admin-set display name override, or null when none is set. */
  displayName: string | null;
  avatarUrl: string | null;
  /** The member's primary role (derived from {@link roles}). */
  role: string;
  /** The full set of roles the member holds (lowercased). */
  roles: string[];
  banned: boolean;
  /** Default national tag (ISO alpha-2) used to pre-fill tournament teams. */
  defaultCountry: string | null;
}
