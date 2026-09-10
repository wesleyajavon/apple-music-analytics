import { NextRequest, NextResponse } from "next/server";
import {
  extractOptionalDateRange,
  extractOptionalUserId,
} from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import { getCurrentUserId } from "@/lib/auth/get-current-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import { getArtistUserInsights, type ArtistUserInsights } from "@/lib/services/artist/artist-service";
import type { ArtistUserInsightsDto } from "@/lib/dto/artist";
import {
  isActivePublicProfileUserId,
  resolveActivePublicProfileUserId,
} from "@/lib/services/user/public-profile-access";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import { getPublicProfileArtistUserInsightsCached } from "@/lib/services/artist/public-artist-insights-cached";
import { isUuidString } from "@/lib/constants/public-profile";
import { assertFriendDataAccess } from "@/lib/services/duet/assert-friend-data-access";
import { friendAccessDeniedResponse } from "@/lib/services/duet/duet-compare-guard";

export const dynamic = "force-dynamic";

function toDto(insights: ArtistUserInsights): ArtistUserInsightsDto {
  return {
    artist: {
      artistId: insights.artist.artistId,
      artistName: insights.artist.artistName,
      imageUrl: insights.artist.imageUrl,
      listenCount: insights.artist.listenCount,
      uniqueTracks: insights.artist.uniqueTracks,
      firstListenDate: insights.artist.firstListenDate,
      lastListenDate: insights.artist.lastListenDate,
      totalPlayTime: insights.artist.totalPlayTime,
      signatureTrack: insights.artist.signatureTrack ?? insights.topTracks[0] ?? null,
    },
    topTracks: insights.topTracks,
    listensByHour: insights.listensByHour,
    listensByWeekday: insights.listensByWeekday,
    listensBySource: insights.listensBySource,
    busiestDay: insights.busiestDay,
    activeListeningDays: insights.activeListeningDays,
    listeningSpanDays: insights.listeningSpanDays,
    peakListenHour: insights.peakListenHour,
    peakWeekday: insights.peakWeekday,
  };
}

/**
 * Self + public demo via resolveAuthorizedDataUserId; Duet friend via assertFriendDataAccess.
 */
async function resolveInsightsDataUserId(
  request: NextRequest
): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const sessionUserId = (await getCurrentUserId(request)) ?? null;
  const requestedRaw = extractOptionalUserId(request);
  const requested =
    requestedRaw && isUuidString(requestedRaw) ? requestedRaw.trim() : undefined;

  if (sessionUserId && requested && requested !== sessionUserId) {
    const publicId = await resolveActivePublicProfileUserId();
    if (!(publicId && requested === publicId)) {
      const access = await assertFriendDataAccess({
        viewerId: sessionUserId,
        targetUserId: requested,
        requiredScope: "aggregates",
      });
      if (!access.ok) {
        return { ok: false, response: friendAccessDeniedResponse(access.status) };
      }
      return { ok: true, userId: requested };
    }
  }

  const resolved = await resolveAuthorizedDataUserId(request);
  if (!resolved.ok) {
    return {
      ok: false,
      response: resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse(),
    };
  }
  return { ok: true, userId: resolved.userId };
}

export async function GET(
  request: NextRequest,
  context: { params: { artistId: string } }
) {
  try {
    const artistId = context.params?.artistId?.trim();
    if (!artistId) {
      return NextResponse.json({ error: "artistId is required" }, { status: 400 });
    }

    const { startDate, endDate } = extractOptionalDateRange(request);
    const resolved = await resolveInsightsDataUserId(request);
    if (!resolved.ok) {
      return resolved.response;
    }
    const { userId } = resolved;

    const isPublicDemoDataset = await isActivePublicProfileUserId(userId);

    const insights: ArtistUserInsights | null = isPublicDemoDataset
      ? await getPublicProfileArtistUserInsightsCached(
          userId,
          artistId,
          startDate,
          endDate
        )
      : await getArtistUserInsights(artistId, startDate, endDate, userId);

    if (!insights) {
      return NextResponse.json(
        { error: "Artist not found or no listens for this period" },
        { status: 404 }
      );
    }

    return publicDemoJsonResponse(toDto(insights), isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: "/api/artists/[artistId]/insights" });
  }
}
