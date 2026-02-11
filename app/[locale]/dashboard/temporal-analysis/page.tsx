"use client";

import { Suspense, useMemo } from "react";
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
  const t = useTranslations("temporal-analysis");
  const locale = useLocale();
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
  const { data, isLoading, error, refetch } = useTemporalAnalysis(undefined, undefined);

  // Formater les données pour les graphiques - mémorisé pour éviter les recalculs
  const dayOfWeekData = useMemo(
    () =>
      data?.byDayOfWeek.map((item) => ({
        name: item.dayName,
        dayName: item.dayName,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      })) || [],
    [data]
  );

  const hourOfDayData = useMemo(
    () =>
      data?.byHourOfDay.map((item) => ({
        name: `${item.hour}h`,
        hour: item.hour,
        listens: item.listens,
        uniqueTracks: item.uniqueTracks,
        uniqueArtists: item.uniqueArtists,
      })) || [],
    [data]
  );

  // Données pour le graphique radar (jours de la semaine)
  const emptyStatePresets = useEmptyStatePresets();

  const radarData = useMemo(
    () =>
      data?.byDayOfWeek.map((item) => ({
        day: item.dayName,
        listens: item.listens,
      })) || [],
    [data]
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
            {/* Moments de pic */}
            {(data.peakDay || data.peakHour) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {data.peakDay && (
                  <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-violet bg-white dark:bg-gray-800/90 shadow-card p-6 transition-all duration-300 hover:shadow-card-hover">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                      </span>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("peakDay")}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {data.peakDay.dayName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                      {data.peakDay.listens.toLocaleString(locale)} {t("listens")}
                    </p>
                  </div>
                )}
                {data.peakHour && (
                  <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-indigo bg-white dark:bg-gray-800/90 shadow-card p-6 transition-all duration-300 hover:shadow-card-hover">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-indigo">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </span>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("peakHour")}
                      </h3>
                    </div>
                    <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {data.peakHour.hour}h
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                      {data.peakHour.listens.toLocaleString(locale)} {t("listens")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Graphique par jour de la semaine - Barres */}
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("listensByWeekday")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("listensByWeekdayHint")}
                </p>
              </div>
              <div className="p-6">
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
              </div>
            </div>

            {/* Graphique par jour de la semaine - Radar */}
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("weeklyPattern")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("weeklyPatternHint")}
                </p>
              </div>
              <div className="p-6">
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
              </div>
            </div>

            {/* Graphique par heure de la journée */}
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("listensByHour")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("listensByHourHint")}
                </p>
              </div>
              <div className="p-6">
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
              </div>
            </div>

            {/* Détails par jour de la semaine - card list */}
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t("detailsByWeekday")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("detailsByWeekdayHint")}
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {dayOfWeekData.map((item, index) => {
                    const maxListens = Math.max(...dayOfWeekData.map((d) => d.listens), 1);
                    const widthPercent = (item.listens / maxListens) * 100;
                    return (
                      <div
                        key={item.name}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-violet/15 text-accent-violet text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <span className="block text-xs text-gray-500 dark:text-gray-400">{t("Listens")}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                                {item.listens.toLocaleString(locale)}
                              </span>
                            </div>
                            <div className="text-right min-w-[52px]">
                              <span className="block text-xs text-gray-500 dark:text-gray-400">{t("tracks")}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                                {item.uniqueTracks.toLocaleString(locale)}
                              </span>
                            </div>
                            <div className="text-right min-w-[52px]">
                              <span className="block text-xs text-gray-500 dark:text-gray-400">{t("artists")}</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                                {item.uniqueArtists.toLocaleString(locale)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-indigo transition-all duration-500 ease-out"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
