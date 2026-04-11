"use client";

import { useMemo, useCallback, Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CalendarHeatmap, HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { useTimeline, useListens, useTemporalAnalysis } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { HeatmapSkeleton, DayDetailsSkeleton } from "@/lib/components/skeleton-loaders";

/** Icônes pour les cartes de stats - cohérent avec Overview */
const HeatmapStatIcons = {
  activeDays: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  avgDaily: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  mostActiveDay: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 3.716m-6.536-1.206A6.726 6.726 0 016.75 9.75m0 0a6.726 6.726 0 003.536 2.748M12 2.25v.75m0 12v.75m0-12v-.75m0 12v-.75" />
    </svg>
  ),
  favoriteDay: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
} as const;

/** Normalise une date (string ou Date) en YYYY-MM-DD pour éviter Invalid Date */
function toDateOnly(date: string | Date): string {
  if (typeof date === "string") return date.split("T")[0];
  return date.toISOString().split("T")[0];
}

function HeatmapContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("heatmap");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dayDetailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate && dayDetailsRef.current) {
      dayDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedDate]);

  // Calculer les dates par défaut (décembre 2025 à décembre 2026)
  const defaultStartDate = useMemo(() => {
    const date = new Date(2025, 11, 1); // Décembre 2025 (mois 11 = décembre)
    return date.toISOString().split("T")[0];
  }, []);

  const defaultEndDate = useMemo(() => {
    const date = new Date(2026, 11, 31); // 31 décembre 2026
    return date.toISOString().split("T")[0];
  }, []);

  const startDate = searchParams.get("startDate") || defaultStartDate;
  const endDate = searchParams.get("endDate") || defaultEndDate;
  const userId = searchParams.get("userId") ?? undefined;

  // Récupérer les données de timeline (par jour)
  const { data: timelineData, isLoading, error, refetch } = useTimeline(
    startDate,
    endDate,
    "day",
    userId
  );

  // Utiliser l'analyse temporelle pour "Jour préféré" - même logique que temporal-analysis
  // (EXTRACT(DOW FROM playedAt) en SQL), évite les bugs de timezone de getDay() côté client
  const { data: temporalData } = useTemporalAnalysis(startDate, endDate, userId, {
    enabled: !!startDate && !!endDate,
  });

  // Transformer les données pour le heatmap
  const heatmapData: HeatmapDataPoint[] = useMemo(() => {
    if (!timelineData) return [];
    
    return timelineData.map((point) => ({
      date: point.date,
      count: point.listens,
    }));
  }, [timelineData]);

  // Calculer le nombre total de jours dans la plage (pour active days, etc.)
  const totalDaysInRange = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);

  // Pour la moyenne quotidienne : utiliser les jours du premier au dernier jour avec données
  // (pas 365 ni la plage filtrée) — évite de diluer la moyenne avec des jours sans données
  const daysForDailyAverage = useMemo(() => {
    if (!timelineData || timelineData.length === 0) return 1;
    const dates = timelineData.map((p) => toDateOnly(p.date));
    const first = new Date(Math.min(...dates.map((d) => new Date(d).getTime())));
    const last = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
    const diffTime = last.getTime() - first.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [timelineData]);

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return null;
    }

    const totalListens = timelineData.reduce((sum, point) => sum + point.listens, 0);
    const daysWithListens = timelineData.filter((point) => point.listens > 0).length;
    const averageListens = totalListens / daysForDailyAverage;
    
    const sortedByListens = [...timelineData].sort((a, b) => b.listens - a.listens);
    const maxListens = sortedByListens[0]?.listens || 0;
    const minListens = timelineData.filter((p) => p.listens > 0).sort((a, b) => a.listens - b.listens)[0]?.listens || 0;
    
    const maxDay = sortedByListens[0];
    const minDay = timelineData.filter((p) => p.listens > 0).sort((a, b) => a.listens - b.listens)[0];

    // Distribution par jour : utiliser temporalData (EXTRACT(DOW) en SQL) si dispo,
    // sinon fallback sur timeline (évite bugs timezone de getDay())
    // weekdayDistribution: index 0=Dimanche, 1=Lundi, ..., 6=Samedi (pour le chart)
    const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
    const weekdaysT = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    let mostActiveWeekday = "—";
    if (temporalData?.byDayOfWeek?.length) {
      temporalData.byDayOfWeek.forEach((d, i) => {
        weekdayDistribution[(i + 1) % 7] = d.listens; // temporal: Lun=0..Dim=6 → 0=Dim,1=Lun..
      });
      if (temporalData.peakDay != null) {
        mostActiveWeekday = t(`weekdays.${weekdaysT[temporalData.peakDay.dayOfWeek]}`);
      }
    } else {
      timelineData.forEach((point) => {
        const dayOfWeek = new Date(toDateOnly(point.date) + "T12:00:00Z").getUTCDay();
        weekdayDistribution[dayOfWeek] += point.listens;
      });
      const weekdays = weekdaysT.map((k) => t(`weekdays.${k}`));
      const maxWeekdayIndex = weekdayDistribution.indexOf(Math.max(...weekdayDistribution));
      mostActiveWeekday = weekdays[maxWeekdayIndex];
    }

    return {
      totalListens,
      daysWithListens,
      totalDays: totalDaysInRange,
      averageListens: Math.round(averageListens * 10) / 10,
      maxListens,
      minListens,
      maxDay: maxDay ? {
        date: maxDay.date,
        listens: maxDay.listens,
        formatted: new Date(toDateOnly(maxDay.date) + "T12:00:00Z").toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      } : null,
      minDay: minDay ? {
        date: minDay.date,
        listens: minDay.listens,
        formatted: new Date(toDateOnly(minDay.date) + "T12:00:00Z").toLocaleDateString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      } : null,
      mostActiveWeekday,
    };
  }, [timelineData, temporalData, totalDaysInRange, daysForDailyAverage, t, locale]);


  const handleDayClick = useCallback((date: string, count: number) => {
    if (count === 0) {
      // Si pas d'écoutes, ne rien faire
      setSelectedDate(null);
      return;
    }
    
    // Stocker la date sélectionnée pour afficher les détails
    setSelectedDate(date);
  }, []);

  // Récupérer les écoutes détaillées du jour sélectionné
  // Le service listening-service.ts gère automatiquement l'inclusion de toute la journée
  const dayListensParams = useMemo(() => {
    if (!selectedDate) return undefined;

    return {
      startDate: selectedDate,
      endDate: selectedDate, // Le service ajustera automatiquement pour inclure toute la journée
      limit: 500, // Limite élevée pour avoir toutes les écoutes du jour
      userId,
    };
  }, [selectedDate, userId]);

  const { data: dayListensData, isLoading: isLoadingDayListens } = useListens(
    dayListensParams,
    { enabled: !!selectedDate }
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const dateRangeLabel = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
  }, [startDate, endDate, locale]);

  if (isLoading) {
    return <HeatmapSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        message={t("errorLoading")}
        onRetry={handleRetry}
      />
    );
  }

  if (!timelineData || timelineData.length === 0) {
    return <EmptyState {...emptyStatePresets.importData} />;
  }

  return (
    <>
    <div className="space-y-8">
      <header>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-accent-violet/10 to-accent-indigo/10 dark:from-accent-violet/20 dark:to-accent-indigo/20 border border-accent-violet/20 mb-6">
          <svg className="w-5 h-5 text-accent-violet" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="text-sm font-medium text-accent-violet dark:text-accent-violet">
            {t("dateRangeBadge", { range: dateRangeLabel })}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>

      {/* Spotlight: Calendrier heatmap — élément principal mis en avant */}
      <section
        className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40"
        aria-labelledby="heatmap-spotlight-title"
      >
        {/* Gradient spotlight — effet de lumière centré */}
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
        {/* Glow subtil en bas */}
        <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-[90%] h-24 bg-accent-violet/10 dark:bg-accent-violet/15 blur-3xl rounded-full" />

        <div className="relative">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-indigo/20 text-accent-violet">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <h2 id="heatmap-spotlight-title" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {t("calendarTitle")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("calendarHint")}
                </p>
              </div>
            </div>
            {heatmapData.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t("noDataPeriod")}
              </p>
            )}
          </div>
          <div className="p-6 sm:p-8 md:p-10">
            {heatmapData.length > 0 ? (
              <CalendarHeatmap
                data={heatmapData}
                startDate={startDate}
                endDate={endDate}
                selectedDate={selectedDate}
                onDayClick={handleDayClick}
                locale={locale}
              />
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>{t("noDataPeriod")}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Statistiques principales */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-rose bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-rose/15 text-accent-rose">
                {HeatmapStatIcons.activeDays}
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("activeDays")}
                </dt>
                <dd className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {stats.daysWithListens.toLocaleString(locale)} / {stats.totalDays.toLocaleString(locale)}
                </dd>
                <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {Math.round((stats.daysWithListens / stats.totalDays) * 100)}% {t("ofDays")}
                </dd>
              </dl>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-violet bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
                {HeatmapStatIcons.avgDaily}
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("avgDaily")}
                </dt>
                <dd className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {stats.averageListens.toLocaleString(locale)}
                </dd>
                <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {t("listensPerDay")}
                </dd>
              </dl>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-indigo bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-indigo">
                {HeatmapStatIcons.mostActiveDay}
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("mostActiveDay")}
                </dt>
                {stats.maxDay ? (
                  <>
                    <dd className="mt-0.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {stats.maxDay.listens.toLocaleString(locale)} {t("listensCount")}
                    </dd>
                    <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">
                      {stats.maxDay.formatted}
                    </dd>
                  </>
                ) : (
                  <dd className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {t("noData")}
                  </dd>
                )}
              </dl>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-cyan bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan">
                {HeatmapStatIcons.favoriteDay}
              </div>
              <dl className="min-w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("favoriteDay")}
                </dt>
                <dd className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {stats.mostActiveWeekday}
                </dd>
                <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  {t("favoriteDayHint")}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Détails du jour sélectionné */}
    {selectedDate && (
      <div
        ref={dayDetailsRef}
        className="mt-8 scroll-mt-8 animate-fade-in-up"
        style={{ animationDelay: "0ms" }}
      >
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 border-l-4 border-l-accent-violet bg-white dark:bg-gray-800/90 shadow-card hover:shadow-card-hover transition-all duration-300 ring-2 ring-accent-violet/20">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("dayDetails")} {(() => {
                  const [year, month, day] = selectedDate.split("-").map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });
                })()}
              </h2>
              {dayListensData && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {dayListensData.total} {dayListensData.total > 1 ? t("listens") : t("listen")} {t("inTotal")}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              aria-label={t("closeDetails")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoadingDayListens ? (
            <div className="p-6">
              <DayDetailsSkeleton />
            </div>
          ) : dayListensData && dayListensData.data.length > 0 ? (
            <div className="p-6 space-y-6">
              {/* Statistiques du jour */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("totalListens")}</div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                    {dayListensData.total.toLocaleString(locale)}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("uniqueArtists")}</div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                    {new Set(dayListensData.data.map(l => l.artistName)).size.toLocaleString(locale)}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("uniqueTracks")}</div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                    {new Set(dayListensData.data.map(l => `${l.trackTitle}-${l.artistName}`)).size.toLocaleString(locale)}
                  </div>
                </div>
              </div>

              {/* Top artistes du jour */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t("topArtists")}
                </h3>
                <div className="space-y-2">
                  {Array.from(
                    dayListensData.data.reduce((acc, listen) => {
                      acc.set(listen.artistName, (acc.get(listen.artistName) || 0) + 1);
                      return acc;
                    }, new Map<string, number>())
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([artist, count], index) => {
                      const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                      const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                      const rankStyle = index < 3 ? rankColors[index] : "text-gray-400 dark:text-gray-500";
                      const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-800";
                      return (
                        <div
                          key={artist}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankStyle} ${rankBgStyle}`}>
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {artist}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums shrink-0 ml-3">
                            {count} {count > 1 ? t("listens") : t("listen")}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Liste des écoutes */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {t("detailedListens")}
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dayListensData.data
                    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
                    .map((listen) => (
                      <div
                        key={listen.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {listen.trackTitle}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {listen.artistName}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4 shrink-0">
                          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                            {new Date(listen.playedAt).toLocaleTimeString(locale, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            listen.source === "lastfm"
                              ? "bg-accent-violet/15 text-accent-violet"
                              : "bg-accent-rose/15 text-accent-rose"
                          }`}>
                            {listen.source === "lastfm" ? "Last.fm" : "Apple Music"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : dayListensData && dayListensData.data.length === 0 ? (
            <div className="p-6">
              <EmptyState {...emptyStatePresets.noDayDetail} />
            </div>
          ) : null}
        </div>
      </div>
    )}
    </>
  );
}

export default function HeatmapPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <Suspense fallback={<HeatmapSkeleton />}>
        <HeatmapContent />
      </Suspense>
    </div>
  );
}
