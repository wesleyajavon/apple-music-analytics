"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTimeline } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";

export default function TimelinePage() {
  const { data, isLoading, error, refetch } = useTimeline();

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Timeline d&apos;écoute
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Évolution de vos écoutes au fil du temps
          </p>
        </div>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Timeline d&apos;écoute
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Évolution de vos écoutes au fil du temps
          </p>
        </div>
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Timeline d&apos;écoute
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Évolution de vos écoutes au fil du temps
          </p>
        </div>
        <EmptyState message="Aucune donnée d'écoute disponible pour cette période" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Timeline d&apos;écoute
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Évolution de vos écoutes au fil du temps
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "currentColor" }}
              style={{ fill: "currentColor" }}
            />
            <YAxis
              tick={{ fill: "currentColor" }}
              style={{ fill: "currentColor" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="listens"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Écoutes"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

