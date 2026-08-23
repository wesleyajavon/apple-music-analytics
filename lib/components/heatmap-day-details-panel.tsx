"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Clock, Disc3, Music2, Users, X } from "lucide-react";
import type { ListensResponse } from "@/lib/dto/listening";
import type { ListenRecordSource } from "@/lib/constants/listen-source";
import { DayDetailsSkeleton } from "@/lib/components/skeleton-loaders";

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

const RAIL =
  "bg-gradient-to-r from-emerald-300 via-sky-400 to-violet-400";

const HERO_HEADER =
  "relative overflow-hidden rounded-b-none border-b border-sky-300/20 bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_42%,_#134e4a_100%)] px-6 pb-6 pt-6 dark:border-sky-300/15 sm:px-8 sm:pb-7 sm:pt-7";

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
    <div className="relative overflow-hidden rounded-2xl border border-sky-300/20 bg-[rgb(var(--card-rgb)/0.92)] shadow-card backdrop-blur-sm max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:backdrop-blur-none dark:border-sky-300/15 dark:bg-[rgb(var(--card-rgb)/0.9)] dark:max-lg:bg-transparent">
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-px ${RAIL} opacity-90`} />

      <header className={HERO_HEADER}>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.06)_1px,_transparent_1px),linear-gradient(90deg,_rgba(56,189,248,0.05)_1px,_transparent_1px)] bg-[size:28px_28px] opacity-40" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-6 h-40 w-40 rounded-full bg-violet-400/18 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
                <Calendar className="h-3.5 w-3.5 opacity-90" aria-hidden />
                {t("dayDetailsEyebrow")}
              </span>
              {isPeakDay ? (
                <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-100">
                  {t("peakDayBadge")}
                </span>
              ) : null}
            </div>
            <div>
              <h2
                id="heatmap-day-details-title"
                className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                {formattedDate}
              </h2>
              <p className="mt-1.5 text-sm text-sky-100/75">{shortDate}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isLoading ? (
                <span
                  className="inline-block h-9 min-w-[7rem] animate-pulse rounded-lg bg-white/15"
                  aria-hidden
                />
              ) : (
                <span className="inline-flex items-center rounded-lg border border-white/20 bg-slate-950/40 px-3 py-1.5 text-sm font-semibold text-white tabular-nums shadow-lg backdrop-blur-sm">
                  {total.toLocaleString(locale)}{" "}
                  <span className="ml-1.5 font-medium text-sky-100/85">
                    {total !== 1 ? t("listens") : t("listen")}
                  </span>
                </span>
              )}
              {vsAverage?.kind === "above" ? (
                <span className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-100/95">
                  {t("vsAvgAbove", { pct: vsAverage.pct })}
                </span>
              ) : null}
              {vsAverage?.kind === "below" ? (
                <span className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-100/95">
                  {t("vsAvgBelow", { pct: vsAverage.pct })}
                </span>
              ) : null}
              {vsAverage?.kind === "match" ? (
                <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-sky-100/90">
                  {t("vsAvgMatch")}
                </span>
              ) : null}
            </div>

            {showPeakMeter ? (
              <div className="max-w-md space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-sky-100/65">
                  <span>{t("relativeToPeak")}</span>
                  <span className="tabular-nums text-sky-50/90">
                    {peakMeterPct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-950/50 ring-1 ring-white/10">
                  <div
                    className={`h-full rounded-full ${RAIL} opacity-95 shadow-[0_0_18px_rgba(45,212,191,0.35)] transition-[width] duration-500 ease-out`}
                    style={{ width: `${peakMeterPct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-xl border border-white/15 bg-white/5 text-sky-100/90 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
            aria-label={t("closeDetails")}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="relative border-t border-sky-200/15 dark:border-sky-300/10">
        {isLoading ? (
          <div className="p-4 lg:p-8">
            <DayDetailsSkeleton />
          </div>
        ) : dayListens && dayListens.data.length > 0 ? (
          <div className="space-y-8 p-4 lg:p-8">
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
              <div className="min-w-[9.75rem] snap-start rounded-2xl border border-sky-200/25 bg-white/55 p-4 shadow-sm dark:border-sky-300/12 dark:bg-slate-950/35 lg:min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  <Music2 className="h-4 w-4 text-sky-500 dark:text-sky-300" aria-hidden />
                  {t("totalListens")}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {dayListens.total.toLocaleString(locale)}
                </p>
              </div>
              <div className="min-w-[9.75rem] snap-start rounded-2xl border border-emerald-200/25 bg-white/55 p-4 shadow-sm dark:border-emerald-300/12 dark:bg-slate-950/35 lg:min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden />
                  {t("uniqueArtists")}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {analysis.uniqueArtists.toLocaleString(locale)}
                </p>
              </div>
              <div className="min-w-[9.75rem] snap-start rounded-2xl border border-violet-200/25 bg-white/55 p-4 shadow-sm dark:border-violet-300/12 dark:bg-slate-950/35 lg:min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  <Disc3 className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden />
                  {t("uniqueTracks")}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {analysis.uniqueTracks.toLocaleString(locale)}
                </p>
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
                <Clock className="h-4 w-4 text-sky-600 dark:text-sky-300" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">
                  {t("listensByHour")}
                </h3>
              </div>
              <div
                className="flex h-24 items-end gap-px rounded-xl border border-sky-200/20 bg-white/40 px-2 pb-2 pt-3 dark:border-sky-300/10 dark:bg-slate-950/30 sm:gap-0.5 sm:px-3"
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
                        className="w-full max-w-[10px] rounded-t-sm bg-gradient-to-t from-sky-600/90 via-emerald-500/80 to-violet-500/75 opacity-90 shadow-sm transition-all group-hover:opacity-100 dark:from-sky-400 dark:via-emerald-400 dark:to-violet-400"
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
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {t("topArtists")}
                </h3>
                <ul className="space-y-2">
                  {analysis.topArtists.map(([artist, count], index) => {
                    const rankColors = [
                      "text-amber-600 dark:text-amber-300",
                      "text-slate-500 dark:text-slate-300",
                      "text-amber-800 dark:text-amber-600/90",
                    ];
                    const rankBg = [
                      "bg-amber-500/15",
                      "bg-slate-400/12",
                      "bg-amber-700/12",
                    ];
                    const rankStyle =
                      index < 3 ? rankColors[index] : "text-muted";
                    const rankBgStyle =
                      index < 3 ? rankBg[index] : "bg-surface-glass";
                    const pct =
                      total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <li
                        key={artist}
                        className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/20 bg-white/50 px-3 py-2.5 dark:border-sky-300/10 dark:bg-slate-950/25"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankStyle} ${rankBgStyle}`}
                          >
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
                          <span className="ml-1.5 text-xs text-muted">
                            ({pct}%)
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {t("topTracks")}
                </h3>
                <ul className="space-y-2">
                  {analysis.topTracks.map(([title, artist, count], index) => {
                    const rankColors = [
                      "text-amber-600 dark:text-amber-300",
                      "text-slate-500 dark:text-slate-300",
                      "text-amber-800 dark:text-amber-600/90",
                    ];
                    const rankBg = [
                      "bg-amber-500/15",
                      "bg-slate-400/12",
                      "bg-amber-700/12",
                    ];
                    const rankStyle =
                      index < 3 ? rankColors[index] : "text-muted";
                    const rankBgStyle =
                      index < 3 ? rankBg[index] : "bg-surface-glass";
                    const pct =
                      total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <li
                        key={`${title}-${artist}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/20 bg-white/50 px-3 py-2.5 dark:border-sky-300/10 dark:bg-slate-950/25"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankStyle} ${rankBgStyle}`}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {title}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {artist}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {count.toLocaleString(locale)}
                          </span>
                          <span className="ml-1.5 text-xs text-muted">
                            ({pct}%)
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {t("detailedListens")}
              </h3>
              <ul className="max-h-[22rem] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[28rem]">
                {analysis.sortedListens.map((listen) => (
                  <li
                    key={listen.id}
                    className="flex items-start gap-3 rounded-xl border border-sky-200/20 bg-white/50 px-3 py-2.5 transition-colors hover:border-sky-300/35 hover:bg-sky-400/[0.07] dark:border-sky-300/10 dark:bg-slate-950/25 dark:hover:bg-sky-400/10"
                  >
                    <div className="mt-0.5 min-w-[3.25rem] shrink-0 text-right">
                      <span className="text-xs font-semibold tabular-nums text-sky-700 dark:text-sky-200">
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
                      <p className="truncate text-xs text-muted">
                        {listen.artistName}
                      </p>
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
          <div className="p-4 lg:p-8">{emptyStateNoPlays}</div>
        ) : null}
      </div>
    </div>
  );
}
