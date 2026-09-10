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
import { CRYSTAL_CHART_AXIS, getCrystalSeriesColor } from "@/lib/constants/crystal-chart";
import type { ArtistSignatureTrackDto, ArtistStatsDto } from "@/lib/dto/artist";
import { useArtistUserInsights } from "@/lib/hooks/use-artists";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { ErrorState } from "@/lib/components/error-state";
import { useTheme } from "@/lib/providers/theme-provider";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { useIsLgChartViewport } from "@/lib/hooks/use-chart-viewport";
import { DASHBOARD_BOTTOM_NAV_OFFSET_VAR } from "@/lib/constants/dashboard-chrome";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
} from "@/lib/components/dashboard-ui";

const PANEL_DRAWER_SHELL =
  "relative flex min-h-0 w-full flex-col overflow-hidden border-slate-200/90 bg-white text-slate-900 ring-1 ring-black/[0.04] dark:border-white/10 dark:bg-slate-950 dark:text-white dark:ring-0 max-lg:max-h-[min(92dvh,720px)] max-lg:overflow-y-auto max-lg:rounded-t-[1.75rem] max-lg:border-t max-lg:shadow-[0_-16px_48px_rgba(15,23,42,0.12)] lg:h-full lg:max-w-lg lg:border-l lg:shadow-[-28px_0_80px_rgba(15,23,42,0.1)] lg:rounded-l-[1.75rem] dark:max-lg:shadow-[0_-16px_48px_rgba(0,0,0,0.35)] dark:lg:shadow-[-32px_0_96px_rgba(0,0,0,0.45)]";

const INSIGHT_SECTION_TITLE = "text-sm font-semibold text-foreground";

const TOP_TRACKS_LIMIT = 12;

const INSIGHTS_CHART_OVERFLOW =
  "overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible";
const INSIGHTS_Y_AXIS_WIDTH = 36;
const INSIGHTS_BAR_CHART_MARGIN = {
  top: 4,
  right: 4,
  left: 0,
  bottom: 0,
} as const;

function formatInsightsAxisCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

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
    subjectName,
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
    /** When set (e.g. Duet friend music), eyebrow uses this listener’s name instead of “Your streaming”. */
    subjectName?: string;
  }) => {
    const t = useTranslations("artists");
    const headingId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    const { resolvedTheme } = useTheme();
    const themeName = resolvedTheme === "dark" ? "dark" : "light";
    const chartTheme = CRYSTAL_CHART_AXIS[themeName];
    const barFill = getCrystalSeriesColor(0, themeName);
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
              <p className="text-[13px] font-medium text-white/80">
                {subjectName
                  ? t("insightsEyebrowForSubject", { name: subjectName })
                  : t("insightsEyebrow")}
              </p>
              <h2
                id={headingId}
                className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl"
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
            <div className="space-y-8">
              <section aria-label={t("insightsTopTracks")}>
                <h3 className={INSIGHT_SECTION_TITLE}>{t("insightsTopTracks")}</h3>

                {featuredTrack ? (
                  <div className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} mt-3`}>
                    <span className="w-6 shrink-0 text-[13px] font-semibold tabular-nums text-muted">1</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-muted">{t("insightsTopTrackLabel")}</p>
                      <h4 className="truncate text-[15px] font-semibold text-foreground">{featuredTrack.title}</h4>
                      <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-foreground">
                        {featuredTrack.listenCount.toLocaleString(locale)} {t("listensCount")}
                        {featuredShare != null ? (
                          <span className="font-medium text-muted">
                            {" · "}
                            {t("insightsTopTrackShare", { share: featuredShare })}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ) : query.isLoading ? (
                  <div className="mt-3 h-11 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                ) : null}

                {restTracks.length > 0 ? (
                  <ol>
                    {restTracks.map((tr, idx) => (
                      <li key={tr.trackId} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
                        <span className="w-6 shrink-0 text-[13px] font-semibold tabular-nums text-muted">
                          {idx + 2}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                          {tr.title}
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                          {tr.listenCount.toLocaleString(locale)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : null}

                {query.isLoading && featuredTrack ? (
                  <div className="mt-2 space-y-2" aria-busy="true">
                    <div className="h-11 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                    <div className="h-11 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                    <div className="h-11 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                  </div>
                ) : null}
              </section>

              {displayArtist && hasUsableListenDate(displayArtist.firstListenDate) ? (
                <section aria-label={t("insightsTimelineTitle")}>
                  <div className={`${DASHBOARD_METRIC_STRIP} w-full flex-wrap`}>
                    <div className={DASHBOARD_METRIC_CELL}>
                      <span className={DASHBOARD_METRIC_LABEL}>{t("insightsFirstListenLabel")}</span>
                      <span className={`${DASHBOARD_METRIC_VALUE} capitalize`}>
                        {formatListenDate(displayArtist.firstListenDate)}
                      </span>
                    </div>
                    <div className={DASHBOARD_METRIC_CELL}>
                      <span className={DASHBOARD_METRIC_LABEL}>{t("insightsMostRecentListenLabel")}</span>
                      <span className={`${DASHBOARD_METRIC_VALUE} capitalize`}>
                        {formatListenDate(displayArtist.lastListenDate)}
                      </span>
                    </div>
                    <div className={DASHBOARD_METRIC_CELL}>
                      <span className={DASHBOARD_METRIC_LABEL}>{t("insightsUniqueTracksShort")}</span>
                      <span className={DASHBOARD_METRIC_VALUE}>
                        {displayArtist.uniqueTracks.toLocaleString(locale)}
                      </span>
                    </div>
                    <div className={DASHBOARD_METRIC_CELL}>
                      <span className={DASHBOARD_METRIC_LABEL}>{t("insightsEstPlayTimeShort")}</span>
                      <span className={DASHBOARD_METRIC_VALUE}>
                        ≈ {formatPlaySeconds(displayArtist.totalPlayTime, t("insightsEstPlayTimeUnavailable"))}
                      </span>
                    </div>
                  </div>
                </section>
              ) : null}

              {query.error ? (
                <ErrorState error={query.error} message={t("insightsLoadError")} onRetry={() => query.refetch()} />
              ) : null}

              {query.isLoading && !query.data ? (
                <div className="space-y-3" aria-busy="true">
                  <div className="h-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                  <div className="h-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                </div>
              ) : null}

              {query.data ? (
                <div className="space-y-8">
                  <section aria-labelledby={`${headingId}-when`}>
                    <h3 id={`${headingId}-when`} className={`mb-3 ${INSIGHT_SECTION_TITLE}`}>
                      {t("insightsWhenYouListen")}
                    </h3>
                    <div className={`${DASHBOARD_METRIC_STRIP} w-full flex-wrap`}>
                      <div className={DASHBOARD_METRIC_CELL}>
                        <span className={DASHBOARD_METRIC_LABEL}>{t("insightsBusiestCalendarDay")}</span>
                        <span className={`${DASHBOARD_METRIC_VALUE} capitalize`}>
                          {busiestDayLabel ?? t("insightsNoSignal")}
                        </span>
                      </div>
                      <div className={DASHBOARD_METRIC_CELL}>
                        <span className={DASHBOARD_METRIC_LABEL}>{t("insightsPeakHour")}</span>
                        <span className={DASHBOARD_METRIC_VALUE}>{peakHourLabel ?? t("insightsNoSignal")}</span>
                      </div>
                      <div className={DASHBOARD_METRIC_CELL}>
                        <span className={DASHBOARD_METRIC_LABEL}>{t("insightsPeakWeekday")}</span>
                        <span className={`${DASHBOARD_METRIC_VALUE} capitalize`}>
                          {peakWeekdayLabel ?? t("insightsNoSignal")}
                        </span>
                      </div>
                      <div className={DASHBOARD_METRIC_CELL}>
                        <span className={DASHBOARD_METRIC_LABEL}>{t("insightsActiveDays")}</span>
                        <span className={DASHBOARD_METRIC_VALUE}>
                          {t("insightsDaysValue", { count: query.data.activeListeningDays })}
                        </span>
                      </div>
                      <div className={DASHBOARD_METRIC_CELL}>
                        <span className={DASHBOARD_METRIC_LABEL}>{t("insightsSpanDays")}</span>
                        <span className={DASHBOARD_METRIC_VALUE}>
                          {t("insightsDaysValue", { count: query.data.listeningSpanDays })}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className={`mb-3 ${INSIGHT_SECTION_TITLE}`}>{t("insightsByHour")}</h3>
                    <ChartResponsiveContainer token="insightsHourBar" className={INSIGHTS_CHART_OVERFLOW}>
                      <BarChart data={hourChartData} margin={INSIGHTS_BAR_CHART_MARGIN} barCategoryGap={2}>
                        <CartesianGrid strokeDasharray="0" stroke={chartTheme.grid} vertical={false} />
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
                          width={INSIGHTS_Y_AXIS_WIDTH}
                          tickMargin={4}
                          allowDecimals={false}
                          domain={[0, "dataMax"]}
                          tickFormatter={(value: number) => formatInsightsAxisCount(value, locale)}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyles.contentStyle}
                          labelStyle={chartTooltipStyles.labelStyle}
                          itemStyle={chartTooltipStyles.itemStyle}
                          formatter={(v: number) => [`${v.toLocaleString(locale)} ${t("listensCount")}`, t("listensLabel")]}
                        />
                        <Bar dataKey="listens" fill={barFill} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ChartResponsiveContainer>
                  </section>

                  <section>
                    <h3 className={`mb-3 ${INSIGHT_SECTION_TITLE}`}>{t("insightsByWeekday")}</h3>
                    <ChartResponsiveContainer token="insightsWeekdayBar" className={INSIGHTS_CHART_OVERFLOW}>
                      <BarChart data={weekdayChartData} margin={INSIGHTS_BAR_CHART_MARGIN} barCategoryGap="10%">
                        <CartesianGrid strokeDasharray="0" stroke={chartTheme.grid} vertical={false} />
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
                          width={INSIGHTS_Y_AXIS_WIDTH}
                          tickMargin={4}
                          allowDecimals={false}
                          domain={[0, "dataMax"]}
                          tickFormatter={(value: number) => formatInsightsAxisCount(value, locale)}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyles.contentStyle}
                          labelStyle={chartTooltipStyles.labelStyle}
                          itemStyle={chartTooltipStyles.itemStyle}
                          formatter={(v: number) => [`${v.toLocaleString(locale)} ${t("listensCount")}`, t("listensLabel")]}
                        />
                        <Bar dataKey="listens" fill={barFill} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ChartResponsiveContainer>
                  </section>

                  {query.data.listensBySource.length > 1 ? (
                    <section>
                      <h3 className={INSIGHT_SECTION_TITLE}>{t("insightsSources")}</h3>
                      <ul className="mt-3">
                        {query.data.listensBySource.map((row) => (
                          <li key={row.source} className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR}`}>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                              {localizedListenSource(row.source, t)}
                            </span>
                            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                              {row.listens.toLocaleString(locale)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <p className="text-[13px] leading-relaxed text-muted">{t("insightsFootnoteTz")}</p>
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
