// Rich WoT Blitz account profile, derived from the Wargaming account/info API.
// Used by the member dashboard to render a linked account like a personal game
// profile. Career ("all") stats only.

import { BlitzRegion } from "@/types/community-event.types";

export interface BlitzAccountDetails {
  accountId: number;
  nickname: string;
  region: BlitzRegion;
  /** Unix seconds; account creation / most recent battle, or null if unknown. */
  createdAt: number | null;
  lastBattleTime: number | null;
  battles: number;
  wins: number;
  losses: number;
  draws: number;
  /** Win rate as a percentage, e.g. 54.3. */
  winrate: number;
  avgDamage: number;
  /** Average frags (kills) per battle. */
  avgFrags: number;
  /** Average experience per battle. */
  avgXp: number;
  maxFrags: number;
  maxXp: number;
  /** Hit ratio (hits / shots) as a percentage. */
  accuracy: number;
  /** Survival rate (survived / battles) as a percentage. */
  survival: number;
  /** Average enemies spotted per battle. */
  avgSpots: number;
}
