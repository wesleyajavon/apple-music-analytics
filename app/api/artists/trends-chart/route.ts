import { NextRequest } from "next/server";
import {
  getArtistTrendsChartRows,
  getArtistTrendsChartRowsForArtistIds,
  getTopArtistCatalogForRange,
} from "@/lib/services/artist/artist-service";
import { prisma } from "@/lib/prisma";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type {
  ArtistTrendsChartArtist,
  ArtistTrendsChartResponse,
} from "@/lib/dto/artist";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";
import { pivotArtistTrends } from "@/lib/utils/artist-trends-pivot";
import { resolveAuthorizedDataUserId } from "@/lib/auth/resolve-authorized-data-user-id";
import {
  forbiddenResponse,
  unauthorizedResponse,
} from "@/lib/auth/require-auth-user-id";
import { assertAnalyticsRateLimit } from "@/lib/security/analytics-rate-limit";
import { getPublicProfileUserId } from "@/lib/constants/public-profile";
import { publicDemoJsonResponse } from "@/lib/http/public-demo-response";
import {
  getPublicProfileArtistTrendsChartAllTimeCached,
  getPublicProfileArtistTrendsChartRangeCached,
} from "@/lib/services/artist/public-artists-trends-chart-cached";

export const dynamic = "force-dynamic";
const ARTISTS_TRENDS_CHART_RATE_LIMIT = {
  route: "/api/artists/trends-chart",
  windowMs: 60_000,
  maxRequests: 20,
  softLimitRatio: 0.8,
} as const;

type TrendPeriod = "day" | "week" | "month";

function mergeCatalogPickers(
  top: ArtistTrendsChartArtist[],
  seriesExtras: ArtistTrendsChartArtist[]
): ArtistTrendsChartArtist[] {
  const seen = new Set<string>();
  const out: ArtistTrendsChartArtist[] = [];
  for (const a of top) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      out.push(a);
    }
  }
  for (const a of seriesExtras) {
    if (!seen.has(a.id)) {
      seen.add(a.id);
      out.push(a);
    }
  }
  return out;
}

const MAX_EXPLICIT_IDS = 50;

async function resolveEnsureArtistsFromIds(
  orderedIds: string[]
): Promise<ArtistTrendsChartArtist[]> {
  const rows = await prisma.artist.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, name: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r.name]));
  return orderedIds.map((id) => ({
    id,
    name: byId.get(id) ?? "Unknown",
  }));
}

function extractArtistIdsFilter(request: NextRequest): string[] | undefined {
  const { searchParams } = new URL(request.url);
  const values = [...new Set(searchParams.getAll("artists").filter(Boolean))].slice(
    0,
    MAX_EXPLICIT_IDS
  );
  return values.length > 0 ? values : undefined;
}

function extractTopN(request: NextRequest): number {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("topN");
  if (raw == null || raw === "") return 30;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 30;
  return Math.min(Math.max(n, 1), 50);
}

/**
 * @swagger
 * /api/artists/trends-chart:
 *   get:
 *     summary: Artist trends over time (pivoted for multi-line charts)
 *     description: Top artists by listens in range; time buckets day/week/month.
 *     tags:
 *       - Artists
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthorizedDataUserId(request);
    if (!resolved.ok) {
      return resolved.status === 403 ? forbiddenResponse() : unauthorizedResponse();
    }
    const { userId } = resolved;
    await assertAnalyticsRateLimit(request, ARTISTS_TRENDS_CHART_RATE_LIMIT, userId);

    const publicProfileId = getPublicProfileUserId();
    const isPublicDemoDataset =
      publicProfileId !== null && userId === publicProfileId;

    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");
    const period = extractPeriod(request, "month") as TrendPeriod;
    const artistsFilter = extractArtistIdsFilter(request);
    const topN = extractTopN(request);
    const locale = parseAiLocale(extractOptionalString(request, "locale"));

    if (isPublicDemoDataset && !hasStartDate && !hasEndDate) {
      const response = await getPublicProfileArtistTrendsChartAllTimeCached(
        userId,
        period,
        artistsFilter,
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
          { data: [], availableArtists: [] },
          isPublicDemoDataset
        );
      }
      startDate = range.minDate;
      endDate = range.maxDate;
    } else {
      const defaultEndDate = new Date();
      const defaultStartDate = new Date(defaultEndDate);
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const extracted = extractDateRangeWithDefaults(
        request,
        defaultStartDate,
        defaultEndDate
      );
      startDate = extracted.startDate;
      endDate = extracted.endDate;
    }

    let response: ArtistTrendsChartResponse;

    if (isPublicDemoDataset) {
      response = await getPublicProfileArtistTrendsChartRangeCached(
        userId,
        startDate,
        endDate,
        period,
        artistsFilter,
        topN,
        locale
      );
    } else if (artistsFilter && artistsFilter.length > 0) {
      const rows = await getArtistTrendsChartRowsForArtistIds(
        startDate,
        endDate,
        period,
        userId,
        artistsFilter
      );
      const ensureArtists = await resolveEnsureArtistsFromIds(artistsFilter);
      const { data, availableArtists } = pivotArtistTrends(
        rows,
        period,
        locale,
        undefined,
        ensureArtists
      );
      const catalogTop = await getTopArtistCatalogForRange(
        startDate,
        endDate,
        userId,
        topN
      );
      const catalogArtists = mergeCatalogPickers(catalogTop, availableArtists);

      response = {
        data,
        availableArtists,
        catalogArtists,
      };
    } else {
      const rows = await getArtistTrendsChartRows(
        startDate,
        endDate,
        period,
        userId,
        topN
      );
      const { data, availableArtists } = pivotArtistTrends(
        rows,
        period,
        locale
      );

      response = {
        data,
        availableArtists,
      };
    }

    return publicDemoJsonResponse(response, isPublicDemoDataset);
  } catch (error) {
    return handleApiError(error, { route: "/api/artists/trends-chart" });
  }
}
