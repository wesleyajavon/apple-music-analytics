import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { getValidSpotifyAccessTokenForUser } from "@/lib/services/spotify/get-valid-access-token";
import {
  formatSpotifyApiFailureDetail,
  spotifyFetchJson,
} from "@/lib/services/spotify/spotify-http";
import { handleApiError } from "@/lib/utils/error-handler";

/**
 * Validates that the user's saved Spotify tokens work against the Web API (`GET /v1/me`).
 * Does not persist listening history or analytics — used from partial onboarding only.
 * (Full listens still come from Spotify ZIP / Apple CSV import.)
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RATE = {
  route: "/api/spotify/connection-verify",
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

    const { accessToken } = await getValidSpotifyAccessTokenForUser(userId);
    const out = await spotifyFetchJson<unknown>("/me", accessToken);

    if (!out.ok) {
      if (out.status === 429) {
        return NextResponse.json(
          { error: "Spotify rate limit; try again later." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: formatSpotifyApiFailureDetail(out.status, out.bodyText),
        },
        {
          status:
            out.status >= 400 && out.status < 600
              ? out.status
              : 502,
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
