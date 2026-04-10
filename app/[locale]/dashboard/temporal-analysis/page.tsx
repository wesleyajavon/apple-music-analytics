"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { TemporalAnalysisSkeleton } from "@/lib/components/skeleton-loaders";

// Formatter tooltip - créé dans le composant pour avoir accès à t et locale
const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

type DayOfWeekChartType = "bar" | "distribution" | "radar";
type HourOfDayChartType = "bar" | "distribution" | "radar";

/** Returns rhythm label based on peak hour (0-23) */
function getRhythmKey(hour: number): "rhythmNightOwl" | "rhythmMorningPerson" | "rhythmAfternoon" | "rhythmEvening" {
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
  locale: string
) {
  return (
    value: number,
    _name: string,
    props: { payload?: { uniqueTracks?: number; uniqueArtists?: number } }
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

function TemporalAnalysisContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const t = useTranslations("temporal-analysis");
  const locale = useLocale();
  const [dayOfWeekChartType, setDayOfWeekChartType] = useState<DayOfWeekChartType>("bar");
  const [hourOfDayChartType, setHourOfDayChartType] = useState<HourOfDayChartType>("bar");
  const formatTemporalTooltip = useMemo(
    () => createTemporalTooltipFormatter(t, locale),
    [t, locale]
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
    userId
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
    [data, t]
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
    [data, locale]
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
    [data, t]
  );

  const hourRadarData = useMemo(
    () =>
      data?.byHourOfDay.map((item) => ({
        hour: formatHourForDisplay(item.hour, locale),
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      })) || [],
    [data, locale]
  );

  return (
    <>
      <div className="mt-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("subtitle")}
          </p>
          <div className="mt-4 p-4 rounded-xl bg-accent-violet/10 dark:bg-accent-violet/20 border border-accent-violet/20">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <strong className="text-accent-violet dark:text-accent-violet">{t("note")} :</strong> {t("noteText")}
            </p>
          </div>
        </header>

        {isLoading ? (
          <TemporalAnalysisSkeleton />
        ) : error ? (
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        ) : !data || (data.byDayOfWeek.length === 0 && data.byHourOfDay.length === 0) ? (
          <EmptyState {...emptyStatePresets.importData} />
        ) : (
          <div className="space-y-8">
            {/* Spotlight: Your listening rhythm — moment de pic combiné avec visuel créatif */}
            {(data.peakDay || data.peakHour) && (
              <section
                className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40"
                aria-labelledby="temporal-spotlight-title"
              >
                {/* Gradient spotlight */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
                  style={{
                    background: "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-80 dark:opacity-60"
                  style={{
                    background: "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 60%)",
                  }}
                />
                <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-24 bg-accent-violet/10 dark:bg-accent-violet/15 blur-3xl rounded-full" />

                <div className="relative">
                  <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 id="temporal-spotlight-title" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                          {t("spotlightTitle")}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {t("spotlightHint")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 md:p-10">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                      {/* Clock visualization — 24h avec aiguille sur l'heure de pic */}
                      {data.peakHour && (
                        <div className="flex-shrink-0">
                          <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              {/* Cercle externe */}
                              <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-gray-200 dark:text-gray-600"
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
                                <linearGradient id="temporalClockGradient" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#8b5cf6" />
                                  <stop offset="100%" stopColor="#6366f1" />
                                </linearGradient>
                              </defs>
                              {/* Aiguille */}
                              <line
                                x1="50"
                                y1="50"
                                x2="50"
                                y2="18"
                                stroke="#8b5cf6"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                transform={`rotate(${getClockHandAngle(data.peakHour.hour)} 50 50)`}
                              />
                              {/* Centre du cadran */}
                              <circle cx="50" cy="50" r="4" fill="#8b5cf6" />
                              {/* Marqueurs 0, 6, 12, 18 */}
                              {[0, 6, 12, 18].map((h) => {
                                const a = (h / 24) * 360 - 90;
                                const rad = (a * Math.PI) / 180;
                                const x = 50 + 38 * Math.cos(rad);
                                const y = 50 + 38 * Math.sin(rad);
                                return (
                                  <text key={h} x={x} y={y + 4} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400" fontSize="8" fontWeight="600">
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
                        <p className="text-xs font-semibold uppercase tracking-widest text-accent-violet dark:text-accent-violet mb-2">
                          {t("peakMomentLabel")}
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                          {data.peakDay && data.peakHour
                            ? `${t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)} ${t("at")} ${formatHourForDisplay(data.peakHour.hour, locale)}`
                            : data.peakDay
                              ? t(`weekdays.${WEEKDAY_KEYS[data.peakDay.dayOfWeek]}`)
                              : data.peakHour
                                ? formatHourForDisplay(data.peakHour.hour, locale)
                                : ""}
                        </p>
                        {data.peakHour && (
                          <span className="inline-flex items-center mt-3 px-4 py-1.5 rounded-full text-sm font-medium bg-accent-violet/15 text-accent-violet dark:bg-accent-violet/25 border border-accent-violet/20">
                            {t(getRhythmKey(data.peakHour.hour))}
                          </span>
                        )}
                        {(data.peakDay || data.peakHour) && (
                          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
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
            )}

            {/* Graphique par jour de la semaine - Barres ou distribution (comme heatmap) */}
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("listensByWeekday")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("listensByWeekdayHint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t("chart")}
                    </span>
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                      <button
                        onClick={() => setDayOfWeekChartType("bar")}
                        className={`
                          px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                          ${dayOfWeekChartType === "bar" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                        `}
                      >
                        {t("bar")}
                      </button>
                      <button
                        onClick={() => setDayOfWeekChartType("distribution")}
                        className={`
                          px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                          ${dayOfWeekChartType === "distribution" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                        `}
                      >
                        {t("distribution")}
                      </button>
                      <button
                        onClick={() => setDayOfWeekChartType("radar")}
                        className={`
                          px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                          ${dayOfWeekChartType === "radar" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                        `}
                      >
                        {t("radar")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {dayOfWeekChartType === "bar" ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={dayOfWeekData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="dayBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                        labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                        itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                        formatter={formatTemporalTooltip}
                      />
                      <Legend />
                      <Bar dataKey="listens" name={t("Listens")} fill="url(#dayBarGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : dayOfWeekChartType === "radar" ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, "auto"]} tick={{ fill: "#64748b", fontSize: 10 }} />
                      <Radar name={t("Listens")} dataKey="listens" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} strokeWidth={2} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                        labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                        itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                        formatter={formatTemporalTooltip}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="space-y-4">
                    {dayOfWeekData.map((item, index) => {
                      const maxCount = Math.max(...dayOfWeekData.map((d) => d.listens), 1);
                      const percentage = (item.listens / maxCount) * 100;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center gap-4 opacity-0 animate-fade-in-up"
                          style={{ animationDelay: `${index * 70}ms` }}
                        >
                          <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                            {item.name}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full overflow-hidden"
                                  style={{ width: `${percentage}%` }}
                                >
                                  <div
                                    className="h-full w-full rounded-full bg-gradient-to-r from-accent-violet to-accent-indigo scale-x-0 origin-left animate-grow-bar"
                                    style={{ animationDelay: `${index * 70 + 100}ms` }}
                                  />
                                </div>
                              </div>
                              <div className="w-14 text-sm font-semibold text-gray-900 dark:text-white text-right tabular-nums shrink-0">
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
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("listensByHour")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("listensByHourHint")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t("chart")}
                    </span>
                    <div className="flex items-center bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                      <button
                        onClick={() => setHourOfDayChartType("bar")}
                        className={`
                          px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                          ${hourOfDayChartType === "bar" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                        `}
                      >
                        {t("bar")}
                      </button>
                      <button
                        onClick={() => setHourOfDayChartType("distribution")}
                        className={`
                          px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                          ${hourOfDayChartType === "distribution" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                        `}
                      >
                        {t("distribution")}
                      </button>
                      <button
                        onClick={() => setHourOfDayChartType("radar")}
                        className={`
                          px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                          ${hourOfDayChartType === "radar" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                        `}
                      >
                        {t("radar")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {hourOfDayChartType === "bar" ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={hourOfDayData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <defs>
                        <linearGradient id="hourBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                        labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                        itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                        formatter={formatTemporalTooltip}
                      />
                      <Legend />
                      <Bar dataKey="listens" name={t("Listens")} fill="url(#hourBarGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : hourOfDayChartType === "radar" ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={hourRadarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, "auto"]} tick={{ fill: "#64748b", fontSize: 10 }} />
                      <Radar name={t("Listens")} dataKey="listens" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} strokeWidth={2} />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                        labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                        itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                        formatter={formatTemporalTooltip}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {hourOfDayData.map((item, index) => {
                      const maxCount = Math.max(...hourOfDayData.map((d) => d.listens), 1);
                      const percentage = (item.listens / maxCount) * 100;
                      return (
                        <div
                          key={item.hour}
                          className="flex items-center gap-4 opacity-0 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                            {item.name}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full overflow-hidden"
                                  style={{ width: `${percentage}%` }}
                                >
                                  <div
                                    className="h-full w-full rounded-full bg-gradient-to-r from-cyan-500 to-accent-violet scale-x-0 origin-left animate-grow-bar"
                                    style={{ animationDelay: `${index * 50 + 100}ms` }}
                                  />
                                </div>
                              </div>
                              <div className="w-14 text-sm font-semibold text-gray-900 dark:text-white text-right tabular-nums shrink-0">
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
        )}
      </div>
    </>
  );
}

function TemporalAnalysisFallback() {
  const t = useTranslations("temporal-analysis");
  return (
    <div className="mt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>
      <TemporalAnalysisSkeleton />
    </div>
  );
}

export default function TemporalAnalysisPage() {
  return (
    <Suspense fallback={<TemporalAnalysisFallback />}>
      <TemporalAnalysisContent />
    </Suspense>
  );
}
