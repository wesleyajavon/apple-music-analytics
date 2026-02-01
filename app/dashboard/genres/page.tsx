"use client";

import { Suspense, useState, useMemo, useCallback, memo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useGenres } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, emptyStatePresets } from "@/lib/components/empty-state";
import { GenresSkeleton } from "@/lib/components/skeleton-loaders";

type ChartType = "pie" | "bar";

// Couleurs pour les genres (palette colorée)
const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#14b8a6", // teal
];

// Custom tooltip - classe chart-tooltip-accessible pour contraste forcé
const CustomTooltip = memo(({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="chart-tooltip-accessible min-w-[180px] p-4">
        <p className="font-semibold">{data.name}</p>
        <p className="chart-tooltip-secondary text-sm mt-1">
          {data.count.toLocaleString("fr-FR")} écoutes · {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = "CustomTooltip";

function GenresContent() {
  const pathname = usePathname();
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
  
  const [chartType, setChartType] = useState<ChartType>("pie");

  const { data, isLoading, error, refetch } = useGenres(startDate, endDate);

  // Formater les données pour les graphiques - mémorisé pour éviter les recalculs
  const chartData = useMemo(
    () =>
      data?.data.map((item) => ({
        name: item.genre,
        value: item.count,
        percentage: item.percentage,
        count: item.count,
      })) || [],
    [data]
  );

  // Label pour le pie chart (simplifié pour éviter la surcharge) - mémorisé
  const renderCustomLabel = useCallback((entry: any) => {
    // Afficher seulement le pourcentage si > 5% pour éviter le surchargement
    if (entry.percentage > 5) {
      return `${entry.percentage.toFixed(1)}%`;
    }
    return "";
  }, []);

  return (
    <>
      <div className="mt-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Genres
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            Répartition de vos écoutes par genre musical. Visualisez vos préférences en camembert ou en barres.
          </p>
        </header>

        {isLoading ? (
          <GenresSkeleton />
        ) : error ? (
          <ErrorState
            error={error}
            message="Impossible de charger la répartition des genres"
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            {...emptyStatePresets.changeDates(pathname)}
            message="Aucune donnée de genre pour cette période"
            description="Modifiez les dates dans la barre de filtres pour afficher la répartition des genres."
          />
        ) : (
          <div className="space-y-6">
            {/* Chart type selector */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">
                Graphique
              </span>
              <div className="flex items-center bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <button
                  onClick={() => setChartType("pie")}
                  className={`
                    px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                    ${chartType === "pie" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                  `}
                >
                  Camembert
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`
                    px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                    ${chartType === "bar" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                  `}
                >
                  Barres
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Distribution des genres
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Total: {data.totalListens.toLocaleString("fr-FR")} écoutes
                </p>
              </div>
              <div className="p-6">
              {chartType === "pie" ? (
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={CustomTooltip} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => value}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                    />
                    <YAxis
                      tick={{ fill: "currentColor", fontSize: 12 }}
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                    />
                    <defs>
                      <linearGradient id="genreBarGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <Tooltip content={CustomTooltip} />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Écoutes"
                      fill="url(#genreBarGradient)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Liste des genres avec barres de progression - design moderne */}
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Détail par genre
                </h3>
                <div className="space-y-4">
                  {chartData.map((item, index) => {
                    const maxCount = chartData[0]?.count ?? 1;
                    const widthPercent = (item.count / maxCount) * 100;
                    const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                    const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                    const rankStyle = index < 3 ? rankColors[index] : "text-gray-400 dark:text-gray-500";
                    const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-800";
                    return (
                      <div key={item.name} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankStyle} ${rankBgStyle}`}>
                              {index + 1}
                            </span>
                            <div
                              className="w-3 h-3 shrink-0 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              aria-hidden
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 ml-2 shrink-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                              {item.count.toLocaleString("fr-FR")}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right tabular-nums">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="ml-10 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/50">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function GenresPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-6">
            <header className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Genres
              </h1>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
                Répartition de vos écoutes par genre musical
              </p>
            </header>
            <GenresSkeleton />
          </div>
      }
    >
      <GenresContent />
    </Suspense>
  );
}