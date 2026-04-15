import type { TrackTrendsChartDataPoint, TrackTrendsChartTrack } from "@/lib/dto/track";
import type { TrackTrendChartRow } from "@/lib/services/track/track-service";

export type TrackTrendPeriod = "day" | "week" | "month";

export function formatTrackTrendDate(
  date: string,
  period: TrackTrendPeriod,
  locale: string
): string {
  if (period === "day") {
    const d = new Date(date);
    return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  }
  if (period === "week") {
    const weekStart = new Date(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const start = weekStart.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
    const end = weekEnd.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
    return `${start} - ${end}`;
  }
  const [year, month] = date.split("-");
  const d = new Date(Number.parseInt(year, 10), Number.parseInt(month, 10) - 1, 1);
  return d.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

export function getTrackLabel(track: TrackTrendsChartTrack): string {
  return `${track.title} - ${track.artistName}`;
}

export function pivotTrackTrends(
  rows: TrackTrendChartRow[],
  period: TrackTrendPeriod,
  locale: string,
  trackIdFilter?: string[],
  ensureTracks?: TrackTrendsChartTrack[]
): { data: TrackTrendsChartDataPoint[]; availableTracks: TrackTrendsChartTrack[] } {
  const byDate = new Map<string, Map<string, { count: number }>>();
  const trackTotals = new Map<string, { title: string; artistName: string; total: number }>();

  for (const { date, trackId, trackTitle, artistName, count } of rows) {
    if (trackIdFilter && trackIdFilter.length > 0 && !trackIdFilter.includes(trackId)) {
      continue;
    }
    if (!byDate.has(date)) byDate.set(date, new Map());
    byDate.get(date)!.set(trackId, { count });
    const prev = trackTotals.get(trackId);
    trackTotals.set(trackId, {
      title: trackTitle,
      artistName,
      total: (prev?.total ?? 0) + count,
    });
  }

  const dates = Array.from(byDate.keys()).sort();
  let availableTracks: TrackTrendsChartTrack[];
  if (ensureTracks && ensureTracks.length > 0) {
    availableTracks = [...ensureTracks].sort((a, b) => {
      const ta = trackTotals.get(a.id)?.total ?? 0;
      const tb = trackTotals.get(b.id)?.total ?? 0;
      if (tb !== ta) return tb - ta;
      return getTrackLabel(a).localeCompare(getTrackLabel(b));
    });
  } else {
    availableTracks = Array.from(trackTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([id, value]) => ({
        id,
        title: value.title,
        artistName: value.artistName,
      }));
  }

  const orderedIds = availableTracks.map((t) => t.id);
  const data: TrackTrendsChartDataPoint[] = dates.map((date) => {
    const point: TrackTrendsChartDataPoint = {
      date,
      formattedDate: formatTrackTrendDate(date, period, locale),
    };
    for (const id of orderedIds) {
      point[id] = byDate.get(date)?.get(id)?.count ?? 0;
    }
    return point;
  });

  return { data, availableTracks };
}
