// Browser-side client for the Blitz lookup routes (/api/blitz/*). Keeps the
// Wargaming application_id on the server; the UI only ever calls our own routes.

import { BlitzRegion, BlitzStats } from "@/types/community-event.types";

export interface BlitzAccount {
  accountId: number;
  nickname: string;
}

export interface BlitzPlayer extends BlitzStats {
  accountId: number;
  nickname: string;
}

export class BlitzClient {
  /** Search candidate accounts by (partial) nickname for a region. */
  static async search(
    region: BlitzRegion,
    name: string
  ): Promise<{ players: BlitzAccount[]; error: string | null }> {
    try {
      const res = await fetch(
        `/api/blitz/search?region=${region}&name=${encodeURIComponent(name)}`
      );
      const body = await res.json();
      if (!res.ok) return { players: [], error: body.error ?? "Lookup failed" };
      return { players: body.players ?? [], error: null };
    } catch {
      return { players: [], error: "Network error during lookup" };
    }
  }

  /** Fetch one account's stats to confirm a registration. */
  static async player(
    region: BlitzRegion,
    accountId: number
  ): Promise<{ player: BlitzPlayer | null; error: string | null }> {
    try {
      const res = await fetch(`/api/blitz/player?region=${region}&accountId=${accountId}`);
      const body = await res.json();
      if (!res.ok) return { player: null, error: body.error ?? "Lookup failed" };
      return { player: body.stats ?? null, error: null };
    } catch {
      return { player: null, error: "Network error during lookup" };
    }
  }
}
