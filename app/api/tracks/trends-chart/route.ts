import { NextRequest } from "next/server";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type { TrackTrendsChartResponse, TrackTrendsChartTrack } from "@/lib/dto/track";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractOptionalString,
  extractPeriod,
} from "@/lib/middleware/validation";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/auth/require-auth-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import {
  getPublicProfileTrackTrendsChartAllTimeCached,
  getPublicProfileTrackTrendsChartRangeCached,
} from "@/lib/services/track/public-tracks-trends-chart-cached";
import {
  getTopTrackCatalogForRange,
  getTrackTrendsChartRows,
  getTrackTrendsChartRowsForTrackIds,
  resolveTracksByIds,
} from "@/lib/services/track/track-service";
import { pivotTrackTrends } from "@/lib/utils/track-trends-pivot";

export const dynamic = "force-dynamic";
const TRACKS_TRENDS_RATE_LIMIT = {
  route: "/api/tracks/trends-chart",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

type TrendPeriod = "day" | "week" | "month";
const MAX_EXPLICIT_IDS = 50;

function extractTrackIdsFilter(request: NextRequest): string[] | undefined {
  const { searchParams } = new URL(request.url);
  const values = [...new Set(searchParams.getAll("tracks").filter(Boolean))].slice(0, MAX_EXPLICIT_IDS);
  return values.length > 0 ? values : undefined;
}

function extractTopN(request: NextRequest): number {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("topN");
  if (!raw) return 20;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return 20;
  return Math.min(Math.max(n, 1), 50);
}

function mergeCatalogTracks(
  top: TrackTrendsChartTrack[],
  seriesExtras: TrackTrendsChartTrack[]
): TrackTrendsChartTrack[] {
  const seen = new Set<string>();
  const out: TrackTrendsChartTrack[] = [];
  for (const track of top) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      out.push(track);
    }
  }
  for (const track of seriesExtras) {
    if (!seen.has(track.id)) {
      seen.add(track.id);
      out.push(track);
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    await assertAnalyticsRateLimit(request, TRACKS_TRENDS_RATE_LIMIT, userId);

    const publicProfileId = getPublicProfileUserId();
    const isPublicDemoDataset =
      publicProfileId !== null && userId === publicProfileId;

    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");
    const period = extractPeriod(request, "month") as TrendPeriod;
    const tracksFilter = extractTrackIdsFilter(request);
    const topN = extractTopN(request);
    const locale = parseAiLocale(extractOptionalString(request, "locale"));

    if (isPublicDemoDataset && !hasStartDate && !hasEndDate) {
      const response = await getPublicProfileTrackTrendsChartAllTimeCached(
        userId,
        period,
        tracksFilter,
        topN,
        locale
      );
      return publicDemoJsonResponse(response, true);
    }

    let startDate: Date;
    let endDate: Date;
    if (!hasStartDate && !hasEndDate) {
      const range = await getListenDateRange(userId);
      if (!range) {
        return publicDemoJsonResponse(
          { data: [], availableTracks: [] },
          isPublicDemoDataset
        );
      }
      startDate = range.minDate;
      endDate = range.maxDate;
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(defaultEndDate);
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const extracted = extractDateRangeWithDefaults(request, defaultStartDate, defaultEndDate);
      startDate = extracted.startDate;
      endDate = extracted.endDate;
    }

    let response: TrackTrendsChartResponse;

    if (isPublicDemoDataset) {
      response = await getPublicProfileTrackTrendsChartRangeCached(
        userId,
        startDate,
        endDate,
        period,
        tracksFilter,
        topN,
        locale
      );
    } else if (tracksFilter && tracksFilter.length > 0) {
      const rows = await getTrackTrendsChartRowsForTrackIds(
        startDate,
        endDate,
        period,
        userId,
        tracksFilter
      );
      const ensureTracks = await resolveTracksByIds(tracksFilter);
      const { data, availableTracks } = pivotTrackTrends(
        rows,
        period,
        locale,
        undefined,
        ensureTracks
      );

      const catalogTop = await getTopTrackCatalogForRange(startDate, endDate, userId, topN);
      const catalogTracks = mergeCatalogTracks(catalogTop, availableTracks);
      response = { data, availableTracks, catalogTracks };
    } else {
      const rows = await getTrackTrendsChartRows(startDate, endDate, period, userId, topN);
      const { data, availableTracks } = pivotTrackTrends(rows, period, locale);
      response = { data, availableTracks };
    }

    return publicDemoJsonResponse(response, isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: "/api/tracks/trends-chart" });
  }
}
