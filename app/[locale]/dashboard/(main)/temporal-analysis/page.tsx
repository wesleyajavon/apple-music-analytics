"use client";

import { Suspense, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
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
import { Clock, Activity, CalendarDays } from "lucide-react";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
} from "@/lib/constants/dashboard-spotlight";

type DayOfWeekChartType = "bar" | "distribution" | "radar";
type HourOfDayChartType = "bar" | "distribution" | "radar";

const TEMPORAL_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const TEMPORAL_SECTION_CLASS = `relative ${DASHBOARD_SPOTLIGHT_SHELL}`;

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

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

function chartToggleClass(isActive: boolean): string {
  return `relative z-10 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/40 sm:px-4 sm:text-sm ${
    isActive
      ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950"
      : "text-muted hover:text-foreground"
  }`;
}

/** Returns rhythm label based on peak hour (0-23) */
function getRhythmKey(
  hour: number,
):
  | "rhythmNightOwl"
  | "rhythmMorningPerson"
  | "rhythmAfternoon"
  | "rhythmEvening" {
  if (hour >= 0 && hour <= 5) return "rhythmNightOwl";
  if (hour >= 6 && hour <= 11) return "rhythmMorningPerson";
  if (hour >= 12 && hour <= 17) return "rhythmAfternoon";
  return "rhythmEvening";
}

/** 24h clock: hour 0 = top, angle in degrees for SVG transform */
function getClockHandAngle(hour: number): number {
  return (hour / 24) * 360 - 90;
}

/** Format hour for display: 12h AM/PM for English, 24h for others */
function formatHourForDisplay(hour: number, locale: string): string {
  const date = new Date(2000, 0, 1, hour, 0, 0);
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    hour12: locale.startsWith("en"),
  });
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

