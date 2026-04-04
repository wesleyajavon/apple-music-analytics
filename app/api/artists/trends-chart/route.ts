import { NextRequest, NextResponse } from "next/server";
import {
  getArtistTrendsChartRows,
  getArtistTrendsChartRowsForArtistIds,
  getTopArtistCatalogForRange,
  type ArtistTrendChartRow,
} from "@/lib/services/artist/artist-service";
import { prisma } from "@/lib/prisma";
import { getListenDateRange } from "@/lib/services/listening/listening-service";
import type {
  ArtistTrendsChartArtist,
  ArtistTrendsChartDataPoint,
  ArtistTrendsChartResponse,
} from "@/lib/dto/artist";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalUserId,
  extractOptionalString,
} from "@/lib/middleware/validation";
import { parseAiLocale } from "@/lib/services/ai/locale-utils";

export const dynamic = "force-dynamic";

type TrendPeriod = "day" | "week" | "month";

function formatTrendDate(
  date: string,
  period: TrendPeriod,
  locale: string
): string {
  switch (period) {
    case "day": {
      const d = new Date(date);
      return d.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
    }
    case "week": {
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startStr = weekStart.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      const endStr = weekEnd.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      return `${startStr} - ${endStr}`;
    }
    case "month": {
      const [year, month] = date.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString(locale, {
        month: "short",
        year: "numeric",
      });
    }
  }
}

function pivotArtistTrends(
  rows: ArtistTrendChartRow[],
  period: TrendPeriod,
  locale: string,
  artistIdFilter?: string[],
  ensureArtists?: ArtistTrendsChartArtist[]
): { data: ArtistTrendsChartDataPoint[]; availableArtists: ArtistTrendsChartArtist[] } {
  const byDate = new Map<string, Map<string, { name: string; count: number }>>();
  const artistTotals = new Map<string, { name: string; total: number }>();

  for (const { date, artistId, artistName, count } of rows) {
    if (
      artistIdFilter &&
      artistIdFilter.length > 0 &&
      !artistIdFilter.includes(artistId)
    ) {
      continue;
    }
    if (!byDate.has(date)) {
      byDate.set(date, new Map());
    }
    byDate.get(date)!.set(artistId, { name: artistName, count });
    const prev = artistTotals.get(artistId);
    artistTotals.set(artistId, {
      name: artistName,
      total: (prev?.total ?? 0) + count,
    });
  }

  const dates = Array.from(byDate.keys()).sort();

  let availableArtists: ArtistTrendsChartArtist[];
  if (ensureArtists && ensureArtists.length > 0) {
    availableArtists = [...ensureArtists].sort((a, b) => {
      const ta = artistTotals.get(a.id)?.total ?? 0;
      const tb = artistTotals.get(b.id)?.total ?? 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name);
    });
  } else {
    availableArtists = Array.from(artistTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([id, { name }]) => ({ id, name }));
  }

  const artistIdsOrdered = availableArtists.map((a) => a.id);

  const data: ArtistTrendsChartDataPoint[] = dates.map((date) => {
    const point: ArtistTrendsChartDataPoint = {
      date,
      formattedDate: formatTrendDate(date, period, locale),
    };
    for (const id of artistIdsOrdered) {
      const cell = byDate.get(date)?.get(id);
      point[id] = cell?.count ?? 0;
    }
    return point;
  });

  return { data, availableArtists };
}

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
    const { searchParams } = new URL(request.url);
    const hasStartDate = searchParams.has("startDate");
    const hasEndDate = searchParams.has("endDate");

    let startDate: Date;
    let endDate: Date;

    if (!hasStartDate && !hasEndDate) {
      const userId = extractOptionalUserId(request);
      const range = await getListenDateRange(userId);
      if (!range) {
        return NextResponse.json({ data: [], availableArtists: [] });
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

    const period = extractPeriod(request, "month") as TrendPeriod;
    const userId = extractOptionalUserId(request);
    const artistsFilter = extractArtistIdsFilter(request);
    const topN = extractTopN(request);
    const locale = parseAiLocale(extractOptionalString(request, "locale"));

    if (artistsFilter && artistsFilter.length > 0) {
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

      const response: ArtistTrendsChartResponse = {
        data,
        availableArtists,
        catalogArtists,
      };
      return NextResponse.json(response);
    }

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

    const response: ArtistTrendsChartResponse = {
      data,
      availableArtists,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/artists/trends-chart" });
  }
}
