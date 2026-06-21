// Server-side helpers for the Wargaming WoT Blitz API. The application_id is kept
// on the server (env WG_APPLICATION_ID) and never exposed to the browser; the
// client talks to our /api/blitz/* routes instead.
//
// Get a free application_id at https://developers.wargaming.net (Blitz),
// then add WG_APPLICATION_ID=... to .env.local.

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
