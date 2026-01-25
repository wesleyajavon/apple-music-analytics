"use client";

import {
  Suspense,
  useState,
  useMemo,
  useCallback,
  useEffect,
  memo,
} from "react";
import { useSearchParams } from "next/navigation";
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
import { useGenreTrends } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";
import { PeriodSelector, PeriodType } from "@/lib/components/period-selector";
import type { GenreTrendsDataPoint } from "@/lib/dto/genres";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#14b8a6",
];

function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

const TrendsTooltip = memo(
  ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length || !label) return null;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[160px]">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">
          {label}
        </p>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          {payload.map((entry) => (
            <li key={entry.name} className="flex justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="font-medium tabular-nums">
                {Number(entry.value).toLocaleString("fr-FR")} écoutes
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
);
TrendsTooltip.displayName = "TrendsTooltip";

export type TrendDelta = {
  genre: string;
  firstHalf: number;
  secondHalf: number;
  delta: number;
  deltaPercent: number;
  direction: "up" | "down" | "stable";
};

function computeRiseDecline(
  data: GenreTrendsDataPoint[],
  genres: string[]
): TrendDelta[] {
  if (data.length === 0) return [];
  const mid = Math.ceil(data.length / 2);
  const first = data.slice(0, mid);
  const second = data.slice(mid);

  return genres.map((genre) => {
    const firstHalf = first.reduce(
      (sum, row) => sum + (Number(row[genre]) || 0),
      0
    );
    const secondHalf = second.reduce(
      (sum, row) => sum + (Number(row[genre]) || 0),
      0
    );
    const delta = secondHalf - firstHalf;
    const base = firstHalf || 1;
    const deltaPercent = Math.round((delta / base) * 100);
    let direction: "up" | "down" | "stable" = "stable";
    if (delta > 0) direction = "up";
    else if (delta < 0) direction = "down";

    return {
      genre,
      firstHalf,
      secondHalf,
      delta,
      deltaPercent,
      direction,
    };
  });
}

function TrendsContent() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const period = (searchParams.get("period") || "month") as PeriodType;

  const defaultEnd = useMemo(() => new Date(), []);
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const startDate =
    startDateParam || defaultStart.toISOString().split("T")[0];
  const endDate = endDateParam || defaultEnd.toISOString().split("T")[0];

  const { data, isLoading, error, refetch } = useGenreTrends(
    startDate,
    endDate,
    period
  );

  const availableGenres = useMemo(
    () => data?.availableGenres ?? [],
    [data?.availableGenres]
  );
  const chartData = useMemo(
    () => data?.data ?? [],
    [data?.data]
  );

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    if (availableGenres.length === 0) return;
    if (selectedGenres.length > 0) return;
    const defaultSelected =
      availableGenres.length <= 5
        ? [...availableGenres]
        : availableGenres.slice(0, 5);
    setSelectedGenres(defaultSelected);
  }, [availableGenres, selectedGenres.length]);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedGenres([...availableGenres]);
  }, [availableGenres]);

  const selectNone = useCallback(() => {
    setSelectedGenres([]);
  }, []);

  const riseDecline = useMemo(
    () => computeRiseDecline(chartData, selectedGenres),
    [chartData, selectedGenres]
  );

  const rising = useMemo(
    () => riseDecline.filter((r) => r.direction === "up").sort((a, b) => b.deltaPercent - a.deltaPercent),
    [riseDecline]
  );
  const declining = useMemo(
    () => riseDecline.filter((r) => r.direction === "down").sort((a, b) => a.deltaPercent - b.deltaPercent),
    [riseDecline]
  );

  if (isLoading) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
          <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tendances de genres
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Évolution de vos préférences musicales dans le temps
            </p>
          </div>
          <LoadingState message="Chargement des tendances de genres..." />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
          <div className="h-10" />
        </div>
        <div className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tendances de genres
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Évolution de vos préférences musicales dans le temps
            </p>
          </div>
          <ErrorState
            error={error}
            message="Impossible de charger les tendances de genres"
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!data || (chartData.length === 0 && availableGenres.length === 0)) {
    return (
      <>
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
          <PeriodSelector />
        </div>
        <div className="mt-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Tendances de genres
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Évolution de vos préférences musicales dans le temps
            </p>
          </div>
          <EmptyState
            message="Aucune donnée de genre disponible pour cette période. Modifiez les dates ou la période d'agrégation."
            icon="📈"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3">
        <PeriodSelector />
      </div>

      <div className="mt-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tendances de genres
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Évolution de vos préférences musicales dans le temps. Comparaison
            première / seconde moitié de la période.
          </p>
        </div>

        <div className="space-y-6">
          {/* Sélection des genres */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Genres à afficher :
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Tout
                </button>
                <button
                  type="button"
                  onClick={selectNone}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Aucun
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {availableGenres.map((genre, idx) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <label
                    key={genre}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleGenre(genre)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: selected ? getColor(idx) : "transparent",
                        border: selected ? "none" : "1px solid #9ca3af",
                      }}
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {genre}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Graphique multi-lignes */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Évolution des écoutes par genre
            </h2>
            {selectedGenres.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                Sélectionnez au moins un genre pour afficher le graphique.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={500}>
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                >
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
                  <Tooltip content={<TrendsTooltip />} />
                  <Legend />
                  {selectedGenres.map((genre, idx) => (
                    <Line
                      key={genre}
                      type="monotone"
                      dataKey={genre}
                      name={genre}
                      stroke={getColor(availableGenres.indexOf(genre))}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      animationDuration={500}
                      animationEasing="ease-in-out"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Genres en hausse / baisse */}
          {selectedGenres.length > 0 && (rising.length > 0 || declining.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-green-500">↑</span> En hausse
                </h2>
                <ul className="space-y-2">
                  {rising.map((r) => (
                    <li
                      key={r.genre}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-800 dark:text-gray-200">
                        {r.genre}
                      </span>
                      <span className="text-green-600 dark:text-green-400 font-medium tabular-nums">
                        +{r.deltaPercent}% ({r.delta > 0 ? "+" : ""}
                        {r.delta.toLocaleString("fr-FR")} écoutes)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-red-500">↓</span> En baisse
                </h2>
                <ul className="space-y-2">
                  {declining.map((r) => (
                    <li
                      key={r.genre}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-800 dark:text-gray-200">
                        {r.genre}
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-medium tabular-nums">
                        {r.deltaPercent}% ({r.delta.toLocaleString("fr-FR")}{" "}
                        écoutes)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function GenreTrendsPage() {
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
                Tendances de genres
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Évolution de vos préférences musicales dans le temps
              </p>
            </div>
            <LoadingState message="Chargement des tendances de genres..." />
          </div>
        </>
      }
    >
      <TrendsContent />
    </Suspense>
  );
}
