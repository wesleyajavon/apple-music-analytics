"use client";

import { useMemo, useCallback, Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarHeatmap, HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { useTimeline, useListens, useTemporalAnalysis } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, emptyStatePresets } from "@/lib/components/empty-state";
import { HeatmapSkeleton, DayDetailsSkeleton } from "@/lib/components/skeleton-loaders";

/** Normalise une date (string ou Date) en YYYY-MM-DD pour éviter Invalid Date */
function toDateOnly(date: string | Date): string {
  if (typeof date === "string") return date.split("T")[0];
  return date.toISOString().split("T")[0];
}

function HeatmapContent() {
  const searchParams = useSearchParams();
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

  // Récupérer les données de timeline (par jour)
  const { data: timelineData, isLoading, error, refetch } = useTimeline(
    startDate,
    endDate,
    "day"
  );

  // Utiliser l'analyse temporelle pour "Jour préféré" - même logique que temporal-analysis
  // (EXTRACT(DOW FROM playedAt) en SQL), évite les bugs de timezone de getDay() côté client
  const { data: temporalData } = useTemporalAnalysis(startDate, endDate, undefined, {
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

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return null;
    }

    const totalListens = timelineData.reduce((sum, point) => sum + point.listens, 0);
    const daysWithListens = timelineData.filter((point) => point.listens > 0).length;
    const averageListens = totalListens / timelineData.length;
    
    const sortedByListens = [...timelineData].sort((a, b) => b.listens - a.listens);
    const maxListens = sortedByListens[0]?.listens || 0;
    const minListens = timelineData.filter((p) => p.listens > 0).sort((a, b) => a.listens - b.listens)[0]?.listens || 0;
    
    const maxDay = sortedByListens[0];
    const minDay = timelineData.filter((p) => p.listens > 0).sort((a, b) => a.listens - b.listens)[0];

    // Distribution par jour : utiliser temporalData (EXTRACT(DOW) en SQL) si dispo,
    // sinon fallback sur timeline (évite bugs timezone de getDay())
    // weekdayDistribution: index 0=Dimanche, 1=Lundi, ..., 6=Samedi (pour le chart)
    const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0];
    let mostActiveWeekday = "—";
    if (temporalData?.byDayOfWeek?.length) {
      temporalData.byDayOfWeek.forEach((d, i) => {
        weekdayDistribution[(i + 1) % 7] = d.listens; // temporal: Lun=0..Dim=6 → 0=Dim,1=Lun..
      });
      mostActiveWeekday = temporalData.peakDay?.dayName ?? "—";
    } else {
      timelineData.forEach((point) => {
        const dayOfWeek = new Date(toDateOnly(point.date) + "T12:00:00Z").getUTCDay();
        weekdayDistribution[dayOfWeek] += point.listens;
      });
      const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const maxWeekdayIndex = weekdayDistribution.indexOf(Math.max(...weekdayDistribution));
      mostActiveWeekday = weekdays[maxWeekdayIndex];
    }

    return {
      totalListens,
      daysWithListens,
      totalDays: timelineData.length,
      averageListens: Math.round(averageListens * 10) / 10,
      maxListens,
      minListens,
      maxDay: maxDay ? {
        date: maxDay.date,
        listens: maxDay.listens,
        formatted: new Date(toDateOnly(maxDay.date) + "T12:00:00Z").toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      } : null,
      minDay: minDay ? {
        date: minDay.date,
        listens: minDay.listens,
        formatted: new Date(toDateOnly(minDay.date) + "T12:00:00Z").toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      } : null,
      mostActiveWeekday,
      weekdayDistribution,
    };
  }, [timelineData, temporalData]);


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
    };
  }, [selectedDate]);

  const { data: dayListensData, isLoading: isLoadingDayListens } = useListens(
    dayListensParams,
    { enabled: !!selectedDate }
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <HeatmapSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        message="Impossible de charger les données du calendrier"
        onRetry={handleRetry}
      />
    );
  }

  if (!timelineData || timelineData.length === 0) {
    return (
      <EmptyState
        {...emptyStatePresets.importData}
        message="Aucune donnée d'écoute pour cette période"
        description="Importez vos données Last.fm ou Replay pour afficher le calendrier d'écoute."
      />
    );
  }

  return (
    <>
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Heatmap d&apos;écoute
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          Visualisez vos patterns d&apos;écoute quotidiens avec un calendrier interactif style GitHub. Cliquez sur un jour pour voir les détails.
        </p>
      </header>

      {/* Statistiques principales */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-rose bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Jours actifs
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {stats.daysWithListens.toLocaleString("fr-FR")} / {stats.totalDays.toLocaleString("fr-FR")}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                {Math.round((stats.daysWithListens / stats.totalDays) * 100)}% des jours
              </dd>
            </dl>
          </div>

          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-violet bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Moyenne quotidienne
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {stats.averageListens.toLocaleString("fr-FR")}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                écoutes par jour
              </dd>
            </dl>
          </div>

          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-indigo bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Jour le plus actif
              </dt>
              {stats.maxDay ? (
                <>
                  <dd className="mt-1 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {stats.maxDay.listens.toLocaleString("fr-FR")} écoutes
                  </dd>
                  <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 truncate">
                    {stats.maxDay.formatted}
                  </dd>
                </>
              ) : (
                <dd className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Aucune donnée
                </dd>
              )}
            </dl>
          </div>

          <div className="overflow-hidden rounded-xl border border-l-4 border-gray-100 dark:border-gray-700/50 border-l-accent-cyan bg-white dark:bg-gray-800/90 shadow-card p-5 transition-all duration-300 hover:shadow-card-hover">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Jour préféré
              </dt>
              <dd className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {stats.mostActiveWeekday}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                jour le plus actif (période sélectionnée)
              </dd>
            </dl>
          </div>
        </div>
      )}

      {/* Calendrier heatmap */}
      <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Calendrier d&apos;écoute
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Cliquez sur un jour pour voir les détails des écoutes
          </p>
          {heatmapData.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Aucune donnée disponible pour cette période
            </p>
          )}
        </div>
        <div className="p-6">
        
        {heatmapData.length > 0 ? (
          <CalendarHeatmap
            data={heatmapData}
            startDate={startDate}
            endDate={endDate}
            selectedDate={selectedDate}
            onDayClick={handleDayClick}
          />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Aucune donnée disponible pour cette période.</p>
          </div>
        )}
        </div>
      </div>

      {/* Distribution par jour de la semaine */}
      {stats && (
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Distribution par jour de la semaine
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Répartition de vos écoutes selon les jours
            </p>
          </div>
          <div className="p-6 space-y-4">
            {[
              { name: "Lundi", index: 1 },
              { name: "Mardi", index: 2 },
              { name: "Mercredi", index: 3 },
              { name: "Jeudi", index: 4 },
              { name: "Vendredi", index: 5 },
              { name: "Samedi", index: 6 },
              { name: "Dimanche", index: 0 },
            ].map(({ name, index }) => {
              const count = stats.weekdayDistribution[index];
              const maxCount = Math.max(...stats.weekdayDistribution);
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={name} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                    {name}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-indigo transition-all duration-500 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-14 text-sm font-semibold text-gray-900 dark:text-white text-right tabular-nums shrink-0">
                        {count.toLocaleString("fr-FR")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* Détails du jour sélectionné */}
    {selectedDate && (
      <div ref={dayDetailsRef} className="mt-8 scroll-mt-4">
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Détails du {(() => {
                  const [year, month, day] = selectedDate.split("-").map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  });
                })()}
              </h2>
              {dayListensData && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {dayListensData.total} écoute{dayListensData.total > 1 ? "s" : ""} au total
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              aria-label="Fermer les détails"
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
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total d&apos;écoutes</div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                    {dayListensData.total.toLocaleString("fr-FR")}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Artistes uniques</div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                    {new Set(dayListensData.data.map(l => l.artistName)).size.toLocaleString("fr-FR")}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 p-4">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Titres uniques</div>
                  <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                    {new Set(dayListensData.data.map(l => `${l.trackTitle}-${l.artistName}`)).size.toLocaleString("fr-FR")}
                  </div>
                </div>
              </div>

              {/* Top artistes du jour */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Top artistes
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
                            {count} écoute{count > 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Liste des écoutes */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Écoutes détaillées
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
                            {new Date(listen.playedAt).toLocaleTimeString("fr-FR", {
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
