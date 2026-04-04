import type { GenreTrendsDataPoint } from "@/lib/dto/genres";
import type { GenreTrendPeriod, GenreTrendRow } from "@/lib/services/listening/listening-stats";

export function formatTrendDate(
  date: string,
  period: GenreTrendPeriod,
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

export function pivotTrends(
  rows: GenreTrendRow[],
  period: GenreTrendPeriod,
  locale: string,
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
      formattedDate: formatTrendDate(date, period, locale),
    };
    for (const g of genres) {
      point[g] = byDate.get(date)?.get(g) ?? 0;
    }
    return point;
  });

  return { data, availableGenres: genres };
}
