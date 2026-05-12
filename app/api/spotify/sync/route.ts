import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { syncSpotifyRecentlyPlayedForUser } from "@/lib/services/spotify/sync-recently-played";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const RATE = {
  route: "/api/spotify/sync",
  windowMs: 60_000,
  maxRequests: 30,
  softLimitRatio: 0.85,
} as const;

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, {
      ...RATE,
      userId,
    });

    const result = await syncSpotifyRecentlyPlayedForUser(userId);

    return NextResponse.json({
      ok: true,
      source: "spotify_web_api",
      fetched: result.fetched,
      imported: result.imported,
      skippedDuplicates: result.skippedDuplicates,
      skippedInvalid: result.skippedInvalid,
      nextCursorMs: result.nextCursorMs,
    });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
