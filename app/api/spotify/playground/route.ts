import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUserId,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/prisma";
import { getValidSpotifyAccessTokenForUser } from "@/lib/services/spotify/get-valid-access-token";
import { SPOTIFY_WEB_API_OAUTH_SCOPES } from "@/lib/services/spotify/spotify-web-api-scopes";
import {
  formatSpotifyApiFailureDetail,
  spotifyFetchJson,
} from "@/lib/services/spotify/spotify-http";
import { handleApiError } from "@/lib/utils/error-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const RATE = {
  route: "/api/spotify/playground",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.85,
} as const;

const SPOTIFY_ENDPOINTS = [
  {
    key: "me",
    relativePath: "/me",
    labelPath: "/v1/me",
  },
  {
    key: "topTracks",
    relativePath: "/me/top/tracks?limit=5&time_range=medium_term",
    labelPath: "/v1/me/top/tracks",
  },
  {
    key: "topArtists",
    relativePath: "/me/top/artists?limit=5&time_range=medium_term",
    labelPath: "/v1/me/top/artists",
  },
  {
    key: "recentlyPlayed",
    relativePath: "/me/player/recently-played?limit=5",
    labelPath: "/v1/me/player/recently-played",
  },
] as const;

type SpotifyPlaygroundEndpointResult =
  | {
      ok: true;
      path: string;
      status: number;
      data: unknown;
    }
  | {
      ok: false;
      path: string;
      status: number;
      error: string;
    };

async function probeEndpoint(
  accessToken: string,
  spec: (typeof SPOTIFY_ENDPOINTS)[number]
): Promise<SpotifyPlaygroundEndpointResult> {
  const out = await spotifyFetchJson<unknown>(spec.relativePath, accessToken);
  if (!out.ok) {
    if (out.status === 429) {
      return {
        ok: false,
        path: spec.labelPath,
        status: 429,
        error: "Spotify rate limit; try again later.",
      };
    }
    return {
      ok: false,
      path: spec.labelPath,
      status: out.status,
      error: formatSpotifyApiFailureDetail(out.status, out.bodyText),
    };
  }
  return {
    ok: true,
    path: spec.labelPath,
    status: 200,
    data: out.data,
  };
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthenticatedUserId(request);
    if (!userId) return unauthorizedResponse();

    await assertRateLimit(request, {
      ...RATE,
      userId,
    });

    const [{ accessToken }, conn] = await Promise.all([
      getValidSpotifyAccessTokenForUser(userId),
      prisma.spotifyConnection.findFirst({
        where: { userId, revokedAt: null },
        select: { scope: true },
      }),
    ]);

    const settled = await Promise.all(
      SPOTIFY_ENDPOINTS.map((spec) => probeEndpoint(accessToken, spec))
    );

    const endpoints: Record<string, SpotifyPlaygroundEndpointResult> = {};
    for (let i = 0; i < SPOTIFY_ENDPOINTS.length; i++) {
      endpoints[SPOTIFY_ENDPOINTS[i].key] = settled[i];
    }

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      endpoints,
      spotifyConnectionScope: conn?.scope ?? null,
      expectedSpotifyApiScopes: SPOTIFY_WEB_API_OAUTH_SCOPES,
    });
  } catch (error) {
    return handleApiError(error, { route: RATE.route });
  }
}
