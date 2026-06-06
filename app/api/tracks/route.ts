import { NextRequest, NextResponse } from "next/server";
import type { TracksResponseDto } from "@/lib/dto/track";
import { handleApiError } from "@/lib/utils/error-handler";
import { extractOptionalDateRange } from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import {
  countTracksForRange,
  getTrackOverview,
  getTrackStats,
} from "@/lib/services/track/track-service";
import { isActivePublicProfileUserId } from "@/lib/services/user/public-profile-access";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import { getPublicProfileTracksListCached } from "@/lib/services/track/public-tracks-list-cached";

export const dynamic = "force-dynamic";
const TRACKS_RATE_LIMIT = {
  route: "/api/tracks",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

export async function GET(request: NextRequest) {
  try {
    const { startDate, endDate } = extractOptionalDateRange(request);
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;

    await assertAnalyticsRateLimit(request, TRACKS_RATE_LIMIT, userId);

    const isPublicDemoDataset = await isActivePublicProfileUserId(userId);

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;
    const offset = offsetParam ? Number.parseInt(offsetParam, 10) : 0;

    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Le paramètre limit doit être entre 1 et 100" },
        { status: 400 }
      );
    }
    if (Number.isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: "Le paramètre offset doit être supérieur ou égal à 0" },
        { status: 400 }
      );
    }

    let response: TracksResponseDto;
    if (isPublicDemoDataset) {
      response = await getPublicProfileTracksListCached(
        userId,
        startDate,
        endDate,
        limit,
        offset
      );
    } else {
      const [overview, total, topTracks] = await Promise.all([
        getTrackOverview(startDate, endDate, userId),
        countTracksForRange(startDate, endDate, userId),
        getTrackStats(startDate, endDate, userId, limit, offset),
      ]);
      response = {
        overview,
        topTracks,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + topTracks.length < total,
        },
      };
    }
    return publicDemoJsonResponse(response, isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: "/api/tracks" });
  }
}
