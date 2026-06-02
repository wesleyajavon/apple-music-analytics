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
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BADGE_CYAN_COMPACT,
  DASHBOARD_SPOTLIGHT_BADGE_DOT_CYAN,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { useArtistUserInsights } from "@/lib/hooks/use-artists";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { ErrorState } from "@/lib/components/error-state";
import { useTheme } from "@/lib/providers/theme-provider";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";

const PANEL_DRAWER_SHELL =
  "relative flex min-h-0 w-full flex-col overflow-hidden border-slate-200/90 bg-white text-slate-900 ring-1 ring-black/[0.04] dark:border-white/10 dark:bg-slate-950 dark:text-white dark:ring-0 max-lg:max-h-[min(92dvh,720px)] max-lg:overflow-y-auto max-lg:rounded-t-[1.75rem] max-lg:border-t max-lg:shadow-[0_-16px_48px_rgba(15,23,42,0.12)] lg:h-full lg:max-w-lg lg:border-l lg:shadow-[-28px_0_80px_rgba(15,23,42,0.1)] lg:rounded-l-[1.75rem] dark:max-lg:shadow-[0_-16px_48px_rgba(0,0,0,0.35)] dark:lg:shadow-[-32px_0_96px_rgba(0,0,0,0.45)]";

const INSIGHT_CARD =
  "rounded-2xl border border-slate-200/80 bg-slate-50/80 shadow-sm shadow-slate-900/[0.04] dark:border-white/10 dark:bg-black/25 dark:shadow-none";

const INSIGHT_CARD_SOLID =
  "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none";

const INSIGHT_SECTION_TITLE = "text-sm font-semibold text-slate-900 dark:text-white";

