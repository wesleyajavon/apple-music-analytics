"use client";

import { memo, useEffect, useId, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { X } from "lucide-react";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import {
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import type { ArtistSignatureTrackDto, ArtistStatsDto } from "@/lib/dto/artist";
import { useArtistUserInsights } from "@/lib/hooks/use-artists";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { LiveStatusDot } from "@/lib/components/live-status-dot";
import { ErrorState } from "@/lib/components/error-state";
import { useTheme } from "@/lib/providers/theme-provider";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";

const PANEL_DRAWER_SHELL =
  "relative flex min-h-0 w-full flex-col overflow-hidden border-slate-200/90 bg-white text-slate-900 ring-1 ring-black/[0.04] dark:border-white/10 dark:bg-slate-950 dark:text-white dark:ring-0 max-lg:max-h-[min(92dvh,720px)] max-lg:overflow-y-auto max-lg:rounded-t-[1.75rem] max-lg:border-t max-lg:shadow-[0_-16px_48px_rgba(15,23,42,0.12)] lg:h-full lg:max-w-lg lg:border-l lg:shadow-[-28px_0_80px_rgba(15,23,42,0.1)] lg:rounded-l-[1.75rem] dark:max-lg:shadow-[0_-16px_48px_rgba(0,0,0,0.35)] dark:lg:shadow-[-32px_0_96px_rgba(0,0,0,0.45)]";

const INSIGHT_CARD_SOLID =
  "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none";

const INSIGHT_SECTION_TITLE = "text-sm font-semibold text-slate-900 dark:text-white";

const TOP_TRACKS_LIMIT = 12;

function hasUsableListenDate(isoDate: string | undefined): boolean {
  if (!isoDate) return false;
  return Number.isFinite(Date.parse(isoDate));
}

function formatPlaySeconds(seconds: number, notAvailable: string): string {
  if (seconds <= 0) return notAvailable;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function trackSharePercent(trackListens: number, artistListens: number): number | null {
  if (artistListens <= 0 || trackListens <= 0) return null;
  const raw = (trackListens / artistListens) * 100;
  if (raw < 1) return 1;
  return Math.min(100, Math.round(raw));
}

/** Libellés des champs Listen.source pour l’historique agrégé. */
function localizedListenSource(source: string, t: ReturnType<typeof useTranslations>): string {
  switch (source) {
    case "lastfm":
      return t("sourceLastfm");
    case "apple_music_replay":
      return t("sourceAppleReplay");
    case "spotify_export":
      return t("sourceSpotifyExport");
    case "spotify_web_api":
      return t("sourceSpotifyWebApi");
    case "apple_music_export":
      return t("sourceAppleMusicExport");
    default:
      return source.replace(/_/g, " ");
  }
}

/** Lundi premier : index 0 = lundi … 6 = dimanche (2024-01-08 = lundi UTC). */
function weekdayShortMonFirst(index: number, locale: string): string {
  const base = Date.UTC(2024, 0, 8 + index);
  return new Date(base).toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" });
}

export const ArtistUserInsightsPanel = memo(
  ({
    open,
    artistId,
    previewArtist,
    startDate,
    endDate,
    userId,
    locale,
    onClose,
    colorIndex,
  }: {
    open: boolean;
    artistId: string | null;
    previewArtist: ArtistStatsDto | null;
    startDate?: string;
    endDate?: string;
    userId?: string;
    locale: string;
    onClose: () => void;
    /** Index pour teinte d’avatar fallback (liste « All your artists »). */
    colorIndex: number;
  }) => {
    const t = useTranslations("artists");
    const headingId = useId();
    const chartNs = useId().replace(/:/g, "");
    const closeRef = useRef<HTMLButtonElement>(null);
    const { resolvedTheme } = useTheme();
    const chartTheme = DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
    const isLgChart = useIsLgChartViewport();
    const chartTooltipStyles = useMemo(() => {
      if (resolvedTheme === "dark") {
        return {
          contentStyle: {
            backgroundColor: "rgb(15 23 42)",
            border: "1px solid rgba(148, 163, 184, 0.22)",
            borderRadius: "12px",
            boxShadow: "0 16px 48px -12px rgba(0, 0, 0, 0.55)",
            padding: "12px 16px",
          },
          labelStyle: {
            color: "#f1f5f9",
            fontWeight: 600,
            marginBottom: "6px",
          },
          itemStyle: {
            color: "#cbd5e1",
            fontSize: "13px",
          },
        };
      }
      return {
        contentStyle: { ...CHART_TOOLTIP_STYLES.contentStyle },
        labelStyle: { ...CHART_TOOLTIP_STYLES.labelStyle },
        itemStyle: { ...CHART_TOOLTIP_STYLES.itemStyle },
      };
    }, [resolvedTheme]);

    const query = useArtistUserInsights(open ? artistId : null, startDate, endDate, userId, {
      enabled: open && !!artistId,
    });

    useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    useEffect(() => {
      if (open) {
        queueMicrotask(() => closeRef.current?.focus());
      }
    }, [open, artistId]);

    const displayArtist = query.data?.artist ?? previewArtist;

    const displayedTracks = useMemo((): ArtistSignatureTrackDto[] => {
      if (query.data?.topTracks?.length) {
        return query.data.topTracks.slice(0, TOP_TRACKS_LIMIT);
      }
      const preview = previewArtist?.signatureTrack;
      return preview ? [preview] : [];
    }, [query.data?.topTracks, previewArtist?.signatureTrack]);

    const featuredTrack = displayedTracks[0] ?? null;
    const restTracks = displayedTracks.slice(1);
    const featuredShare =
      featuredTrack && displayArtist
        ? trackSharePercent(featuredTrack.listenCount, displayArtist.listenCount)
        : null;

    const weekdayChartData = useMemo(() => {
      const rows = query.data?.listensByWeekday;
      if (!rows) return [];
      return rows.map((w) => ({
        label: weekdayShortMonFirst(w.weekdayIndexMondayFirst, locale),
        listens: w.listens,
      }));
    }, [query.data?.listensByWeekday, locale]);

    const hourChartData = useMemo(() => {
      const rows = query.data?.listensByHour;
      if (!rows) return [];
      return rows.map((h) => ({
        label: `${String(h.hour).padStart(2, "0")}:00`,
        listens: h.listens,
      }));
    }, [query.data?.listensByHour]);

    const peakHourLabel =
      query.data?.peakListenHour != null
        ? `${String(query.data.peakListenHour.hour).padStart(2, "0")}:00`
        : null;

    const peakWeekdayLabel =
      query.data?.peakWeekday != null
        ? weekdayShortMonFirst(query.data.peakWeekday.weekdayIndexMondayFirst, locale)
        : null;

    const formatListenDate = (isoDate: string) =>
      new Date(isoDate).toLocaleDateString(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    const busiestDayLabel =
      query.data?.busiestDay != null ? formatListenDate(query.data.busiestDay.date + "T12:00:00.000Z") : null;

    if (!open || !previewArtist || !artistId) return null;

    return (
      <div className="fixed inset-0 z-[80] flex flex-col justify-end lg:flex-row lg:justify-end">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/20 backdrop-blur-[3px] transition-colors dark:bg-black/50 dark:backdrop-blur-sm"
          aria-label={t("insightsCloseAria")}
          onClick={onClose}
        />

        <aside
          className={`z-[81] ${PANEL_DRAWER_SHELL}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          style={{
            paddingBottom: "max(0px, env(safe-area-inset-bottom))",
            marginBottom: isLgChart ? undefined : `var(${DASHBOARD_BOTTOM_NAV_OFFSET_VAR}, 0px)`,
          }}
        >
          <div className="relative z-10 h-[10.5rem] shrink-0 overflow-hidden lg:h-[12.5rem]">
            <div
              className="absolute left-1/2 top-2 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70 shadow-sm lg:hidden"
              aria-hidden
            />
            {displayArtist ? (
              <ArtistAvatarHydrated
                artistId={artistId}
                artistName={displayArtist.artistName}
                imageUrl={displayArtist.imageUrl}
                avatarApiSize={512}
                colorIndex={colorIndex}
                alt={displayArtist.artistName}
                width={512}
                height={512}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/15"
              aria-hidden
            />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black/40 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-md hover:bg-black/55"
              aria-label={t("insightsCloseAria")}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-4 pt-10 sm:px-6">
              <div className="mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                <LiveStatusDot tone="cyan" />
                {t("insightsEyebrow")}
              </div>
              <h2
                id={headingId}
                className="truncate text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl"
              >
                {displayArtist?.artistName ?? previewArtist.artistName}
              </h2>
              <p className="mt-1 text-sm font-semibold tabular-nums text-white/80">
                {(displayArtist?.listenCount ?? previewArtist.listenCount).toLocaleString(locale)}{" "}
                {t("listensCount")}
              </p>
            </div>
          </div>

          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 [scrollbar-gutter:stable]">
            <div className={`pointer-events-none absolute inset-0 ${DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY}`} aria-hidden />
            <div className="relative space-y-6">
              <section aria-label={t("insightsTopTracks")}>
                <h3 className={INSIGHT_SECTION_TITLE}>{t("insightsTopTracks")}</h3>

                {featuredTrack ? (
                  <article className="mt-3 overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-cyan-50/70 p-4 shadow-sm shadow-violet-950/5 dark:border-violet-300/20 dark:from-violet-500/15 dark:via-slate-950/40 dark:to-cyan-500/10 dark:shadow-none">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">
                      {t("insightsTopTrackLabel")}
                    </p>
                    <div className="mt-2 flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-base font-black text-white shadow-md shadow-violet-500/25">
                        1
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold leading-snug tracking-[-0.02em] text-slate-900 dark:text-white sm:text-lg">
                          {featuredTrack.title}
                        </h4>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-cyan-800 dark:text-cyan-200">
                          {featuredTrack.listenCount.toLocaleString(locale)} {t("listensCount")}
                          {featuredShare != null ? (
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              {" · "}
                              {t("insightsTopTrackShare", { share: featuredShare })}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    {featuredShare != null ? (
                      <div
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-200/70 dark:bg-white/10"
                        aria-hidden
                      >
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                          style={{ width: `${featuredShare}%` }}
                        />
                      </div>
                    ) : null}
                  </article>
                ) : query.isLoading ? (
                  <div className="mt-3 h-28 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                ) : null}

                {restTracks.length > 0 ? (
                  <ol className="mt-2 space-y-2">
                    {restTracks.map((tr, idx) => (
                      <li
                        key={tr.trackId}
                        className={`flex items-center gap-3 px-3 py-2.5 ${INSIGHT_CARD_SOLID}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/80 dark:bg-white/[0.06] dark:text-slate-200 dark:ring-white/10">
                          {idx + 2}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-slate-50">
                          {tr.title}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-cyan-700 dark:text-cyan-200">
                          {tr.listenCount.toLocaleString(locale)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {query.isLoading && featuredTrack ? (
                  <div className="mt-2 space-y-2" aria-busy="true">
                    <div className="h-11 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                    <div className="h-11 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                    <div className="h-11 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                  </div>
                ) : null}
              </section>

              {displayArtist && hasUsableListenDate(displayArtist.firstListenDate) ? (
                <section
                  className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200/80 dark:border-white/10 dark:bg-white/10"
                  aria-label={t("insightsTimelineTitle")}
                >
                  <div className="bg-white px-4 py-3 dark:bg-slate-950/90">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300/85">
                      {t("insightsFirstListenLabel")}
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize leading-snug text-slate-900 dark:text-white">
                      {formatListenDate(displayArtist.firstListenDate)}
                    </p>
                  </div>
                  <div className="bg-white px-4 py-3 dark:bg-slate-950/90">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300/85">
                      {t("insightsMostRecentListenLabel")}
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize leading-snug text-slate-900 dark:text-white">
                      {formatListenDate(displayArtist.lastListenDate)}
                    </p>
                  </div>
                  <div className="bg-white px-4 py-3 dark:bg-slate-950/90">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-200/85">
                      {t("insightsUniqueTracksShort")}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {displayArtist.uniqueTracks.toLocaleString(locale)}
                    </p>
                  </div>
                  <div className="bg-white px-4 py-3 dark:bg-slate-950/90">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-lime-700 dark:text-lime-300/85">
                      {t("insightsEstPlayTimeShort")}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      ≈ {formatPlaySeconds(displayArtist.totalPlayTime, t("insightsEstPlayTimeUnavailable"))}
                    </p>
                  </div>
                </section>
              ) : null}

              {query.error ? (
                <ErrorState error={query.error} message={t("insightsLoadError")} onRetry={() => query.refetch()} />
              ) : null}

              {query.isLoading && !query.data ? (
                <div className="space-y-3" aria-busy="true">
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                  <div className="h-40 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                </div>
              ) : null}

              {query.data ? (
                <div className="space-y-8">
                  <section aria-labelledby={`${headingId}-when`}>
                    <h3 id={`${headingId}-when`} className={`mb-3 ${INSIGHT_SECTION_TITLE}`}>
                      {t("insightsWhenYouListen")}
                    </h3>
                    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-200/80 sm:grid-cols-6 dark:border-white/10 dark:bg-white/10">
                      <div className="bg-white px-4 py-3 sm:col-span-2 dark:bg-slate-950/90">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-lime-700 dark:text-lime-300/85">
                          {t("insightsBusiestCalendarDay")}
                        </p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                          {busiestDayLabel ?? t("insightsNoSignal")}
                        </p>
                      </div>
                      <div className="bg-white px-4 py-3 sm:col-span-2 dark:bg-slate-950/90">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300/85">
                          {t("insightsPeakHour")}
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {peakHourLabel ?? t("insightsNoSignal")}
                        </p>
                      </div>
                      <div className="bg-white px-4 py-3 sm:col-span-2 dark:bg-slate-950/90">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300/85">
                          {t("insightsPeakWeekday")}
                        </p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-900 dark:text-white">
                          {peakWeekdayLabel ?? t("insightsNoSignal")}
                        </p>
                      </div>
                      <div className="bg-white px-4 py-3 sm:col-span-3 dark:bg-slate-950/90">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300/85">
                          {t("insightsActiveDays")}
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {t("insightsDaysValue", {
                            count: query.data.activeListeningDays,
                          })}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {t("insightsActiveDaysHint")}
                        </p>
                      </div>
                      <div className="bg-white px-4 py-3 sm:col-span-3 dark:bg-slate-950/90">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300/85">
                          {t("insightsSpanDays")}
                        </p>
                        <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {t("insightsDaysValue", {
                            count: query.data.listeningSpanDays,
                          })}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {t("insightsSpanDaysHint")}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className={`mb-3 ${INSIGHT_SECTION_TITLE}`}>{t("insightsByHour")}</h3>
                    <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
                      <ChartResponsiveContainer token="insightsHourBar">
                          <BarChart data={hourChartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`insHourBar-${chartNs}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#06b6d4" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={chartTheme.grid}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: chartTheme.tick, fontSize: isLgChart ? 9 : 8 }}
                              interval={isLgChart ? 3 : 5}
                              axisLine={false}
                              tickLine={false}
                              height={isLgChart ? 32 : 28}
                            />
                            <YAxis
                              tick={{ fill: chartTheme.tick, fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              width={36}
                            />
                            <Tooltip
                              contentStyle={chartTooltipStyles.contentStyle}
                              labelStyle={chartTooltipStyles.labelStyle}
                              itemStyle={chartTooltipStyles.itemStyle}
                              formatter={(v: number) => [`${v.toLocaleString(locale)} ${t("listensCount")}`, t("listensLabel")]}
                            />
                            <Bar
                              dataKey="listens"
                              fill={`url(#insHourBar-${chartNs})`}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={10}
                            />
                          </BarChart>
                      </ChartResponsiveContainer>
                    </div>
                  </section>

                  <section>
                    <h3 className={`mb-3 ${INSIGHT_SECTION_TITLE}`}>{t("insightsByWeekday")}</h3>
                    <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
                      <ChartResponsiveContainer token="insightsWeekdayBar">
                          <BarChart data={weekdayChartData} margin={{ top: 4, right: 4, left: -18, bottom: 4 }}>
                            <defs>
                              <linearGradient id={`insWeekdayBar-${chartNs}`} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#84cc16" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={chartTheme.grid}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fill: chartTheme.tick, fontSize: isLgChart ? 10 : 9 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: chartTheme.tick, fontSize: isLgChart ? 10 : 9 }}
                              axisLine={false}
                              tickLine={false}
                              width={isLgChart ? 36 : 32}
                            />
                            <Tooltip
                              contentStyle={chartTooltipStyles.contentStyle}
                              labelStyle={chartTooltipStyles.labelStyle}
                              itemStyle={chartTooltipStyles.itemStyle}
                              formatter={(v: number) => [`${v.toLocaleString(locale)} ${t("listensCount")}`, t("listensLabel")]}
                            />
                            <Bar
                              dataKey="listens"
                              fill={`url(#insWeekdayBar-${chartNs})`}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={isLgChart ? 28 : 22}
                            />
                          </BarChart>
                      </ChartResponsiveContainer>
                    </div>
                  </section>

                  {query.data.listensBySource.length > 1 ? (
                    <section>
                      <h3 className={INSIGHT_SECTION_TITLE}>{t("insightsSources")}</h3>
                      <ul className="mt-3 space-y-2">
                        {query.data.listensBySource.map((row) => (
                          <li
                            key={row.source}
                            className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${INSIGHT_CARD_SOLID}`}
                          >
                            <span className="min-w-0 truncate font-medium text-slate-800 dark:text-slate-200">
                              {localizedListenSource(row.source, t)}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">
                              {row.listens.toLocaleString(locale)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <p className={`text-[11px] leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("insightsFootnoteTz")}</p>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    );
  }
);

ArtistUserInsightsPanel.displayName = "ArtistUserInsightsPanel";
