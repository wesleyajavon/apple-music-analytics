"use client";

import { memo, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useOverviewStats, useTimeline, useGenres } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";

/**
 * Formate les secondes en format lisible (heures, minutes)
 * Retourne "Non disponible" si seconds est 0 ou négatif
 * Fonction pure, peut être utilisée sans mémorisation
 */
function formatTime(seconds: number): string {
  if (seconds <= 0) {
    return "Non disponible";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Calcule la période précédente basée sur la période actuelle
 */
function getPreviousPeriod(
  startDate?: string,
  endDate?: string
): { prevStartDate: string; prevEndDate: string } | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  return {
    prevStartDate: prevStart.toISOString().split("T")[0],
    prevEndDate: prevEnd.toISOString().split("T")[0],
  };
}

/**
 * Calcule le pourcentage de variation entre deux valeurs
 */
function calculateChange(current: number, previous: number): {
  value: number;
  isPositive: boolean;
} {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  }
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(change), isPositive: change >= 0 };
}

/**
 * Composant de carte statistique mémorisé pour éviter les re-renders inutiles
 */
const StatCard = memo(({ 
  icon, 
  label, 
  value,
  change,
}: { 
  icon: string; 
  label: string; 
  value: string | number;
  change?: { value: number; isPositive: boolean };
}) => (
  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="text-2xl">{icon}</div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {label}
            </dt>
            <dd className="text-lg font-medium text-gray-900 dark:text-white">
              {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
            </dd>
            {change && (
              <dd className="text-xs mt-1">
                <span
                  className={`font-medium ${
                    change.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {change.isPositive ? "↑" : "↓"} {change.value.toFixed(1)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  vs période précédente
                </span>
              </dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  </div>
));

StatCard.displayName = "StatCard";

function OverviewContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  // Calculer la période précédente pour les comparaisons
  const previousPeriod = useMemo(
    () => getPreviousPeriod(startDate, endDate),
    [startDate, endDate]
  );

  // Statistiques actuelles
  const { data, isLoading, error, refetch } = useOverviewStats(
    startDate,
    endDate
  );

  // Statistiques de la période précédente
  const { data: previousData } = useOverviewStats(
    previousPeriod?.prevStartDate,
    previousPeriod?.prevEndDate,
    undefined,
    { enabled: !!previousPeriod }
  );

  // Timeline pour le mini-graphique (30 derniers jours par défaut)
  const timelineStartDate = useMemo(() => {
    if (startDate) return startDate;
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  }, [startDate]);

  const timelineEndDate = endDate || new Date().toISOString().split("T")[0];

  const { data: timelineData } = useTimeline(
    timelineStartDate,
    timelineEndDate,
    "day"
  );

  // Top genres (top 6) - utiliser les mêmes dates par défaut que la timeline
  const genresStartDate = startDate || timelineStartDate;
  const genresEndDate = endDate || timelineEndDate;
  const { data: genresData } = useGenres(genresStartDate, genresEndDate);

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  // Calculer les variations
  const changes = useMemo(() => {
    if (!data || !previousData) return null;
    return {
      totalListens: calculateChange(data.totalListens, previousData.totalListens),
      uniqueArtists: calculateChange(data.uniqueArtists, previousData.uniqueArtists),
      uniqueTracks: calculateChange(data.uniqueTracks, previousData.uniqueTracks),
      totalPlayTime: calculateChange(data.totalPlayTime, previousData.totalPlayTime),
    };
  }, [data, previousData]);

  // Formater les données de timeline pour le graphique
  const chartData = useMemo(
    () =>
      timelineData?.map((point) => {
        const d = new Date(point.date);
        return {
          ...point,
          formattedDate: d.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
          }),
        };
      }) || [],
    [timelineData]
  );

  // Top genres pour l'affichage
  const topGenres = useMemo(
    () => genresData?.data.slice(0, 6) || [],
    [genresData]
  );

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        message="Impossible de charger les statistiques"
        onRetry={handleRetry}
      />
    );
  }

  if (!data || data.totalListens === 0) {
    return (
      <EmptyState
        message="Aucune donnée d'écoute disponible. Importez vos données pour voir vos statistiques."
        icon="📊"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Cartes statistiques principales */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon="🎵"
          label="Total d'écoutes"
          value={data.totalListens}
          change={changes?.totalListens}
        />
        <StatCard
          icon="🎤"
          label="Artistes uniques"
          value={data.uniqueArtists}
          change={changes?.uniqueArtists}
        />
        <StatCard
          icon="🎧"
          label="Titres uniques"
          value={data.uniqueTracks}
          change={changes?.uniqueTracks}
        />
        <StatCard
          icon="⏱️"
          label="Temps total"
          value={formatTime(data.totalPlayTime)}
          change={changes?.totalPlayTime}
        />
      </div>

      {/* Mini-graphique de timeline */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Évolution récente
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Nombre d&apos;écoutes par jour
              </p>
            </div>
            <Link
              href="/dashboard/timeline"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Voir plus →
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                className="dark:stroke-gray-700"
              />
              <XAxis
                dataKey="formattedDate"
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="#6b7280"
                className="dark:stroke-gray-400"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 11 }}
                stroke="#6b7280"
                className="dark:stroke-gray-400"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString("fr-FR")} écoutes`,
                  "Écoutes",
                ]}
              />
              <Line
                type="monotone"
                dataKey="listens"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 2 }}
                activeDot={{ r: 4 }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top genres */}
      {topGenres.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top genres
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Vos genres les plus écoutés
              </p>
            </div>
            <Link
              href="/dashboard/genres"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Voir tout →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Graphique en barres horizontal */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topGenres.map((g) => ({
                    name: g.genre,
                    value: g.count,
                    percentage: g.percentage,
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e5e7eb"
                    className="dark:stroke-gray-700"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "currentColor", fontSize: 11 }}
                    stroke="#6b7280"
                    className="dark:stroke-gray-400"
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.98)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, payload: any) => {
                      const data = Array.isArray(payload) ? payload[0]?.payload : payload?.payload;
                      const percentage = data?.percentage || 0;
                      return [
                        `${value.toLocaleString("fr-FR")} écoutes (${percentage.toFixed(1)}%)`,
                        "Écoutes",
                      ];
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Liste des genres */}
            <div className="space-y-3">
              {topGenres.map((genre, index) => (
                <div
                  key={genre.genre}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <span className="text-lg font-semibold text-gray-400 dark:text-gray-500 mr-3">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {genre.genre}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {genre.count.toLocaleString("fr-FR")}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                      {genre.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Statistiques générales de votre écoute musicale
        </p>
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}

