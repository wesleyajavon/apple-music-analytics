"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { EmptyState } from "@/lib/components/empty-state";

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

function GenresContent() {
  const searchParams = useSearchParams();
  // Par défaut, utiliser les 30 derniers jours si aucune date n'est spécifiée
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  
  // Si aucune date n'est spécifiée, utiliser les 30 derniers jours par défaut
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  
  const startDate = startDateParam || defaultStartDate.toISOString().split("T")[0];
  const endDate = endDateParam || defaultEndDate.toISOString().split("T")[0];
  
  const [chartType, setChartType] = useState<ChartType>("pie");

  const { data, isLoading, error, refetch } = useGenres(startDate, endDate);

  // Formater les données pour les graphiques
  const chartData =
    data?.data.map((item) => ({
      name: item.genre,
      value: item.count,
      percentage: item.percentage,
      count: item.count,
    })) || [];

  // Custom tooltip pour afficher les pourcentages et comptages
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.count.toLocaleString("fr-FR")} écoutes
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Label pour le pie chart (simplifié pour éviter la surcharge)
  const renderCustomLabel = (entry: any) => {
    // Afficher seulement le pourcentage si > 5% pour éviter le surchargement
    if (entry.percentage > 5) {
      return `${entry.percentage.toFixed(1)}%`;
    }
    return "";
  };

  return (
    <>
      {/* Page content */}
      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Genres
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Répartition de vos écoutes par genre musical
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState message="Aucune donnée d'écoute disponible pour cette période" />
        ) : (
          <div className="space-y-6">
            {/* Chart type selector */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type de graphique :
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType("pie")}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${
                        chartType === "pie"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }
                    `}
                  >
                    Camembert
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${
                        chartType === "bar"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }
                    `}
                  >
                    Barres
                  </button>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Distribution des genres
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total: {data.totalListens.toLocaleString("fr-FR")} écoutes
                </p>
              </div>

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
                    <Tooltip content={<CustomTooltip />} />
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
                      stroke="#e5e7eb"
                      className="dark:stroke-gray-700"
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
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Écoutes"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Table avec les détails */}
              <div className="mt-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Genre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Nombre d&apos;écoutes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Pourcentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {chartData.map((item, index) => (
                      <tr key={item.name}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="w-4 h-4 rounded-full mr-3"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.count.toLocaleString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {item.percentage.toFixed(1)}%
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

export default function GenresPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Genres
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Répartition de vos écoutes par genre musical
              </p>
            </div>
            <LoadingState />
          </div>
      }
    >
      <GenresContent />
    </Suspense>
  );
}
