"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Disc3, Music2, Users, X } from "lucide-react";
import type { ListensResponse } from "@/lib/dto/listening";
import type { ListenRecordSource } from "@/lib/constants/listen-source";
import { DayDetailsSkeleton } from "@/lib/components/skeleton-loaders";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";

const TRACK_KEY_SEP = "\u001f";

function sourceLabel(source: ListenRecordSource, t: (key: string) => string): string {
  switch (source) {
    case "lastfm":
      return t("sourceLastfm");
    case "apple_music_replay":
    case "apple_music_export":
      return t("sourceAppleMusic");
    case "spotify_export":
    case "spotify_web_api":
      return t("sourceSpotify");
    default:
      return t("sourceOther");
  }
}

function sourceChipClasses(source: ListenRecordSource): string {
  switch (source) {
    case "lastfm":
      return "border-violet-300/35 bg-violet-400/10 text-violet-900 dark:text-violet-100";
    case "spotify_export":
    case "spotify_web_api":
      return "border-green-400/35 bg-green-400/10 text-green-900 dark:text-green-100";
    case "apple_music_replay":
    case "apple_music_export":
      return "border-emerald-300/35 bg-emerald-400/10 text-emerald-800 dark:text-emerald-100";
    default:
      return "border-slate-300/35 bg-slate-400/10 text-slate-900 dark:text-slate-100";
  }
}

function sourceDotClass(source: ListenRecordSource): string {
  switch (source) {
    case "lastfm":
      return "bg-violet-400";
    case "spotify_export":
    case "spotify_web_api":
      return "bg-green-400";
    case "apple_music_replay":
    case "apple_music_export":
      return "bg-emerald-400";
    default:
      return "bg-slate-400";
  }
}

function rowBadgeClasses(source: ListenRecordSource): string {
  switch (source) {
    case "lastfm":
      return "bg-violet-400/15 text-violet-700 dark:text-violet-200";
    case "spotify_export":
    case "spotify_web_api":
      return "bg-green-400/15 text-green-800 dark:text-green-200";
    case "apple_music_replay":
    case "apple_music_export":
      return "bg-emerald-400/15 text-emerald-800 dark:text-emerald-200";
    default:
      return "bg-slate-400/15 text-slate-800 dark:text-slate-200";
  }
}

function parseLocalDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function aggregateTopCounts(
  data: ListensResponse["data"],
  getKey: (row: (typeof data)[0]) => string,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of data) {
    const k = getKey(row);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export type HeatmapDayDetailsPanelProps = {
  selectedDate: string;
  locale: string;
  onClose: () => void;
  dayListens: ListensResponse | undefined;
  isLoading: boolean;
  /** Period daily average (same definition as heatmap hero), or null if unknown */
  periodDailyAverage: number | null;
  periodMaxListens: number;
  periodMaxDayDate: string | null;
  emptyStateNoPlays: ReactNode;
};

export function HeatmapDayDetailsPanel({
  selectedDate,
  locale,
  onClose,
  dayListens,
  isLoading,
  periodDailyAverage,
  periodMaxListens,
  periodMaxDayDate,
  emptyStateNoPlays,
}: HeatmapDayDetailsPanelProps) {
  const t = useTranslations("heatmap");

  const formattedDate = useMemo(() => {
    const d = parseLocalDay(selectedDate);
    return d.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [selectedDate, locale]);

  const shortDate = useMemo(() => {
    const d = parseLocalDay(selectedDate);
    return d.toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate, locale]);

  const analysis = useMemo(() => {
    if (!dayListens?.data.length) {
      return {
        hours: Array.from({ length: 24 }, () => 0),
        hourMax: 1,
        sourceBreakdown: [] as [ListenRecordSource, number][],
        uniqueArtists: 0,
        uniqueTracks: 0,
        topArtists: [] as [string, number][],
        topTracks: [] as [string, string, number][],
        sortedListens: [] as ListensResponse["data"],
      };
    }
    const { data } = dayListens;
    const hours = Array.from({ length: 24 }, () => 0);
    const sourceMap = new Map<ListenRecordSource, number>();
    for (const row of data) {
      hours[new Date(row.playedAt).getHours()]++;
      sourceMap.set(row.source, (sourceMap.get(row.source) ?? 0) + 1);
    }
    const hourMax = Math.max(1, ...hours);
    const sourceBreakdown = [...sourceMap.entries()].sort((a, b) => b[1] - a[1]);

    const artistMap = aggregateTopCounts(data, (r) => r.artistName);
    const topArtists = [...artistMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const trackMap = aggregateTopCounts(
      data,
      (r) => `${r.trackTitle}${TRACK_KEY_SEP}${r.artistName}`,
    );
    const topTracks = [...trackMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([compound, count]) => {
        const [title, artist] = compound.split(TRACK_KEY_SEP);
        return [title, artist, count] as [string, string, number];
      });

    const sortedListens = [...data].sort(
      (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
    );

    return {
      hours,
      hourMax,
      sourceBreakdown,
      uniqueArtists: new Set(data.map((r) => r.artistName)).size,
      uniqueTracks: new Set(data.map((r) => `${r.trackTitle}-${r.artistName}`)).size,
      topArtists,
      topTracks,
      sortedListens,
    };
  }, [dayListens]);

  const dayNorm = selectedDate.split("T")[0];
  const maxNorm = periodMaxDayDate?.split("T")[0] ?? null;
  const isPeakDay =
    maxNorm != null && maxNorm === dayNorm && periodMaxListens > 0;

  const total = dayListens?.total ?? 0;

  const vsAverage = useMemo(() => {
    if (isLoading) return null;
    if (periodDailyAverage == null || periodDailyAverage <= 0 || total <= 0) {
      return null;
    }
    const ratio = total / periodDailyAverage;
    const pct = Math.round(Math.abs(ratio - 1) * 100);
    if (pct === 0) return { kind: "match" as const };
    if (ratio > 1) return { kind: "above" as const, pct };
    return { kind: "below" as const, pct };
  }, [periodDailyAverage, total, isLoading]);

  const peakMeterPct =
    !isLoading && periodMaxListens > 0
      ? Math.min(100, Math.round((total / periodMaxListens) * 100))
      : 0;

  const showPeakMeter = !isLoading && periodMaxListens > 0;

  return (
    <div className="relative text-foreground">
      <header className="border-b border-glass-hairline px-4 pb-5 pt-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${DASHBOARD_SECTION_EYEBROW} inline-flex items-center gap-1.5`}>
                <Calendar className="h-3.5 w-3.5 opacity-90" aria-hidden />
                {t("dayDetailsEyebrow")}
              </span>
              {isPeakDay ? (
                <span className="text-[13px] font-medium text-muted">{t("peakDayBadge")}</span>
              ) : null}
            </div>
            <div>
              <h2
                id="heatmap-day-details-title"
                className={`${DASHBOARD_SECTION_TITLE} text-2xl sm:text-3xl`}
              >
                {formattedDate}
              </h2>
              <p className="mt-1.5 text-[13px] text-muted">{shortDate}</p>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {isLoading ? (
                <span
                  className="inline-block h-8 min-w-[7rem] animate-pulse rounded bg-black/10 dark:bg-white/10"
                  aria-hidden
                />
              ) : (
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className={DASHBOARD_METRIC_VALUE}>{total.toLocaleString(locale)}</span>
                  <span className={DASHBOARD_METRIC_LABEL}>
                    {total !== 1 ? t("listens") : t("listen")}
                  </span>
                </p>
              )}
              {vsAverage?.kind === "above" ? (
                <span className="text-[13px] text-muted">
                  {t("vsAvgAbove", { pct: vsAverage.pct })}
                </span>
              ) : null}
              {vsAverage?.kind === "below" ? (
                <span className="text-[13px] text-muted">
                  {t("vsAvgBelow", { pct: vsAverage.pct })}
                </span>
              ) : null}
              {vsAverage?.kind === "match" ? (
                <span className="text-[13px] text-muted">{t("vsAvgMatch")}</span>
              ) : null}
            </div>

            {showPeakMeter ? (
              <div className="max-w-md space-y-1.5">
                <div className="flex items-center justify-between text-[13px] text-muted">
                  <span>{t("relativeToPeak")}</span>
                  <span className="tabular-nums">{peakMeterPct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-foreground/70 transition-[width] duration-500 ease-out"
                    style={{ width: `${peakMeterPct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`${DASHBOARD_BTN_GHOST} h-11 w-11 shrink-0 self-start px-0`}
            aria-label={t("closeDetails")}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="relative">
        {isLoading ? (
          <div className="p-4 lg:p-6">
            <DayDetailsSkeleton />
          </div>
        ) : dayListens && dayListens.data.length > 0 ? (
          <div className="space-y-8 p-4 lg:p-6">
            <div
              className={`${DASHBOARD_METRIC_STRIP} w-full max-lg:flex-nowrap max-lg:overflow-x-auto`}
            >
              <div className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[9.75rem] max-lg:flex-none`}>
                <span className={`${DASHBOARD_METRIC_LABEL} inline-flex items-center gap-1.5`}>
                  <Music2 className="h-3.5 w-3.5" aria-hidden />
                  {t("totalListens")}
                </span>
                <span className={DASHBOARD_METRIC_VALUE}>
                  {dayListens.total.toLocaleString(locale)}
                </span>
              </div>
              <div className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[9.75rem] max-lg:flex-none`}>
                <span className={`${DASHBOARD_METRIC_LABEL} inline-flex items-center gap-1.5`}>
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {t("uniqueArtists")}
                </span>
                <span className={DASHBOARD_METRIC_VALUE}>
                  {analysis.uniqueArtists.toLocaleString(locale)}
                </span>
              </div>
              <div className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[9.75rem] max-lg:flex-none`}>
                <span className={`${DASHBOARD_METRIC_LABEL} inline-flex items-center gap-1.5`}>
                  <Disc3 className="h-3.5 w-3.5" aria-hidden />
                  {t("uniqueTracks")}
                </span>
                <span className={DASHBOARD_METRIC_VALUE}>
                  {analysis.uniqueTracks.toLocaleString(locale)}
                </span>
              </div>
            </div>

            {analysis.sourceBreakdown.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analysis.sourceBreakdown.map(([source, count]) => (
                  <span
                    key={source}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${sourceChipClasses(source)}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sourceDotClass(source)}`} />
                    {sourceLabel(source, t)} · {count.toLocaleString(locale)}
                  </span>
                ))}
              </div>
            ) : null}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">{t("listensByHour")}</h3>
              </div>
              <div
                className="flex h-24 items-end gap-px border-b border-glass-hairline px-1 pb-2 pt-3 sm:gap-0.5"
                role="img"
                aria-label={t("listensByHour")}
              >
                {analysis.hours.map((c, h) => {
                  const hPct = analysis.hourMax > 0 ? (c / analysis.hourMax) * 100 : 0;
                  return (
                    <div
                      key={h}
                      className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                    >
                      <div
                        className="w-full max-w-[10px] rounded-t-sm bg-foreground/55 opacity-90 transition-opacity group-hover:opacity-100"
                        style={{
                          height: `${Math.max(6, hPct * 0.72)}%`,
                          minHeight: c > 0 ? "8px" : "3px",
                        }}
                      />
                      {h % 6 === 0 ? (
                        <span className="mt-1 text-[9px] font-medium text-muted tabular-nums sm:text-[10px]">
                          {h}
                        </span>
                      ) : (
                        <span className="mt-1 h-3 sm:h-3.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t("topArtists")}</h3>
                <ul>
                  {analysis.topArtists.map(([artist, count], index) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <li
                        key={artist}
                        className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted">
                            {index + 1}
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">
                            {artist}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {count.toLocaleString(locale)}
                          </span>
                          <span className="ml-1.5 text-xs text-muted">({pct}%)</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{t("topTracks")}</h3>
                <ul>
                  {analysis.topTracks.map(([title, artist, count], index) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <li
                        key={`${title}-${artist}`}
                        className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} justify-between`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{title}</p>
                            <p className="truncate text-xs text-muted">{artist}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {count.toLocaleString(locale)}
                          </span>
                          <span className="ml-1.5 text-xs text-muted">({pct}%)</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{t("detailedListens")}</h3>
              <ul className="max-h-[22rem] overflow-y-auto overscroll-contain pr-1 sm:max-h-[28rem]">
                {analysis.sortedListens.map((listen) => (
                  <li
                    key={listen.id}
                    className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} items-start`}
                  >
                    <div className="mt-0.5 min-w-[3.25rem] shrink-0 text-right">
                      <span className="text-xs font-semibold tabular-nums text-muted">
                        {new Date(listen.playedAt).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {listen.trackTitle}
                      </p>
                      <p className="truncate text-xs text-muted">{listen.artistName}</p>
                    </div>
                    <span
                      className={`mt-0.5 max-w-[8.5rem] shrink-0 truncate rounded-lg px-2 py-0.5 text-[10px] font-semibold tracking-wide ${rowBadgeClasses(listen.source)}`}
                      title={sourceLabel(listen.source, t)}
                    >
                      {sourceLabel(listen.source, t)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : dayListens && dayListens.data.length === 0 ? (
          <div className="p-4 lg:p-6">{emptyStateNoPlays}</div>
        ) : null}
      </div>
    </div>
  );
}
