"use client";

import { Suspense, useState, useMemo, useCallback, memo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
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
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
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

// Custom tooltip - needs to be inside component to use translations
function createCustomTooltip(t: (k: string) => string, locale: string) {
  const T = memo(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-tooltip-accessible min-w-[180px] p-4">
          <p className="font-semibold">{data.name}</p>
          <p className="chart-tooltip-secondary text-sm mt-1">
            {data.count.toLocaleString(locale)} {t("listens")} · {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  });
  T.displayName = "CustomTooltip";
  return T;
}

function GenresContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("genres");
  const locale = useLocale();
  const CustomTooltip = useMemo(() => createCustomTooltip(t, locale), [t, locale]);
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

  // Label pour le pie chart - affichage conditionnel + taille réduite pour éviter le débordement mobile
  const renderCustomLabel = useCallback((props: any) => {
    const { cx, cy, midAngle, outerRadius, percent } = props;
    const pct = (percent ?? 0) * 100;
    if (pct <= 8) return null;
    const RADIAN = Math.PI / 180;
    const radius = (outerRadius as number) * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-700 dark:fill-gray-300"
        style={{ fontSize: "clamp(9px, 2vw, 12px)" }}
      >
        {`${pct.toFixed(1)}%`}
      </text>
    );
  }, []);

  const emptyStatePresets = useEmptyStatePresets();

  return (
    <>
      <div className="mt-4 sm:mt-6">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl lg:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-2xl">
            {t("subtitle")}
          </p>
        </header>

        {isLoading ? (
          <GenresSkeleton />
        ) : error ? (
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        ) : !data || data.data.length === 0 ? (
          <EmptyState {...emptyStatePresets.changeDates(pathname)} />
        ) : (
          <div className="space-y-6">
            {/* Chart type selector */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">
                {t("chart")}
              </span>
              <div className="flex items-center bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50 w-fit">
                <button
                  onClick={() => setChartType("pie")}
                  className={`
                    px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                    ${chartType === "pie" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                  `}
                >
                  {t("pie")}
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`
                    px-3 py-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200
                    ${chartType === "bar" ? "bg-accent-violet text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}
                  `}
                >
                  {t("bar")}
                </button>
              </div>
            </div>

            {/* Chart */}
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  {t("distributionTitle")}
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t("totalListens")}: {data.totalListens.toLocaleString(locale)} {t("listens")}
                </p>
              </div>
              <div className="p-4 sm:p-6 overflow-x-auto">
              {chartType === "pie" ? (
                <div className="h-[280px] sm:h-[380px] lg:h-[500px] min-w-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius="75%"
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
                      wrapperStyle={{ fontSize: "clamp(10px, 2.5vw, 12px)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[320px] sm:h-[400px] lg:h-[500px] min-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 12, right: 12, left: 0, bottom: 80 }}
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
                      height={80}
                      tick={{ fill: "currentColor", fontSize: 10 }}
                      stroke="#6b7280"
                      className="dark:stroke-gray-400"
                      interval={0}
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
                      name={t("Listens")}
                      fill="url(#genreBarGradient)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              )}

              {/* Liste des genres avec barres de progression - design moderne */}
              <div className="mt-6 pt-6 sm:mt-8 sm:pt-8 border-t border-gray-100 dark:border-gray-700/50">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                  {t("detailByGenre")}
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {chartData.map((item, index) => {
                    const maxCount = chartData[0]?.count ?? 1;
                    const widthPercent = (item.count / maxCount) * 100;
                    const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
                    const rankBg = ["bg-amber-500/15", "bg-slate-400/15", "bg-amber-700/15"];
                    const rankStyle = index < 3 ? rankColors[index] : "text-gray-400 dark:text-gray-500";
                    const rankBgStyle = index < 3 ? rankBg[index] : "bg-gray-100 dark:bg-gray-800";
                    return (
                      <div key={item.name} className="group">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 mb-1 sm:mb-1.5">
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <span className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg text-[10px] sm:text-xs font-bold ${rankStyle} ${rankBgStyle}`}>
                              {index + 1}
                            </span>
                            <div
                              className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              aria-hidden
                            />
                            <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate min-w-0">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 ml-8 sm:ml-0 shrink-0">
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                              {item.count.toLocaleString(locale)}
                            </span>
                            <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 w-10 sm:w-12 text-right tabular-nums shrink-0">
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="ml-8 sm:ml-10 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/50">
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

function GenresFallback() {
  const t = useTranslations("genres");
  return (
    <div className="mt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-2xl">
          {t("subtitle")}
        </p>
      </header>
      <GenresSkeleton />
    </div>
  );
}

export default function GenresPage() {
  return (
    <Suspense fallback={<GenresFallback />}>
      <GenresContent />
    </Suspense>
  );
}