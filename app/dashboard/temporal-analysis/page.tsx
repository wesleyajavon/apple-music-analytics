"use client";

import { Suspense, useMemo, memo } from "react";
import { useSearchParams } from "next/navigation";
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
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";

// Custom tooltip mémorisé pour éviter les re-créations
const CustomTooltip = memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {data.name || data.dayName || `${data.hour}h`}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data.listens.toLocaleString("fr-FR")} écoutes
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data.uniqueTracks.toLocaleString("fr-FR")} titres uniques
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {data.uniqueArtists.toLocaleString("fr-FR")} artistes uniques
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = "CustomTooltip";

function TemporalAnalysisContent() {
  const searchParams = useSearchParams();
  // Par défaut, utiliser les 30 derniers jours si aucune date n'est spécifiée
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  
  // Si aucune date n'est spécifiée, utiliser les 30 derniers jours par défaut
  const defaultEndDate = useMemo(() => new Date(), []);
  const defaultStartDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  }, []);
  
  const startDate = startDateParam || defaultStartDate.toISOString().split("T")[0];
  const endDate = endDateParam || defaultEndDate.toISOString().split("T")[0];
  
  const { data, isLoading, error, refetch } = useTemporalAnalysis(startDate, endDate);

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
      {/* Page content */}
      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analyse Temporelle Avancée
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Patterns d&apos;écoute détaillés par jour de la semaine et par heure de la journée
          </p>
        </div>

        {isLoading ? (
          <LoadingState message="Chargement de l&apos;analyse temporelle..." />
        ) : error ? (
          <ErrorState
            error={error}
            message="Impossible de charger l&apos;analyse temporelle"
            onRetry={() => refetch()}
          />
        ) : !data || (data.byDayOfWeek.length === 0 && data.byHourOfDay.length === 0) ? (
          <EmptyState
            message="Aucune donnée disponible pour cette période. Essayez de modifier les dates de filtrage."
            icon="⏰"
          />
        ) : (
          <div className="space-y-8">
            {/* Moments de pic */}
            {(data.peakDay || data.peakHour) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.peakDay && (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      📅 Jour de pic
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.peakDay.dayName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {data.peakDay.listens.toLocaleString("fr-FR")} écoutes
                    </p>
                  </div>
                )}
                {data.peakHour && (
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      🕐 Heure de pic
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.peakHour.hour}h
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {data.peakHour.listens.toLocaleString("fr-FR")} écoutes
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Graphique par jour de la semaine - Barres */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Écoutes par jour de la semaine
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Répartition de vos écoutes sur les 7 jours de la semaine
                </p>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={dayOfWeekData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    className="dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <Tooltip content={CustomTooltip} />
                  <Legend />
                  <Bar
                    dataKey="listens"
                    name="Écoutes"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique par jour de la semaine - Radar */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pattern hebdomadaire (Radar)
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Visualisation radar des écoutes par jour de la semaine
                </p>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="day"
                    tick={{ fill: "currentColor", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, "auto"]}
                    tick={{ fill: "currentColor", fontSize: 10 }}
                  />
                  <Radar
                    name="Écoutes"
                    dataKey="listens"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Tooltip content={CustomTooltip} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Graphique par heure de la journée */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Écoutes par heure de la journée
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Répartition de vos écoutes sur les 24 heures de la journée
                </p>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={hourOfDayData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    className="dark:stroke-gray-700"
                  />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fontSize: 12 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <Tooltip content={CustomTooltip} />
                  <Legend />
                  <Bar
                    dataKey="listens"
                    name="Écoutes"
                    fill="#8b5cf6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tableau détaillé par jour de la semaine */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Détails par jour de la semaine
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Jour
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nombre d&apos;écoutes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Titres uniques
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Artistes uniques
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {dayOfWeekData.map((item) => (
                      <tr key={item.name}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.listens.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.uniqueTracks.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.uniqueArtists.toLocaleString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function TemporalAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analyse Temporelle Avancée
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Patterns d&apos;écoute détaillés par jour de la semaine et par heure de la journée
            </p>
          </div>
          <LoadingState message="Chargement de l&apos;analyse temporelle..." />
        </div>
      }
    >
      <TemporalAnalysisContent />
    </Suspense>
  );
}
