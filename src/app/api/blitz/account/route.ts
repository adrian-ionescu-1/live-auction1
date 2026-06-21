// GET /api/blitz/account?region=eu&accountId=123
// Returns a rich career profile for one WoT Blitz account (the member-dashboard
// view). Keeps the Wargaming application_id on the server.

import { NextResponse } from "next/server";
import { isBlitzRegion, playerDetails, wgAppId } from "@/lib/blitz";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const accountId = Number(searchParams.get("accountId"));

  if (!isBlitzRegion(region)) {
    return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  }
  if (!Number.isFinite(accountId) || accountId <= 0) {
    return NextResponse.json({ error: "Invalid account id" }, { status: 400 });
  }
  if (!wgAppId()) {
    return NextResponse.json(
      { error: "Player lookup isn't configured (missing WG_APPLICATION_ID)." },
      { status: 503 }
    );
  }

  try {
    const details = await playerDetails(region, accountId);
    if (!details) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json({ details });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
