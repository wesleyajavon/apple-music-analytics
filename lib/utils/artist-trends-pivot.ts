/**
 * Pivot artist trend rows for multi-line charts (shared by trends-chart API and AI commentary).
 */

import type { ArtistTrendChartRow } from "@/lib/services/artist/artist-service";
import type {
  ArtistTrendsChartArtist,
  ArtistTrendsChartDataPoint,
} from "@/lib/dto/artist";

export type ArtistTrendPeriod = "day" | "week" | "month";

export function formatArtistTrendDate(
  date: string,
  period: ArtistTrendPeriod,
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

export function pivotArtistTrends(
  rows: ArtistTrendChartRow[],
  period: ArtistTrendPeriod,
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
      formattedDate: formatArtistTrendDate(date, period, locale),
    };
    for (const id of artistIdsOrdered) {
      const cell = byDate.get(date)?.get(id);
      point[id] = cell?.count ?? 0;
    }
    return point;
  });

  return { data, availableArtists };
}