function formatPlaySeconds(seconds: number, notAvailable: string): string {
  if (seconds <= 0) return notAvailable;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
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
    const firstLast = query.data?.artist ?? previewArtist;

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
        ? `${String(query.data.peakListenHour.hour).padStart(2, "0")}:00 · ${query.data.peakListenHour.listens.toLocaleString(locale)} ${t("listensCount")}`
        : null;

    const peakWeekdayLabel =
      query.data?.peakWeekday != null
        ? `${weekdayShortMonFirst(query.data.peakWeekday.weekdayIndexMondayFirst, locale)} · ${query.data.peakWeekday.listens.toLocaleString(locale)} ${t("listensCount")}`
        : null;

    const busiestLine =
      query.data?.busiestDay != null
        ? t("insightsBusiestMeta", {
            date: new Date(query.data.busiestDay.date + "T12:00:00.000Z").toLocaleDateString(locale, {
              weekday: "long",
              month: "short",
              day: "numeric",
            }),
            listens: query.data.busiestDay.listens.toLocaleString(locale),
          })
        : null;

    const firstListenMoment = firstLast
      ? {
          weekday: new Date(firstLast.firstListenDate).toLocaleDateString(locale, { weekday: "long" }),
          dateLine: new Date(firstLast.firstListenDate).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        }
      : null;
    const lastListenMoment = firstLast
      ? {
          weekday: new Date(firstLast.lastListenDate).toLocaleDateString(locale, { weekday: "long" }),
          dateLine: new Date(firstLast.lastListenDate).toLocaleDateString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        }
      : null;

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
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          <div
            className="mx-auto mb-1 mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300/80 dark:bg-white/20 lg:hidden"
            aria-hidden
          />
          <div className={`pointer-events-none absolute inset-0 ${DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY}`} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />

          <div
            className={`relative z-10 flex items-start justify-between gap-3 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} bg-white/90 px-5 py-4 backdrop-blur-md sm:px-6 dark:bg-slate-950/80`}
          >
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="relative shrink-0 overflow-hidden rounded-2xl ring-1 ring-slate-200/90 shadow-sm dark:ring-white/12 dark:shadow-none">
                {displayArtist ? (
                  <ArtistAvatarHydrated
                    artistId={artistId}
                    artistName={displayArtist.artistName}
                    imageUrl={displayArtist.imageUrl}
                    avatarApiSize={128}
                    colorIndex={colorIndex}
                    alt=""
                    width={76}
                    height={76}
                    className="h-[76px] w-[76px] object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className={`mb-2 w-fit ${DASHBOARD_SPOTLIGHT_BADGE_CYAN_COMPACT}`}>
                  <span className={DASHBOARD_SPOTLIGHT_BADGE_DOT_CYAN} aria-hidden />
                  {t("insightsEyebrow")}
                </div>
                <h2
                  id={headingId}
                  className="truncate text-lg font-semibold tracking-[-0.04em] text-slate-900 sm:text-xl dark:text-white"
                >
                  {displayArtist?.artistName ?? previewArtist.artistName}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-violet-200/90 bg-violet-50/90 px-2.5 py-1 text-xs font-semibold text-violet-800 dark:border-violet-300/25 dark:bg-violet-300/10 dark:text-violet-100">
                    {(displayArtist?.listenCount ?? previewArtist.listenCount).toLocaleString(locale)} {t("listensCount")}
                  </span>
                  <span className="rounded-full border border-cyan-200/90 bg-cyan-50/90 px-2.5 py-1 text-xs font-semibold text-cyan-900 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100">
                    {(displayArtist?.uniqueTracks ?? previewArtist.uniqueTracks).toLocaleString(locale)}{" "}
                    {t("insightsUniqueTracksShort")}
                  </span>
                  {displayArtist?.totalPlayTime != null ? (
                    <span className="rounded-full border border-lime-200/90 bg-lime-50/90 px-2.5 py-1 text-xs font-semibold text-lime-900 dark:border-lime-300/25 dark:bg-lime-300/10 dark:text-lime-100">
                      ≈{" "}
                      {formatPlaySeconds(displayArtist.totalPlayTime, t("insightsEstPlayTimeUnavailable"))}{" "}
                      {t("insightsEstPlayTimeHint")}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl p-0 ${DASHBOARD_SPOTLIGHT_BTN_SECONDARY}`}
              aria-label={t("insightsCloseAria")}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 [scrollbar-gutter:stable]">
            {firstLast && firstListenMoment && lastListenMoment ? (
              <section className={`mb-6 ${INSIGHT_CARD} p-4 sm:p-5`} aria-label={t("insightsTimelineTitle")}>
                <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
                  {t("insightsTimelineTitle")}
                </h3>
                <p className={`mt-1.5 text-xs leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                  {t("insightsTimelineLead")}
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-violet-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-900/[0.04] dark:border-violet-400/20 dark:bg-white/[0.04] dark:shadow-none">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-800 dark:text-violet-200/90">
                      {t("insightsFirstListenLabel")}
                    </p>
                    <p className="mt-3 text-xl font-bold tabular-nums leading-none tracking-tight text-slate-900 dark:text-white">
                      {firstListenMoment.dateLine}
                    </p>
                    <p className="mt-2 text-sm font-medium capitalize text-violet-950/75 dark:text-violet-100/80">
                      {firstListenMoment.weekday}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/80 bg-white px-4 py-4 shadow-sm shadow-slate-900/[0.04] dark:border-cyan-400/22 dark:bg-white/[0.04] dark:shadow-none">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-cyan-100/90">
                      {t("insightsMostRecentListenLabel")}
                    </p>
                    <p className="mt-3 text-xl font-bold tabular-nums leading-none tracking-tight text-slate-900 dark:text-white">
                      {lastListenMoment.dateLine}
                    </p>
                    <p className="mt-2 text-sm font-medium capitalize text-cyan-950/75 dark:text-cyan-100/85">
                      {lastListenMoment.weekday}
                    </p>
                  </div>
                </div>
                <p className={`mt-3 text-[11px] leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                  {t("insightsTimelineFootnote")}
                </p>
              </section>
            ) : null}

            {query.isLoading ? (
              <div className="space-y-4" aria-busy="true">
                <div className="h-24 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                <div className="h-40 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
                <div className="h-36 animate-pulse rounded-2xl bg-slate-200/90 dark:bg-white/[0.07]" />
              </div>
            ) : null}

            {query.error ? (
              <ErrorState error={query.error} message={t("insightsLoadError")} onRetry={() => query.refetch()} />
            ) : null}

            {query.data ? (
              <div className="space-y-8">
                <section>
                  <h3 className={INSIGHT_SECTION_TITLE}>{t("insightsPeaksTitle")}</h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-violet-200/85 bg-white px-3 py-2.5 shadow-sm shadow-slate-900/[0.04] dark:border-violet-400/18 dark:bg-white/[0.04] dark:shadow-none">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-100/80">
                        {t("insightsPeakHour")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {peakHourLabel ?? t("insightsNoSignal")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-200/85 bg-white px-3 py-2.5 shadow-sm shadow-slate-900/[0.04] dark:border-cyan-400/18 dark:bg-white/[0.04] dark:shadow-none">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-100/80">
                        {t("insightsPeakWeekday")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {peakWeekdayLabel ?? t("insightsNoSignal")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-lime-200/90 bg-white px-3 py-2.5 shadow-sm shadow-slate-900/[0.04] dark:border-lime-400/18 dark:bg-white/[0.04] dark:shadow-none sm:col-span-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-lime-900 dark:text-lime-100/80">
                        {t("insightsBusiestCalendarDay")}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {busiestLine ?? t("insightsNoSignal")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className={`${INSIGHT_CARD_SOLID} px-3 py-2 text-center`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t("insightsActiveDays")}
                      </p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                        {query.data.activeListeningDays.toLocaleString(locale)}
                      </p>
                    </div>
                    <div className={`${INSIGHT_CARD_SOLID} px-3 py-2 text-center`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t("insightsSpanDays")}
                      </p>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900 dark:text-white">
                        {query.data.listeningSpanDays.toLocaleString(locale)}
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

                <section>
                  <h3 className={INSIGHT_SECTION_TITLE}>{t("insightsTopTracks")}</h3>
                  <ol className="mt-3 space-y-2">
                    {query.data.topTracks.slice(0, 12).map((tr, idx) => (
                      <li
                        key={tr.trackId}
                        className={`flex items-baseline gap-3 px-3 py-2 ${INSIGHT_CARD_SOLID}`}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/12 to-cyan-500/12 text-xs font-semibold text-violet-800 ring-1 ring-slate-200/80 dark:text-violet-100 dark:ring-white/10">
                          {idx + 1}
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
        </aside>
      </div>
    );
  }
);

ArtistUserInsightsPanel.displayName = "ArtistUserInsightsPanel";
