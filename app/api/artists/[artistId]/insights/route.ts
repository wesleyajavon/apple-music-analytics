import { NextRequest, NextResponse } from "next/server";
import { extractOptionalDateRange } from "@/lib/middleware/validation";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { handleApiError } from "@/lib/utils/error-handler";
import { getArtistUserInsights, type ArtistUserInsights } from "@/lib/services/artist/artist-service";
import type { ArtistUserInsightsDto } from "@/lib/dto/artist";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import { getPublicProfileArtistUserInsightsCached } from "@/lib/services/artist/public-artist-insights-cached";

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
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;

    const publicProfileId = getPublicProfileUserId();
    const isPublicDemoDataset =
      publicProfileId !== null && userId === publicProfileId;

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
