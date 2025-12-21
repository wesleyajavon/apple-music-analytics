"use client";

import { useQuery } from "@tanstack/react-query";
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

async function fetchTimelineData() {
  const response = await fetch("/api/timeline");
  if (!response.ok) {
    throw new Error("Failed to fetch timeline data");
  }
  return response.json();
}

export default function TimelinePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimelineData,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">Chargement des données...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center text-red-600">
          Erreur lors du chargement des données
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Timeline d'écoute
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

