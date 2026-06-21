// GET /api/blitz/search?region=eu&name=NickName
// Proxies a Wargaming Blitz nickname search so the application_id stays on the
// server. Returns up to a dozen candidate accounts to pick from.

import { NextResponse } from "next/server";
import { isBlitzRegion, searchPlayers, wgAppId } from "@/lib/blitz";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const name = searchParams.get("name") ?? "";

  if (!isBlitzRegion(region)) {
    return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  }
  if (!wgAppId()) {
    return NextResponse.json(
      { error: "Player lookup isn't configured (missing WG_APPLICATION_ID)." },
      { status: 503 }
    );
  }

  try {
    const players = await searchPlayers(region, name);
    return NextResponse.json({ players });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
