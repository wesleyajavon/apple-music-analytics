import { NextRequest, NextResponse } from "next/server";
import {
  getGenreTrends,
  type GenreTrendPeriod,
  type GenreTrendRow,
} from "@/lib/services/listening/listening-stats";
import type { GenreTrendsDataPoint, GenreTrendsResponse } from "@/lib/dto/genres";
import { handleApiError } from "@/lib/utils/error-handler";
import {
  extractDateRangeWithDefaults,
  extractPeriod,
  extractOptionalUserId,
} from "@/lib/middleware/validation";

export const dynamic = "force-dynamic";

function formatTrendDate(date: string, period: GenreTrendPeriod): string {
  switch (period) {
    case "day": {
      const d = new Date(date);
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
    }
    case "week": {
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startStr = weekStart.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      const endStr = weekEnd.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      return `${startStr} - ${endStr}`;
    }
    case "month": {
      const [year, month] = date.split("-");
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
      });
    }
  }
}

function pivotTrends(
  rows: GenreTrendRow[],
  period: GenreTrendPeriod,
  genreFilter?: string[]
): { data: GenreTrendsDataPoint[]; availableGenres: string[] } {
  const byDate = new Map<string, Map<string, number>>();
  const genreTotals = new Map<string, number>();

  for (const { date, genre, count } of rows) {
    if (genreFilter && genreFilter.length > 0 && !genreFilter.includes(genre)) {
      continue;
    }
    if (!byDate.has(date)) {
      byDate.set(date, new Map());
    }
    byDate.get(date)!.set(genre, count);
    genreTotals.set(genre, (genreTotals.get(genre) ?? 0) + count);
  }

  const dates = Array.from(byDate.keys()).sort();
  const genres = Array.from(genreTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const data: GenreTrendsDataPoint[] = dates.map((date) => {
    const point: GenreTrendsDataPoint = {
      date,
      formattedDate: formatTrendDate(date, period),
    };
    for (const g of genres) {
      point[g] = byDate.get(date)?.get(g) ?? 0;
    }
    return point;
  });

  return { data, availableGenres: genres };
}

function extractGenresFilter(request: NextRequest): string[] | undefined {
  const { searchParams } = new URL(request.url);
  const values = searchParams.getAll("genres").filter(Boolean);
  return values.length > 0 ? values : undefined;
}

/**
 * @swagger
 * /api/genres/trends:
 *   get:
 *     summary: Tendances des genres dans le temps
 *     description: Évolution des écoutes par genre (jour/semaine/mois). Données pivotées pour graphique multi-lignes.
 *     tags:
 *       - Genres
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [day, week, month], default: month }
 *       - in: query
 *         name: genres
 *         schema: { type: array, items: { type: string } }
 *         description: Filtrer les genres affichés (répéter le paramètre)
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Données de tendances par genre
 *       400:
 *         description: Erreur de validation
 *       500:
 *         description: Erreur serveur
 */
export async function GET(request: NextRequest) {
  try {
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const { startDate, endDate } = extractDateRangeWithDefaults(
      request,
      defaultStartDate,
      defaultEndDate
    );
    const period = extractPeriod(request, "month") as GenreTrendPeriod;
    const userId = extractOptionalUserId(request);
    const genresFilter = extractGenresFilter(request);

    const rows = await getGenreTrends(startDate, endDate, period, userId);
    const { data, availableGenres } = pivotTrends(rows, period, genresFilter);

    const response: GenreTrendsResponse = {
      data,
      availableGenres,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error, { route: "/api/genres/trends" });
  }
}
