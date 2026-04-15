import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/error-handler";
import { searchTracksByName } from "@/lib/services/track/track-service";
import { assertRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
const TRACKS_SEARCH_RATE_LIMIT = {
  route: "/api/tracks/search",
  windowMs: 60_000,
  maxRequests: 30,
  softLimitRatio: 0.8,
} as const;

export async function GET(request: NextRequest) {
  try {
    await assertRateLimit(request, TRACKS_SEARCH_RATE_LIMIT);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Math.min(Math.max(Number.parseInt(limitRaw, 10), 1), 50) : 25;

    if (q.length < 2) {
      return NextResponse.json({ tracks: [] });
    }
    if (q.length > 200) {
      return NextResponse.json(
        { error: "Query too long", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const tracks = await searchTracksByName(q, limit);
    return NextResponse.json({ tracks });
  } catch (error) {
    return handleApiError(error, { route: "/api/tracks/search" });
  }
}
