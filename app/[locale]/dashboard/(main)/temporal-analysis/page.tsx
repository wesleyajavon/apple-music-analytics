"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useTemporalAnalysis } from "@/lib/hooks/use-listening";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { TemporalAnalysisSkeleton } from "@/lib/components/skeleton-loaders";
import {
  TemporalMobileEmpty,
  TemporalMobileError,
  TemporalMobileExperience,
  TemporalMobileSkeleton,
} from "@/lib/components/temporal-analysis-mobile";
import {
  DashboardSectionPanel,
  DashboardSectionSwitcher,
  useDashboardSectionView,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";
import {
  DASHBOARD_LIST_ROW,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  WEEKDAY_KEYS,
  formatHourForDisplay,
  getClockHandAngle,
  getRhythmKey,
} from "@/lib/utils/temporal-analysis-display";

type DayOfWeekChartType = "bar" | "distribution" | "radar";
type HourOfDayChartType = "bar" | "distribution" | "radar";

const TEMPORAL_VIEWS = ["spotlight", "weekday", "hour"] as const;
type TemporalView = (typeof TEMPORAL_VIEWS)[number];

const CHART_PLOT_WELL =
  "rounded-2xl border border-glass-hairline bg-surface/40 dark:bg-white/[0.03]";

function TemporalViewSwitcher({
  idPrefix,
  activeView,
  onChange,
}: {
  idPrefix: string;
  activeView: TemporalView;
  onChange: (view: TemporalView) => void;
}) {
  const t = useTranslations("temporal-analysis.viewSwitcher");
  const items: DashboardSectionItem<TemporalView>[] = [
    { id: "spotlight", label: t("views.spotlight") },
    { id: "weekday", label: t("views.weekday") },
    { id: "hour", label: t("views.hour") },
  ];

  return (
    <DashboardSectionSwitcher
      items={items}
      activeView={activeView}
      onChange={onChange}
      idPrefix={idPrefix}
      navLabel={t("navLabel")}
    />
  );
}

const TEMPORAL_CHART_COLORS = {
  clock: {
    start: "#60a5fa",
    mid: "#8b5cf6",
    end: "#e879f9",
    accent: "#60a5fa",
  },
  weekday: {
    start: "#3b82f6",
    end: "#a855f7",
    accent: "#6366f1",
  },
  hour: {
    start: "#06b6d4",
    end: "#d946ef",
    accent: "#0ea5e9",
  },
} as const;

function ChartTypeToggle({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { id: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className={DASHBOARD_SEGMENTED_TRACK} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            className={isActive ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function createTemporalTooltipFormatter(
  t: (key: string) => string,
  locale: string,
) {
  return (
    value: number,
    _name: string,
    props: { payload?: { uniqueTracks?: number; uniqueArtists?: number } },
  ) => {
    const p = props?.payload;
    const listens = value;
    const tracks = p?.uniqueTracks;
    const artists = p?.uniqueArtists;
    const parts = [`${listens.toLocaleString(locale)} ${t("listens")}`];
    if (tracks != null && !Number.isNaN(tracks)) {
      parts.push(`${tracks.toLocaleString(locale)} ${t("tracks")}`);
    }
    if (artists != null && !Number.isNaN(artists)) {
      parts.push(`${artists.toLocaleString(locale)} ${t("artists")}`);
    }
    return [parts.join(" · "), t("Listens")];
  };
}

function TemporalHeroFrame({
  badgeLabel,
  stats,
}: {
  badgeLabel: string;
  stats: ReactNode;
}) {
  const t = useTranslations("temporal-analysis");
  return (
    <OverviewHeroFrame title={t("title")} description={t("subtitle")}>
      <p className="mt-3 text-[13px] font-medium text-muted">{badgeLabel}</p>
      {stats ? <div className="mt-8">{stats}</div> : null}
    </OverviewHeroFrame>
  );
}

function TemporalHeroStats({ data, locale }: { data: TemporalAnalysisDto; locale: string }) {
  const t = useTranslations("temporal-analysis");
  const totalListens = useMemo(
    () => data.byDayOfWeek.reduce((sum, d) => sum + d.listens, 0),
    [data.byDayOfWeek],
  );
  const peakDayLabel = data.peakDay
    ? t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)
    : "—";
  const peakHourLabel = data.peakHour
    ? formatHourForDisplay(data.peakHour.hour, locale)
    : "—";

  const metrics = [
    { key: "total", label: t("heroStatTotal"), value: totalListens.toLocaleString(locale) },
    { key: "peakDay", label: t("peakDay"), value: peakDayLabel },
    { key: "peakHour", label: t("peakHour"), value: peakHourLabel },
  ];

  return (
    <div className={`${DASHBOARD_METRIC_STRIP} w-full`}>
      {metrics.map((metric) => (
        <div key={metric.key} className={DASHBOARD_METRIC_CELL}>
          <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
          <span className={`${DASHBOARD_METRIC_VALUE} truncate`}>{metric.value}</span>
        </div>
      ))}
    </div>
  );
}

function TemporalHeroStatsSkeleton() {
  return (
    <div className={`${DASHBOARD_METRIC_STRIP} w-full`} aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={DASHBOARD_METRIC_CELL}>
          <span className="h-3 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <span
            className={`${DASHBOARD_METRIC_VALUE} mt-1 inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`}
          />
        </div>
      ))}
    </div>
  );
}

function TemporalNoteCallout() {
  const t = useTranslations("temporal-analysis");
  return (
    <p className="max-w-3xl text-[13px] leading-6 text-muted">
      <strong className="font-semibold text-foreground">{t("note")}</strong> {t("noteText")}
    </p>
  );
}

function TemporalCanvasSection({
  eyebrow,
  title,
  description,
  titleId,
  headerAside,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  titleId: string;
  headerAside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="w-full min-w-0" aria-labelledby={titleId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p> : null}
          <h2 id={titleId} className={`${DASHBOARD_SECTION_TITLE} ${eyebrow ? "mt-1" : ""}`}>
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function TemporalSpotlightSkeleton() {
  return (
    <section className="w-full min-w-0 animate-pulse" aria-busy="true">
      <div className="h-3 w-36 rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-8 w-64 max-w-full rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-8 flex flex-col items-center gap-8 md:flex-row md:gap-12">
        <div className="h-32 w-32 rounded-full bg-black/10 dark:bg-white/10 sm:h-40 sm:w-40" />
        <div className="w-full flex-1 space-y-4">
          <div className="h-3 w-36 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-8 w-72 max-w-full rounded bg-black/10 dark:bg-white/10" />
          <div className="h-8 w-40 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-80 max-w-full rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    </section>
  );
}

function TemporalChartSkeleton() {
  return (
    <div className={`${CHART_PLOT_WELL} animate-pulse`} aria-busy="true">
      <div className="flex h-[400px] items-end gap-3 p-4">
        {[52, 76, 44, 88, 64, 58, 72].map((height, index) => (
          <div key={index} className="flex flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-black/10 dark:bg-white/10"
              style={{ height: `${height}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TemporalAnalysisContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const t = useTranslations("temporal-analysis");
  const locale = useLocale();
  const [dayOfWeekChartType, setDayOfWeekChartType] =
    useState<DayOfWeekChartType>("bar");
  const [hourOfDayChartType, setHourOfDayChartType] =
    useState<HourOfDayChartType>("bar");
  const { activeView, setView } = useDashboardSectionView(
    TEMPORAL_VIEWS,
    "spotlight",
  );
  const formatTemporalTooltip = useMemo(
    () => createTemporalTooltipFormatter(t, locale),
    [t, locale],
  );

  // IMPORTANT: L'analyse temporelle utilise TOUTES les données historiques
  // pour calculer des patterns fiables (jour de la semaine, heure de la journée).
  // Les filtres de date sont ignorés car ils donneraient des résultats trompeurs
  // (ex: patterns basés sur seulement 7 jours ne sont pas représentatifs).
  //
  // Si vous voulez analyser une période spécifique, utilisez la page Timeline.

  // Ne pas utiliser de filtres de date - toujours utiliser toutes les données
  const { data, isLoading, error, refetch } = useTemporalAnalysis(
    undefined,
    undefined,
    userId,
  );

  // Formater les données pour les graphiques - mémorisé pour éviter les recalculs
  const dayOfWeekData = useMemo(
    () =>
      data?.byDayOfWeek.map((item) => ({
        name: t(`weekdays.${WEEKDAY_KEYS[item.dayOfWeek]}`),
        dayName: t(`weekdays.${WEEKDAY_KEYS[item.dayOfWeek]}`),
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      })) || [],
    [data, t],
  );

  const hourOfDayData = useMemo(
    () =>
      data?.byHourOfDay.map((item) => ({
        name: formatHourForDisplay(item.hour, locale),
        hour: item.hour,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      })) || [],
    [data, locale],
  );

  // Données pour le graphique radar (jours de la semaine)
  const emptyStatePresets = useEmptyStatePresets({
    demoPath: "/dashboard/temporal-analysis",
  });

  const radarData = useMemo(
    () =>
      data?.byDayOfWeek.map((item) => ({
        day: t(`weekdays.${WEEKDAY_KEYS[item.dayOfWeek]}`),
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      })) || [],
    [data, t],
  );

  const hourRadarData = useMemo(
    () =>
      data?.byHourOfDay.map((item) => ({
        hour: formatHourForDisplay(item.hour, locale),
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      })) || [],
    [data, locale],
  );

  const isEmpty =
    !data ||
    data.byDayOfWeek.reduce((sum, day) => sum + day.listens, 0) === 0;

  const dayChartOptions = [
    { id: "bar", label: t("bar") },
    { id: "distribution", label: t("distribution") },
    { id: "radar", label: t("radar") },
  ];
  const hourChartOptions = [
    { id: "bar", label: t("bar") },
    { id: "distribution", label: t("distribution") },
    { id: "radar", label: t("radar") },
  ];

  return (
    <>
      <div className="lg:hidden">
        {isLoading ? (
          <TemporalMobileSkeleton />
        ) : error ? (
          <TemporalMobileError error={error} onRetry={() => refetch()} />
        ) : data && !isEmpty ? (
          <TemporalMobileExperience data={data} locale={locale} />
        ) : (
          <TemporalMobileEmpty />
        )}
      </div>

      <div className="mt-4 hidden space-y-8 lg:mt-6 lg:block">
        {!isLoading && error ? (
          <>
            <TemporalHeroFrame badgeLabel={t("heroBadge")} stats={null} />
            <TemporalViewSwitcher
              idPrefix="temporal-error"
              activeView={activeView}
              onChange={setView}
            />
            <ErrorState
              variant="startup"
              error={error}
              message={t("errorLoading")}
              onRetry={() => refetch()}
            />
          </>
        ) : !isLoading && isEmpty ? (
          <>
            <TemporalHeroFrame badgeLabel={t("heroBadge")} stats={null} />
            <TemporalViewSwitcher
              idPrefix="temporal-empty"
              activeView={activeView}
              onChange={setView}
            />
            <EmptyState variant="startup" {...emptyStatePresets.importData} />
          </>
        ) : (
          <>
            <TemporalHeroFrame
              badgeLabel={t("heroBadge")}
              stats={
                isLoading ? (
                  <TemporalHeroStatsSkeleton />
                ) : data ? (
                  <TemporalHeroStats data={data} locale={locale} />
                ) : null
              }
            />
            <TemporalNoteCallout />
            <TemporalViewSwitcher
              idPrefix="temporal"
              activeView={activeView}
              onChange={setView}
            />
            <DashboardSectionPanel
              idPrefix="temporal"
              view="spotlight"
              activeView={activeView}
            >
              {isLoading ? (
                <TemporalSpotlightSkeleton />
              ) : data && (data.peakDay || data.peakHour) ? (
                <TemporalCanvasSection
                  eyebrow={t("spotlightHint")}
                  title={t("spotlightTitle")}
                  titleId="temporal-spotlight-title"
                >
                  <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
                    {/* Clock visualization — 24h avec aiguille sur l'heure de pic */}
                    {data.peakHour && (
                      <div className="flex-shrink-0">
                        <div className="relative h-32 w-32 rounded-full bg-blue-400/10 p-2 sm:h-40 sm:w-40">
                          <svg viewBox="0 0 100 100" className="h-full w-full">
                            {/* Cercle externe */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-blue-300/35"
                            />
                            {/* Arc gradient du minuit à l'heure de pic */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="url(#temporalClockGradient)"
                              strokeWidth="6"
                              strokeLinecap="round"
                              strokeDasharray={`${(data.peakHour.hour / 24) * 283} 283`}
                              transform="rotate(-90 50 50)"
                              className="opacity-80"
                            />
                            <defs>
                              <linearGradient
                                id="temporalClockGradient"
                                x1="0"
                                y1="0"
                                x2="1"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={TEMPORAL_CHART_COLORS.clock.start}
                                />
                                <stop
                                  offset="55%"
                                  stopColor={TEMPORAL_CHART_COLORS.clock.mid}
                                />
                                <stop
                                  offset="100%"
                                  stopColor={TEMPORAL_CHART_COLORS.clock.end}
                                />
                              </linearGradient>
                            </defs>
                            {/* Aiguille */}
                            <line
                              x1="50"
                              y1="50"
                              x2="50"
                              y2="18"
                              stroke={TEMPORAL_CHART_COLORS.clock.accent}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              transform={`rotate(${getClockHandAngle(data.peakHour.hour)} 50 50)`}
                            />
                            {/* Centre du cadran */}
                            <circle
                              cx="50"
                              cy="50"
                              r="4"
                              fill={TEMPORAL_CHART_COLORS.clock.accent}
                            />
                            {/* Marqueurs 0, 6, 12, 18 */}
                            {[0, 6, 12, 18].map((h) => {
                              const a = (h / 24) * 360 - 90;
                              const rad = (a * Math.PI) / 180;
                              const x = 50 + 38 * Math.cos(rad);
                              const y = 50 + 38 * Math.sin(rad);
                              return (
                                <text
                                  key={h}
                                  x={x}
                                  y={y + 4}
                                  textAnchor="middle"
                                  className="fill-current text-muted"
                                  fontSize="8"
                                  fontWeight="600"
                                >
                                  {h}
                                </text>
                              );
                            })}
                          </svg>
                        </div>
                      </div>
                    )}
                    {/* Texte: moment de pic + rythme */}
                    <div className="min-w-0 flex-1 text-center md:text-left">
                      <p className={DASHBOARD_SECTION_EYEBROW}>{t("peakMomentLabel")}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {data.peakDay && data.peakHour
                          ? `${t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)} ${t("at")} ${formatHourForDisplay(data.peakHour.hour, locale)}`
                          : data.peakDay
                            ? t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)
                            : data.peakHour
                              ? formatHourForDisplay(data.peakHour.hour, locale)
                              : ""}
                      </p>
                      {data.peakHour && (
                        <span className="mt-3 inline-flex min-h-8 items-center rounded-full border border-glass-hairline bg-surface-raised px-3.5 text-[13px] font-medium text-foreground">
                          {t(getRhythmKey(data.peakHour.hour))}
                        </span>
                      )}
                      {(data.peakDay || data.peakHour) && (
                        <p className="mt-4 text-[13px] leading-6 text-muted">
                          {data.peakDay && data.peakHour
                            ? `${data.peakDay.listens.toLocaleString(locale)} ${t("listens")} ${t("on")} ${t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)} · ${data.peakHour.listens.toLocaleString(locale)} ${t("listens")} ${t("atThisHour")}`
                            : data.peakDay
                              ? `${data.peakDay.listens.toLocaleString(locale)} ${t("listens")} ${t("on")} ${t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)}`
                              : data.peakHour
                                ? `${data.peakHour.listens.toLocaleString(locale)} ${t("listens")} ${t("atThisHour")}`
                                : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </TemporalCanvasSection>
              ) : null}
            </DashboardSectionPanel>
            <DashboardSectionPanel
              idPrefix="temporal"
              view="weekday"
              activeView={activeView}
            >
              <TemporalCanvasSection
                title={t("listensByWeekday")}
                description={t("listensByWeekdayHint")}
                titleId="temporal-weekday-title"
                headerAside={
                  <ChartTypeToggle
                    value={dayOfWeekChartType}
                    onChange={(next) => setDayOfWeekChartType(next as DayOfWeekChartType)}
                    options={dayChartOptions}
                    ariaLabel={t("chart")}
                  />
                }
              >
                {isLoading ? (
                  <TemporalChartSkeleton />
                ) : dayOfWeekChartType === "bar" ? (
                  <div className={CHART_PLOT_WELL}>
                    <ChartResponsiveContainer token="temporalMain">
                      <BarChart
                        data={dayOfWeekData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient
                            id="dayBarGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={TEMPORAL_CHART_COLORS.weekday.start}
                            />
                            <stop offset="52%" stopColor="#6366f1" />
                            <stop
                              offset="100%"
                              stopColor={TEMPORAL_CHART_COLORS.weekday.end}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#bfdbfe"
                          strokeOpacity={0.32}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                          labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                          itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                          formatter={formatTemporalTooltip}
                        />
                        <Legend />
                        <Bar
                          dataKey="listens"
                          name={t("Listens")}
                          fill="url(#dayBarGradient)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ChartResponsiveContainer>
                  </div>
                ) : dayOfWeekChartType === "radar" ? (
                  <div className={CHART_PLOT_WELL}>
                    <ChartResponsiveContainer token="temporalMain">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#bfdbfe" strokeOpacity={0.55} />
                        <PolarAngleAxis
                          dataKey="day"
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 12,
                          }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, "auto"]}
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 10,
                          }}
                        />
                        <Radar
                          name={t("Listens")}
                          dataKey="listens"
                          stroke={TEMPORAL_CHART_COLORS.weekday.accent}
                          fill={TEMPORAL_CHART_COLORS.weekday.accent}
                          fillOpacity={0.32}
                          strokeWidth={2.5}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                          labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                          itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                          formatter={formatTemporalTooltip}
                        />
                        <Legend />
                      </RadarChart>
                    </ChartResponsiveContainer>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {dayOfWeekData.map((item, index) => {
                      const maxCount = Math.max(
                        ...dayOfWeekData.map((d) => d.listens),
                        1,
                      );
                      const percentage = (item.listens / maxCount) * 100;
                      return (
                        <div
                          key={item.name}
                          className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} opacity-0 animate-fade-in-up`}
                          style={{ animationDelay: `${index * 70}ms` }}
                        >
                          <div className="w-20 shrink-0 text-sm font-medium text-foreground">
                            {item.name}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                <div
                                  className="h-full overflow-hidden rounded-full"
                                  style={{ width: `${percentage}%` }}
                                >
                                  <div
                                    className="h-full w-full origin-left scale-x-0 rounded-full animate-grow-bar"
                                    style={{
                                      animationDelay: `${index * 70 + 100}ms`,
                                      backgroundImage: `linear-gradient(90deg, ${TEMPORAL_CHART_COLORS.weekday.start}, ${TEMPORAL_CHART_COLORS.weekday.end})`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                                {item.listens.toLocaleString(locale)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TemporalCanvasSection>
            </DashboardSectionPanel>
            <DashboardSectionPanel
              idPrefix="temporal"
              view="hour"
              activeView={activeView}
            >
              <TemporalCanvasSection
                title={t("listensByHour")}
                description={t("listensByHourHint")}
                titleId="temporal-hour-title"
                headerAside={
                  <ChartTypeToggle
                    value={hourOfDayChartType}
                    onChange={(next) => setHourOfDayChartType(next as HourOfDayChartType)}
                    options={hourChartOptions}
                    ariaLabel={t("chart")}
                  />
                }
              >
                {isLoading ? (
                  <TemporalChartSkeleton />
                ) : hourOfDayChartType === "bar" ? (
                  <div className={CHART_PLOT_WELL}>
                    <ChartResponsiveContainer token="temporalMain">
                      <BarChart
                        data={hourOfDayData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <defs>
                          <linearGradient
                            id="hourBarGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={TEMPORAL_CHART_COLORS.hour.start}
                            />
                            <stop offset="52%" stopColor="#8b5cf6" />
                            <stop
                              offset="100%"
                              stopColor={TEMPORAL_CHART_COLORS.hour.end}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#bfdbfe"
                          strokeOpacity={0.32}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 11,
                          }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 12,
                          }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                          labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                          itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                          formatter={formatTemporalTooltip}
                        />
                        <Legend />
                        <Bar
                          dataKey="listens"
                          name={t("Listens")}
                          fill="url(#hourBarGradient)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ChartResponsiveContainer>
                  </div>
                ) : hourOfDayChartType === "radar" ? (
                  <div className={CHART_PLOT_WELL}>
                    <ChartResponsiveContainer token="temporalMain">
                      <RadarChart data={hourRadarData}>
                        <PolarGrid stroke="#bfdbfe" strokeOpacity={0.55} />
                        <PolarAngleAxis
                          dataKey="hour"
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 10,
                          }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, "auto"]}
                          tick={{
                            fill: "rgb(var(--muted-rgb) / 0.95)",
                            fontSize: 10,
                          }}
                        />
                        <Radar
                          name={t("Listens")}
                          dataKey="listens"
                          stroke={TEMPORAL_CHART_COLORS.hour.accent}
                          fill={TEMPORAL_CHART_COLORS.hour.accent}
                          fillOpacity={0.32}
                          strokeWidth={2.5}
                        />
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                          labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                          itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                          formatter={formatTemporalTooltip}
                        />
                        <Legend />
                      </RadarChart>
                    </ChartResponsiveContainer>
                  </div>
                ) : (
                  <div className="max-h-[500px] space-y-0 overflow-y-auto pr-2">
                    {hourOfDayData.map((item, index) => {
                      const maxCount = Math.max(
                        ...hourOfDayData.map((d) => d.listens),
                        1,
                      );
                      const percentage = (item.listens / maxCount) * 100;
                      return (
                        <div
                          key={item.hour}
                          className={`${DASHBOARD_LIST_ROW} ${DASHBOARD_LIST_SEPARATOR} opacity-0 animate-fade-in-up`}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="w-16 shrink-0 text-sm font-medium text-foreground">
                            {item.name}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                                <div
                                  className="h-full overflow-hidden rounded-full"
                                  style={{ width: `${percentage}%` }}
                                >
                                  <div
                                    className="h-full w-full origin-left scale-x-0 rounded-full animate-grow-bar"
                                    style={{
                                      animationDelay: `${index * 50 + 100}ms`,
                                      backgroundImage: `linear-gradient(90deg, ${TEMPORAL_CHART_COLORS.hour.start}, ${TEMPORAL_CHART_COLORS.hour.end})`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                                {item.listens.toLocaleString(locale)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TemporalCanvasSection>
            </DashboardSectionPanel>
          </>
        )}
      </div>
    </>
  );
}

function TemporalAnalysisFallback() {
  const t = useTranslations("temporal-analysis");
  return (
    <>
      <TemporalMobileSkeleton />
      <div className="mt-4 hidden space-y-8 lg:mt-6 lg:block">
        <TemporalHeroFrame badgeLabel={t("heroBadge")} stats={<TemporalHeroStatsSkeleton />} />
        <TemporalNoteCallout />
        <TemporalAnalysisSkeleton />
      </div>
    </>
  );
}

export default function TemporalAnalysisPage() {
  return (
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<TemporalAnalysisFallback />}>
        <TemporalAnalysisContent />
      </Suspense>
    </div>
  );
}
