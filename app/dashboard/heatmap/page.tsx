"use client";

import { useMemo, useCallback, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarHeatmap, HeatmapDataPoint } from "@/lib/components/calendar-heatmap";
import { useTimeline, useListens } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";

type ViewMode = "year" | "month" | "weekday";

function HeatmapContent() {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

    // Calculer la distribution par jour de la semaine
    const weekdayDistribution = [0, 0, 0, 0, 0, 0, 0]; // Dimanche à Samedi
    timelineData.forEach((point) => {
      const date = new Date(point.date);
      const dayOfWeek = date.getDay(); // 0 = Dimanche, 6 = Samedi
      weekdayDistribution[dayOfWeek] += point.listens;
    });

    // Trouver le jour de la semaine avec le plus d'écoutes
    const maxWeekdayIndex = weekdayDistribution.indexOf(Math.max(...weekdayDistribution));
    const weekdays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

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
        formatted: new Date(maxDay.date).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      } : null,
      minDay: minDay ? {
        date: minDay.date,
        listens: minDay.listens,
        formatted: new Date(minDay.date).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      } : null,
      mostActiveWeekday: weekdays[maxWeekdayIndex],
      weekdayDistribution,
    };
  }, [timelineData]);

  // Filtrer les données selon le mode d'affichage
  const filteredData = useMemo(() => {
    if (viewMode === "year") {
      return heatmapData;
    }

    if (viewMode === "month") {
      // Afficher uniquement le mois courant
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      return heatmapData.filter((point) => {
        const date = new Date(point.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      });
    }

    if (viewMode === "weekday") {
      // Afficher tous les lundis, puis tous les mardis, etc.
      return heatmapData;
    }

    return heatmapData;
  }, [heatmapData, viewMode]);

  // Calculer les dates de début/fin filtrées
  const filteredDateRange = useMemo(() => {
    if (viewMode === "month") {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: firstDay.toISOString().split("T")[0],
        endDate: lastDay.toISOString().split("T")[0],
      };
    }
    return { startDate, endDate };
  }, [viewMode, startDate, endDate]);

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
    return <LoadingState message="Chargement du calendrier d'écoute..." />;
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
        message="Aucune donnée d'écoute disponible pour cette période. Importez vos données pour voir le calendrier."
        icon="📅"
      />
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* En-tête avec sélecteur de vue */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Heatmap d&apos;écoute
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Visualisez vos patterns d&apos;écoute quotidiens avec un calendrier interactif
          </p>
        </div>

        {/* Sélecteur de mode de vue */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Vue :
          </span>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { value: "year" as ViewMode, label: "Annuelle" },
              { value: "month" as ViewMode, label: "Mensuelle" },
              { value: "weekday" as ViewMode, label: "Jour semaine" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setViewMode(option.value)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${
                    viewMode === option.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Jours actifs
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.daysWithListens.toLocaleString("fr-FR")} / {stats.totalDays.toLocaleString("fr-FR")}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {Math.round((stats.daysWithListens / stats.totalDays) * 100)}% des jours
              </dd>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Moyenne quotidienne
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.averageListens.toLocaleString("fr-FR")}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                écoutes par jour
              </dd>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Jour le plus actif
              </dt>
              {stats.maxDay ? (
                <>
                  <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.maxDay.listens.toLocaleString("fr-FR")} écoutes
                  </dd>
                  <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
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

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Jour préféré
              </dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {stats.mostActiveWeekday}
              </dd>
              <dd className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                jour de la semaine le plus actif
              </dd>
            </dl>
          </div>
        </div>
      )}

      {/* Calendrier heatmap */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Calendrier d&apos;écoute
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Cliquez sur un jour pour voir les détails des écoutes
          </p>
          {filteredData.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Aucune donnée disponible pour cette période
            </p>
          )}
        </div>
        
        {filteredData.length > 0 ? (
          <CalendarHeatmap
            data={filteredData}
            startDate={filteredDateRange.startDate}
            endDate={filteredDateRange.endDate}
            selectedDate={selectedDate}
            onDayClick={handleDayClick}
          />
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Aucune donnée disponible pour cette période</p>
          </div>
        )}
      </div>

      {/* Distribution par jour de la semaine */}
      {stats && viewMode === "year" && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribution par jour de la semaine
          </h2>
          <div className="space-y-3">
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
                  <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {name}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm font-semibold text-gray-900 dark:text-white text-right">
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

    {/* Détails du jour sélectionné - Composant séparé complètement en bas */}
    {selectedDate && (
      <div className="mt-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Détails du {(() => {
                  // Parser la date YYYY-MM-DD sans problème de fuseau horaire
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {dayListensData.total} écoute{dayListensData.total > 1 ? "s" : ""} au total
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Fermer les détails"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoadingDayListens ? (
            <LoadingState message="Chargement des détails..." />
          ) : dayListensData && dayListensData.data.length > 0 ? (
            <div className="space-y-4">
              {/* Statistiques du jour */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total d&apos;écoutes</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {dayListensData.total.toLocaleString("fr-FR")}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Artistes uniques</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {new Set(dayListensData.data.map(l => l.artistName)).size.toLocaleString("fr-FR")}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Titres uniques</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {new Set(dayListensData.data.map(l => `${l.trackTitle}-${l.artistName}`)).size.toLocaleString("fr-FR")}
                  </div>
                </div>
              </div>

              {/* Top artistes du jour */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
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
                    .map(([artist, count], index) => (
                      <div
                        key={artist}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-gray-400 dark:text-gray-500 w-6">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {artist}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {count} écoute{count > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Liste des écoutes */}
              <div>
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  Écoutes détaillées
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dayListensData.data
                    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
                    .map((listen, index) => (
                      <div
                        key={listen.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {listen.trackTitle}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {listen.artistName}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(listen.playedAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                            {listen.source === "lastfm" ? "Last.fm" : "Apple Music"}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : dayListensData && dayListensData.data.length === 0 ? (
            <EmptyState
              message="Aucune écoute trouvée pour cette date"
              icon="🎵"
            />
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
      <Suspense fallback={<LoadingState message="Chargement du calendrier..." />}>
        <HeatmapContent />
      </Suspense>
    </div>
  );
}
