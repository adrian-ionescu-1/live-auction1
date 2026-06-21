// GET /api/blitz/player?region=eu&accountId=123
// Returns one account's career stats (battles, win rate, average damage) from the
// Wargaming Blitz API, used to confirm a registration and stamp the player card.

import { NextResponse } from "next/server";
import { isBlitzRegion, playerStats, wgAppId } from "@/lib/blitz";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const accountId = Number(searchParams.get("accountId"));

  if (!isBlitzRegion(region)) {
    return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  }
  if (!Number.isFinite(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "Invalid accountId" }, { status: 400 });
  }
  if (!wgAppId()) {
    return NextResponse.json(
      { error: "Player lookup isn't configured (missing WG_APPLICATION_ID)." },
      { status: 503 }
    );
  }

  try {
    const stats = await playerStats(region, accountId);
    if (!stats) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    return NextResponse.json({ stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
