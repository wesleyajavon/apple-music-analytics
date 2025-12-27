"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTimeline } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";
import { PeriodSelector, PeriodType } from "@/lib/components/period-selector";

/**
 * Formate une date selon le type de période
 */
function formatDate(date: string, period: PeriodType): string {
  switch (period) {
    case "day": {
      const d = new Date(date);
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
    }
    case "week": {
      // Format: "01/01 - 07/01" (début - fin de semaine)
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const startStr = weekStart.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      const endStr = weekEnd.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      return `${startStr} - ${endStr}`;
    }
    case "month": {
      // Format: "janv. 2024" - l'API retourne "YYYY-MM"
      const [year, month] = date.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
      });
    }
  }
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const period = (searchParams.get("period") || "day") as PeriodType;

  const { data, isLoading, error, refetch } = useTimeline(
    startDate,
    endDate,
    period
  );

  // Format data for chart with proper date formatting
  const chartData =
    data?.map((point) => ({
      ...point,
      formattedDate: formatDate(point.date, period),
    })) || [];

  return (
    <>
      {/* Period selector bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
        <PeriodSelector />
      </div>

      {/* Page content */}
      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Timeline d&apos;écoute
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Évolution de vos écoutes au fil du temps
          </p>
        </div>

        {isLoading ? (
          <LoadingState message="Chargement de la timeline d'écoute..." />
        ) : error ? (
          <ErrorState
            error={error}
            message="Impossible de charger la timeline d'écoute"
            onRetry={() => refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            message="Aucune donnée d'écoute disponible pour cette période. Essayez de modifier la période ou les dates de filtrage."
            icon="📈"
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <ResponsiveContainer width="100%" height={500}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
              >
                <defs>
                  <linearGradient id="colorListens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  className="dark:stroke-gray-700"
                />
                <XAxis
                  dataKey="formattedDate"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  stroke="#6b7280"
                  className="dark:stroke-gray-400"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 12 }}
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
                  labelStyle={{
                    color: "#374151",
                    fontWeight: 600,
                    marginBottom: "4px",
                  }}
                  itemStyle={{
                    color: "#374151",
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
                  strokeWidth={2.5}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2 }}
                  animationDuration={500}
                  animationEasing="ease-in-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <>
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
            <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="mt-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Timeline d&apos;écoute
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Évolution de vos écoutes au fil du temps
              </p>
            </div>
            <LoadingState message="Chargement de la timeline d'écoute..." />
          </div>
        </>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}

