// Server-side helpers for the Wargaming WoT Blitz API. The application_id is kept
// on the server (env WG_APPLICATION_ID) and never exposed to the browser; the
// client talks to our /api/blitz/* routes instead.
//
// Get a free application_id at https://developers.wargaming.net (Blitz),
// then add WG_APPLICATION_ID=... to .env.local.

import { BlitzAccountDetails } from "@/types/blitz.types";

export type BlitzRegion = "eu" | "na" | "asia";

// Region slug -> Wargaming API host. NA uses the .com host.
const API_HOST: Record<BlitzRegion, string> = {
  eu: "https://api.wotblitz.eu",
  na: "https://api.wotblitz.com",
  asia: "https://api.wotblitz.asia",
};

export function isBlitzRegion(value: string | null | undefined): value is BlitzRegion {
  return value === "eu" || value === "na" || value === "asia";
}

export function wgAppId(): string | null {
  return process.env.WG_APPLICATION_ID ?? null;
}

export interface BlitzAccount {
  accountId: number;
  nickname: string;
}

export interface BlitzPlayerStats {
  accountId: number;
  nickname: string;
  battles: number;
  /** Win rate as a percentage, e.g. 76.0. */
  winrate: number;
  /** Average damage per battle, rounded. */
  avgDamage: number;
}

async function wgGet(region: BlitzRegion, path: string, params: Record<string, string>) {
  const appId = wgAppId();
  if (!appId) throw new Error("WG_APPLICATION_ID is not configured on the server.");
  const url = new URL(`${API_HOST[region]}${path}`);
  url.searchParams.set("application_id", appId);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Wargaming API error (${res.status})`);
  const json = (await res.json()) as { status: string; error?: { message: string }; data: unknown };
  if (json.status !== "ok") {
    throw new Error(json.error?.message ?? "Wargaming API request failed");
  }
  return json.data;
}

/** Search players by (partial) nickname. */
export async function searchPlayers(region: BlitzRegion, name: string): Promise<BlitzAccount[]> {
  const clean = name.trim();
  if (clean.length < 3) return []; // WG requires at least 3 chars
  const data = (await wgGet(region, "/wotb/account/list/", {
    search: clean,
    limit: "12",
  })) as Array<{ account_id: number; nickname: string }> | null;
  return (data ?? []).map((a) => ({ accountId: a.account_id, nickname: a.nickname }));
}

/** Career stats for one account: battles, win rate and average damage. */
export async function playerStats(
  region: BlitzRegion,
  accountId: number
): Promise<BlitzPlayerStats | null> {
  const data = (await wgGet(region, "/wotb/account/info/", {
    account_id: String(accountId),
    fields:
      "nickname,statistics.all.battles,statistics.all.wins,statistics.all.damage_dealt",
  })) as Record<
    string,
    {
      nickname: string;
      statistics: { all: { battles: number; wins: number; damage_dealt: number } };
    } | null
  >;

  const row = data?.[String(accountId)];
  if (!row || !row.statistics?.all) return null;
  const { battles, wins, damage_dealt } = row.statistics.all;
  const safeBattles = battles || 0;
  return {
    accountId,
    nickname: row.nickname,
    battles: safeBattles,
    winrate: safeBattles ? Math.round((wins / safeBattles) * 1000) / 10 : 0,
    avgDamage: safeBattles ? Math.round(damage_dealt / safeBattles) : 0,
  };
}

/** A rich career profile for one account (the member-dashboard view). */
export async function playerDetails(
  region: BlitzRegion,
  accountId: number
): Promise<BlitzAccountDetails | null> {
  const data = (await wgGet(region, "/wotb/account/info/", {
    account_id: String(accountId),
    fields: [
      "nickname",
      "created_at",
      "last_battle_time",
      "statistics.all.battles",
      "statistics.all.wins",
      "statistics.all.losses",
      "statistics.all.damage_dealt",
      "statistics.all.frags",
      "statistics.all.max_frags",
      "statistics.all.max_xp",
      "statistics.all.xp",
      "statistics.all.hits",
      "statistics.all.shots",
      "statistics.all.survived_battles",
      "statistics.all.spotted",
    ].join(","),
  })) as Record<
    string,
    {
      nickname: string;
      created_at: number | null;
      last_battle_time: number | null;
      statistics: {
        all: {
          battles: number;
          wins: number;
          losses: number;
          damage_dealt: number;
          frags: number;
          max_frags: number;
          max_xp: number;
          xp: number;
          hits: number;
          shots: number;
          survived_battles: number;
          spotted: number;
        };
      };
    } | null
  >;

  const row = data?.[String(accountId)];
  if (!row || !row.statistics?.all) return null;
  const s = row.statistics.all;
  const b = s.battles || 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    accountId,
    nickname: row.nickname,
    region,
    createdAt: row.created_at ?? null,
    lastBattleTime: row.last_battle_time ?? null,
    battles: b,
    wins: s.wins || 0,
    losses: s.losses || 0,
    // WoT Blitz has no `draws` field — derive it from the totals.
    draws: Math.max(0, b - (s.wins || 0) - (s.losses || 0)),
    winrate: b ? round1((s.wins / b) * 100) : 0,
    avgDamage: b ? Math.round(s.damage_dealt / b) : 0,
    avgFrags: b ? round1(s.frags / b) : 0,
    avgXp: b ? Math.round(s.xp / b) : 0,
    maxFrags: s.max_frags || 0,
    maxXp: s.max_xp || 0,
    accuracy: s.shots ? round1((s.hits / s.shots) * 100) : 0,
    survival: b ? round1((s.survived_battles / b) * 100) : 0,
    avgSpots: b ? round1(s.spotted / b) : 0,
  };
}