function TemporalHeroFrame({ badgeLabel, stats }: { badgeLabel: string; stats: ReactNode }) {
  const t = useTranslations("temporal-analysis");
  return (
    <div className={TEMPORAL_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Clock className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" strokeWidth={1.5} aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              {badgeLabel}
            </span>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/timeline"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <Activity className="h-4 w-4" aria-hidden />
              {t("ctaTimeline")}
            </Link>
            <Link
              href="/dashboard/heatmap"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {t("ctaHeatmap")}
            </Link>
          </div>
        </div>

        <div className="relative lg:mt-0">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
              </div>
              {stats ?? (
                <p className="pt-4 text-sm leading-6 text-white/60">{t("heroStatsPlaceholder")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{totalListens.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroStatTotal")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white truncate">{peakDayLabel}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("peakDay")}</p>
        {data.peakDay ? (
          <p className="mt-0.5 text-xs text-white/65">
            {data.peakDay.listens.toLocaleString(locale)} {t("listens")}
          </p>
        ) : null}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 sm:col-span-1">
        <p className="text-xl font-semibold tracking-tight text-white">{peakHourLabel}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("peakHour")}</p>
        {data.peakHour ? (
          <p className="mt-0.5 text-xs text-white/65">
            {data.peakHour.listens.toLocaleString(locale)} {t("listens")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TemporalHeroStatsSkeleton() {
  return (
    <div className="grid gap-2 pt-4 sm:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-20 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function TemporalNoteCallout() {
  const t = useTranslations("temporal-analysis");
  return (
    <div className={`${TEMPORAL_SECTION_CLASS}`}>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
      <div className={`relative ${DASHBOARD_SPOTLIGHT_INNER_WELL} mx-4 my-4 sm:mx-6 sm:my-6`}>
        <p className={`text-sm leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED}`}>
          <strong className="font-semibold text-slate-900 dark:text-white">{t("note")}</strong>{" "}
          {t("noteText")}
        </p>
      </div>
    </div>
  );
}

function TemporalSpotlightSkeleton() {
  return (
    <section
      className={`${TEMPORAL_SECTION_CLASS} animate-pulse transition-all duration-300`}
      aria-busy="true"
    >
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
      <div className="relative">
        <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-slate-200/80 dark:bg-white/10" />
            <div>
              <div className="h-5 w-44 rounded bg-muted/20" />
              <div className="mt-2 h-4 w-64 rounded bg-muted/15" />
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
            <div className="h-32 w-32 rounded-full bg-violet-400/10 sm:h-40 sm:w-40" />
            <div className="w-full flex-1 space-y-4">
              <div className="h-3 w-36 rounded bg-violet-400/20" />
              <div className="h-8 w-72 max-w-full rounded bg-muted/20" />
              <div className="h-8 w-40 rounded-full bg-violet-400/15" />
              <div className="h-4 w-80 max-w-full rounded bg-muted/15" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TemporalChartSkeleton() {
  return (
    <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} animate-pulse`} aria-busy="true">
      <div className="flex h-[400px] items-end gap-3 p-4">
        {[52, 76, 44, 88, 64, 58, 72].map((height, index) => (
          <div key={index} className="flex flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-blue-400/20 to-fuchsia-400/20"
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
  const emptyStatePresets = useEmptyStatePresets();

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

  if (!isLoading && error) {
    return (
      <div className="space-y-8">
        <TemporalHeroFrame badgeLabel={t("heroBadge")} stats={null} />
        <TemporalNoteCallout />
        <section className={TEMPORAL_SECTION_CLASS}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative p-6 sm:p-8">
            <ErrorState
              variant="startup"
              error={error}
              message={t("errorLoading")}
              onRetry={() => refetch()}
            />
          </div>
        </section>
      </div>
    );
  }

  if (
    !isLoading &&
    (!data || (data.byDayOfWeek.length === 0 && data.byHourOfDay.length === 0))
  ) {
    return (
      <div className="space-y-8">
        <TemporalHeroFrame badgeLabel={t("heroBadge")} stats={null} />
        <TemporalNoteCallout />
        <EmptyState variant="startup" {...emptyStatePresets.importData} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
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
      <div className="space-y-8">
            {/* Spotlight: Your listening rhythm — moment de pic combiné avec visuel créatif */}
            {isLoading ? (
              <TemporalSpotlightSkeleton />
            ) : data && (data.peakDay || data.peakHour) ? (
              <section
                className={`${TEMPORAL_SECTION_CLASS} animate-fade-in-up transition-all duration-300`}
                aria-labelledby="temporal-spotlight-title"
              >
                <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
                <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
                <div className="relative">
                  <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-5 sm:px-8`}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-slate-50/90 text-violet-600 shadow-sm dark:border-white/15 dark:bg-white/10 dark:text-violet-300">
                        <Clock className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </div>
                      <div>
                        <h2
                          id="temporal-spotlight-title"
                          className={DASHBOARD_SPOTLIGHT_TITLE}
                        >
                          {t("spotlightTitle")}
                        </h2>
                        <p className={`mt-1 max-w-2xl ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                          {t("spotlightHint")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                      {/* Clock visualization — 24h avec aiguille sur l'heure de pic */}
                      {data.peakHour && (
                        <div className="flex-shrink-0">
                          <div className="relative w-32 h-32 rounded-full bg-blue-400/10 p-2 shadow-[0_0_45px_-22px_rgb(96_165_250)] sm:w-40 sm:h-40">
                            <svg
                              viewBox="0 0 100 100"
                              className="w-full h-full"
                            >
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
                      <div className="flex-1 text-center md:text-left min-w-0">
                        <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">
                          {t("peakMomentLabel")}
                        </p>
                        <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                          {data.peakDay && data.peakHour
                            ? `${t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)} ${t("at")} ${formatHourForDisplay(data.peakHour.hour, locale)}`
                            : data.peakDay
                              ? t(
                                  `weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`,
                                )
                              : data.peakHour
                                ? formatHourForDisplay(
                                    data.peakHour.hour,
                                    locale,
                                  )
                                : ""}
                        </p>
                        {data.peakHour && (
                          <span className="mt-3 inline-flex items-center rounded-full border border-blue-300/25 bg-gradient-to-r from-blue-400/10 via-violet-400/10 to-fuchsia-400/10 px-4 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-200">
                            {t(getRhythmKey(data.peakHour.hour))}
                          </span>
                        )}
                        {(data.peakDay || data.peakHour) && (
                          <p className="mt-4 text-sm text-muted">
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
                  </div>
                </div>
              </section>
            ) : null}

            {/* Graphique par jour de la semaine - Barres ou distribution (comme heatmap) */}
            <section className={TEMPORAL_SECTION_CLASS}>
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN} aria-hidden />
              <div className="relative">
              <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-4 sm:px-8`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h2 className={DASHBOARD_SPOTLIGHT_TITLE}>
                      {t("listensByWeekday")}
                    </h2>
                    <p className={`mt-1 max-w-2xl ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                      {t("listensByWeekdayHint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t("chart")}
                    </span>
                    <div className="flex items-center rounded-xl border border-slate-200/90 bg-slate-50/90 p-1.5 shadow-sm dark:border-white/10 dark:bg-black/25">
                      <button
                        onClick={() => setDayOfWeekChartType("bar")}
                        className={chartToggleClass(
                          dayOfWeekChartType === "bar",
                        )}
                      >
                        {t("bar")}
                      </button>
                      <button
                        onClick={() => setDayOfWeekChartType("distribution")}
                        className={chartToggleClass(
                          dayOfWeekChartType === "distribution",
                        )}
                      >
                        {t("distribution")}
                      </button>
                      <button
                        onClick={() => setDayOfWeekChartType("radar")}
                        className={chartToggleClass(
                          dayOfWeekChartType === "radar",
                        )}
                      >
                        {t("radar")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative p-4 sm:p-6">
                <div className="pointer-events-none absolute right-12 top-12 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-400/15" />
                {isLoading ? (
                  <TemporalChartSkeleton />
                ) : dayOfWeekChartType === "bar" ? (
                  <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
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
                            <stop
                              offset="52%"
                              stopColor="#6366f1"
                            />
                            <stop
                              offset="100%"
                              stopColor={TEMPORAL_CHART_COLORS.weekday.end}
                            />
                          </linearGradient>
                          <filter id="dayBarGlow" x="-20%" y="-20%" width="140%" height="150%">
                            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#6366f1" floodOpacity="0.22" />
                          </filter>
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
                          filter="url(#dayBarGlow)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ChartResponsiveContainer>
                  </div>
                ) : dayOfWeekChartType === "radar" ? (
                  <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
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
                  <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} space-y-4`}>
                    {dayOfWeekData.map((item, index) => {
                      const maxCount = Math.max(
                        ...dayOfWeekData.map((d) => d.listens),
                        1,
                      );
                      const percentage = (item.listens / maxCount) * 100;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center gap-4 opacity-0 animate-fade-in-up"
                          style={{ animationDelay: `${index * 70}ms` }}
                        >
                          <div className="w-20 shrink-0 text-sm font-medium text-foreground">
                            {item.name}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-blue-100/70 dark:bg-blue-950/45">
                                <div
                                  className="h-full rounded-full overflow-hidden"
                                  style={{ width: `${percentage}%` }}
                                >
                                  <div
                                    className="h-full w-full origin-left scale-x-0 rounded-full animate-grow-bar"
                                    style={{
                                      animationDelay: `${index * 70 + 100}ms`,
                                      backgroundImage: `linear-gradient(90deg, ${TEMPORAL_CHART_COLORS.weekday.start}, ${TEMPORAL_CHART_COLORS.weekday.end})`,
                                      boxShadow: "0 0 18px -6px currentColor",
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="w-14 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                                {item.listens.toLocaleString(locale)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </section>

            {/* Graphique par heure de la journée - Barres, distribution ou radar */}
            <section className={TEMPORAL_SECTION_CLASS}>
              <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
              <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
              <div className="relative">
              <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-6 py-4 sm:px-8`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h2 className={DASHBOARD_SPOTLIGHT_TITLE}>
                      {t("listensByHour")}
                    </h2>
                    <p className={`mt-1 max-w-2xl ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                      {t("listensByHourHint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t("chart")}
                    </span>
                    <div className="flex items-center rounded-xl border border-slate-200/90 bg-slate-50/90 p-1.5 shadow-sm dark:border-white/10 dark:bg-black/25">
                      <button
                        onClick={() => setHourOfDayChartType("bar")}
                        className={chartToggleClass(
                          hourOfDayChartType === "bar",
                        )}
                      >
                        {t("bar")}
                      </button>
                      <button
                        onClick={() => setHourOfDayChartType("distribution")}
                        className={chartToggleClass(
                          hourOfDayChartType === "distribution",
                        )}
                      >
                        {t("distribution")}
                      </button>
                      <button
                        onClick={() => setHourOfDayChartType("radar")}
                        className={chartToggleClass(
                          hourOfDayChartType === "radar",
                        )}
                      >
                        {t("radar")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative p-4 sm:p-6">
                <div className="pointer-events-none absolute left-12 top-12 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl dark:bg-fuchsia-400/15" />
                {isLoading ? (
                  <TemporalChartSkeleton />
                ) : hourOfDayChartType === "bar" ? (
                  <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
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
                            <stop
                              offset="52%"
                              stopColor="#8b5cf6"
                            />
                            <stop
                              offset="100%"
                              stopColor={TEMPORAL_CHART_COLORS.hour.end}
                            />
                          </linearGradient>
                          <filter id="hourBarGlow" x="-20%" y="-20%" width="140%" height="150%">
                            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#d946ef" floodOpacity="0.2" />
                          </filter>
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
                          filter="url(#hourBarGlow)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ChartResponsiveContainer>
                  </div>
                ) : hourOfDayChartType === "radar" ? (
                  <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
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
                  <div
                    className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} max-h-[500px] space-y-3 overflow-y-auto pr-2`}
                  >
                    {hourOfDayData.map((item, index) => {
                      const maxCount = Math.max(
                        ...hourOfDayData.map((d) => d.listens),
                        1,
                      );
                      const percentage = (item.listens / maxCount) * 100;
                      return (
                        <div
                          key={item.hour}
                          className="flex items-center gap-4 opacity-0 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="w-16 shrink-0 text-sm font-medium text-foreground">
                            {item.name}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-blue-100/70 dark:bg-blue-950/45">
                                <div
                                  className="h-full rounded-full overflow-hidden"
                                  style={{ width: `${percentage}%` }}
                                >
                                  <div
                                    className="h-full w-full origin-left scale-x-0 rounded-full animate-grow-bar"
                                    style={{
                                      animationDelay: `${index * 50 + 100}ms`,
                                      backgroundImage: `linear-gradient(90deg, ${TEMPORAL_CHART_COLORS.hour.start}, ${TEMPORAL_CHART_COLORS.hour.end})`,
                                      boxShadow: "0 0 18px -6px currentColor",
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="w-14 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                                {item.listens.toLocaleString(locale)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </section>
      </div>
    </div>
  );
}

function TemporalAnalysisFallback() {
  const t = useTranslations("temporal-analysis");
  return (
    <div className="space-y-8">
      <TemporalHeroFrame badgeLabel={t("heroBadge")} stats={<TemporalHeroStatsSkeleton />} />
      <TemporalNoteCallout />
      <TemporalAnalysisSkeleton />
    </div>
  );
}

export default function TemporalAnalysisPage() {
  return (
    <div className="px-4 pb-6 pt-0 sm:px-0">
      <Suspense fallback={<TemporalAnalysisFallback />}>
        <TemporalAnalysisContent />
      </Suspense>
    </div>
  );
}
