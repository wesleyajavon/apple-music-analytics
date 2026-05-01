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
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useTemporalAnalysis } from "@/lib/hooks/use-listening";
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { TemporalAnalysisSkeleton } from "@/lib/components/skeleton-loaders";
import { Clock } from "lucide-react";

// Formatter tooltip - créé dans le composant pour avoir accès à t et locale
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

type DayOfWeekChartType = "bar" | "distribution" | "radar";
type HourOfDayChartType = "bar" | "distribution" | "radar";

const CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-blue-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.1),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card backdrop-blur-sm dark:border-blue-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.14),_transparent_30%),rgb(var(--card-rgb)/0.9)]";

const CHART_CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-blue-300/20 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.1),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_30%),rgb(var(--card-rgb)/0.92)] shadow-card backdrop-blur-sm dark:border-blue-300/15 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.12),_transparent_30%),rgb(var(--card-rgb)/0.9)]";

const CHART_PANEL_CLASS =
  "relative rounded-2xl border border-blue-200/20 bg-white/50 p-3 shadow-inner dark:border-blue-300/10 dark:bg-slate-950/20";
const TEMPORAL_RAIL_CLASS = "bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400";
const TEMPORAL_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-blue-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.3),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.22),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#1e1b4b_100%)] px-6 py-8 shadow-2xl shadow-blue-950/40 sm:px-8 sm:py-10";

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
  return `relative z-10 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4 sm:text-sm ${
    isActive
      ? "bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 text-white shadow-sm shadow-blue-950/20"
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
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(217,70,239,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
      <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-blue-400/18 blur-3xl" />
      <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-fuchsia-400/16 blur-3xl" />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TEMPORAL_RAIL_CLASS} opacity-90`} />
      <div className="relative">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/85">{t("heroEyebrow")}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            <Clock className="h-9 w-9 shrink-0 text-blue-200/90 sm:h-10 sm:w-10" strokeWidth={1.75} aria-hidden />
            <span>{t("title")}</span>
          </h1>
          <div
            className={`mt-4 h-1.5 w-24 rounded-full ${TEMPORAL_RAIL_CLASS} opacity-95 shadow-[0_0_24px_rgba(59,130,246,0.35)]`}
            aria-hidden
          />
          <p className="mt-5 text-base leading-relaxed text-blue-100/90 sm:text-lg">{t("subtitle")}</p>
          <p className="mt-2 text-sm font-medium text-fuchsia-100/90">
            <span className="inline-flex items-center rounded-full border border-blue-200/30 bg-white/10 px-3 py-1">
              {badgeLabel}
            </span>
          </p>
        </div>
        {stats}
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
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      <div className="rounded-xl border border-blue-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-blue-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-blue-100/80">{t("heroStatTotal")}</p>
        <p className="text-2xl font-bold text-white">{totalListens.toLocaleString(locale)}</p>
      </div>
      <div className="rounded-xl border border-violet-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-violet-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-violet-100/80">{t("peakDay")}</p>
        {data.peakDay ? (
          <>
            <p className="text-2xl font-bold text-white">{peakDayLabel}</p>
            <p className="mt-0.5 text-xs text-white/70">
              {data.peakDay.listens.toLocaleString(locale)} {t("listens")}
            </p>
          </>
        ) : (
          <p className="text-2xl font-bold text-white/50">{peakDayLabel}</p>
        )}
      </div>
      <div className="rounded-xl border border-fuchsia-200/15 bg-slate-950/35 px-4 py-3 shadow-lg shadow-fuchsia-950/20 backdrop-blur-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-100/80">{t("peakHour")}</p>
        {data.peakHour ? (
          <>
            <p className="text-2xl font-bold text-white">{peakHourLabel}</p>
            <p className="mt-0.5 text-xs text-white/70">
              {data.peakHour.listens.toLocaleString(locale)} {t("listens")}
            </p>
          </>
        ) : (
          <p className="text-2xl font-bold text-white/50">{peakHourLabel}</p>
        )}
      </div>
    </div>
  );
}

function TemporalHeroStatsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-4 sm:gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="min-w-[140px] flex-1 animate-pulse rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3 shadow-lg backdrop-blur-sm sm:flex-initial"
        >
          <div className="mb-2 h-3 w-20 rounded bg-white/15" />
          <div className="h-8 w-24 rounded bg-white/20" />
        </div>
      ))}
    </div>
  );
}

function TemporalNoteCallout() {
  const t = useTranslations("temporal-analysis");
  return (
    <div className="rounded-xl border border-blue-300/20 bg-gradient-to-r from-blue-400/10 via-violet-400/10 to-fuchsia-400/10 p-4 shadow-sm shadow-blue-950/5">
      <p className="text-sm leading-relaxed text-foreground/85">
        <strong className="text-blue-600 dark:text-blue-300">{t("note")} :</strong>{" "}
        {t("noteText")}
      </p>
    </div>
  );
}

function TemporalSpotlightSkeleton() {
  return (
    <section
      className={`${CARD_CLASS} animate-pulse transition-all duration-300`}
      aria-busy="true"
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TEMPORAL_RAIL_CLASS} opacity-85`} />
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-400/12 blur-3xl dark:bg-fuchsia-400/16" />
      <div className="relative">
        <div className="border-b border-blue-200/20 px-6 py-5 dark:border-blue-300/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-300/10" />
            <div>
              <div className="h-5 w-44 rounded bg-muted/20" />
              <div className="mt-2 h-4 w-64 rounded bg-muted/15" />
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
            <div className="h-32 w-32 rounded-full bg-blue-400/10 sm:h-40 sm:w-40" />
            <div className="w-full flex-1 space-y-4">
              <div className="h-3 w-36 rounded bg-blue-400/20" />
              <div className="h-8 w-72 max-w-full rounded bg-muted/20" />
              <div className="h-8 w-40 rounded-full bg-blue-400/15" />
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
    <div className={`${CHART_PANEL_CLASS} animate-pulse`} aria-busy="true">
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
        <ErrorState
          error={error}
          message={t("errorLoading")}
          onRetry={() => refetch()}
        />
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
        <EmptyState {...emptyStatePresets.importData} />
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
                className={`${CARD_CLASS} animate-fade-in-up transition-all duration-300`}
                aria-labelledby="temporal-spotlight-title"
              >
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TEMPORAL_RAIL_CLASS} opacity-85`} />
                <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-400/12 blur-3xl dark:bg-fuchsia-400/16" />
                <div className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-blue-400/12 blur-3xl dark:bg-blue-400/16" />
                <div className="relative">
                  <div className="border-b border-blue-200/20 px-6 py-5 dark:border-blue-300/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-300/25 bg-blue-300/10 text-blue-600 shadow-sm shadow-blue-950/10 dark:text-blue-200">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2
                          id="temporal-spotlight-title"
                          className="text-lg font-semibold tracking-tight text-foreground"
                        >
                          {t("spotlightTitle")}
                        </h2>
                        <p className="mt-0.5 text-sm text-blue-700/75 dark:text-blue-100/65">
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
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
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
            <div className={CHART_CARD_CLASS}>
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TEMPORAL_RAIL_CLASS} opacity-80`} />
              <div className="border-b border-blue-200/20 px-6 py-4 dark:border-blue-300/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t("listensByWeekday")}
                    </h2>
                    <p className="mt-0.5 text-sm text-blue-700/75 dark:text-blue-100/65">
                      {t("listensByWeekdayHint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t("chart")}
                    </span>
                    <div className="flex items-center rounded-xl border border-blue-300/20 bg-surface p-1.5 shadow-sm">
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
                  <div className={CHART_PANEL_CLASS}>
                    <ResponsiveContainer width="100%" height={400}>
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
                    </ResponsiveContainer>
                  </div>
                ) : dayOfWeekChartType === "radar" ? (
                  <div className={CHART_PANEL_CLASS}>
                    <ResponsiveContainer width="100%" height={400}>
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
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className={`${CHART_PANEL_CLASS} space-y-4`}>
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

            {/* Graphique par heure de la journée - Barres, distribution ou radar */}
            <div className={CHART_CARD_CLASS}>
              <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${TEMPORAL_RAIL_CLASS} opacity-80`} />
              <div className="border-b border-blue-200/20 px-6 py-4 dark:border-blue-300/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {t("listensByHour")}
                    </h2>
                    <p className="mt-0.5 text-sm text-blue-700/75 dark:text-blue-100/65">
                      {t("listensByHourHint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t("chart")}
                    </span>
                    <div className="flex items-center rounded-xl border border-blue-300/20 bg-surface p-1.5 shadow-sm">
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
                  <div className={CHART_PANEL_CLASS}>
                    <ResponsiveContainer width="100%" height={400}>
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
                    </ResponsiveContainer>
                  </div>
                ) : hourOfDayChartType === "radar" ? (
                  <div className={CHART_PANEL_CLASS}>
                    <ResponsiveContainer width="100%" height={400}>
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
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div
                    className={`${CHART_PANEL_CLASS} max-h-[500px] space-y-3 overflow-y-auto pr-2`}
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
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<TemporalAnalysisFallback />}>
        <TemporalAnalysisContent />
      </Suspense>
    </div>
  );
}
