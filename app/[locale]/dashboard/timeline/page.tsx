"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
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
import { CHART_TOOLTIP_STYLES } from "@/lib/constants/config";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { PeriodSelector, PeriodType } from "@/lib/components/period-selector";
import { LineChartSkeleton } from "@/lib/components/skeleton-loaders";

/**
 * Formate une date selon le type de période
 * Fonction pure, peut être mémorisée si nécessaire
 */
function formatDate(date: string, period: PeriodType, locale: string): string {
  switch (period) {
    case "day": {
      const d = new Date(date);
      return d.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
    }
    case "week": {
      // Format: "01/01 - 07/01" (début - fin de semaine)
      const weekStart = new Date(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const startStr = weekStart.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      const endStr = weekEnd.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
      return `${startStr} - ${endStr}`;
    }
    case "month": {
      // Format: "janv. 2024" - l'API retourne "YYYY-MM"
      const [year, month] = date.split("-");
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString(locale, {
        month: "short",
        year: "numeric",
      });
    }
  }
}

function TimelineContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("timeline");
  const locale = useLocale();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const period = (searchParams.get("period") || "day") as PeriodType;

  const { data, isLoading, error, refetch } = useTimeline(
    startDate,
    endDate,
    period
  );

  // Format data for chart with proper date formatting - mémorisé pour éviter les recalculs
  const chartData = useMemo(
    () =>
      data?.map((point) => ({
        ...point,
        formattedDate: formatDate(point.date, period, locale),
      })) || [],
    [data, period, locale]
  );

  const emptyStatePresets = useEmptyStatePresets();

  return (
    <>
      {/* Period selector bar - flush with DateRangeFilter above */}
      <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
        <PeriodSelector />
      </div>

      {/* Page content */}
      <div className="mt-6">
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("title")}
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-violet/10 dark:bg-accent-violet/20 text-accent-violet border border-accent-violet/20">
              {period === "day"
                ? t("periodBadgeDay")
                : period === "week"
                  ? t("periodBadgeWeek")
                  : t("periodBadgeMonth")}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </header>

        {isLoading ? (
          <LineChartSkeleton height={500} />
        ) : error ? (
          <ErrorState
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState {...emptyStatePresets.changeDates(pathname)} />
        ) : (
          <section
            className="relative overflow-hidden rounded-2xl border-2 border-accent-indigo/25 bg-white dark:bg-gray-800/95 shadow-2xl dark:shadow-none ring-2 ring-accent-indigo/10 dark:ring-accent-indigo/20 animate-fade-in-up transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)] hover:border-accent-indigo/35 dark:hover:border-accent-indigo/45"
            aria-labelledby="timeline-spotlight-title"
          >
            {/* Gradient spotlight — lumière centrée sur la zone du graphique */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-70 dark:opacity-50"
              style={{
                background: "radial-gradient(ellipse 90% 60% at 50% 35%, rgba(99, 102, 241, 0.09) 0%, rgba(139, 92, 246, 0.04) 45%, transparent 75%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-90 dark:opacity-70"
              style={{
                background: "radial-gradient(ellipse 100% 70% at 50% 45%, rgba(99, 102, 241, 0.05) 0%, transparent 55%)",
              }}
            />
            {/* Glow subtil en bas — accent indigo */}
            <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-[85%] h-28 bg-accent-indigo/12 dark:bg-accent-indigo/18 blur-3xl rounded-full" />

            <div className="relative">
              <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-indigo/20 to-accent-violet/20 text-accent-indigo">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0115.306-2.028 11.95 11.95 0 012.028 15.306L21 18" />
                    </svg>
                  </div>
                  <div>
                    <h2 id="timeline-spotlight-title" className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {t("chartTitle")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("chartHint")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 sm:p-8 md:p-10">
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 60 }}
                  >
                    <defs>
                      <linearGradient id="colorListens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
                      contentStyle={CHART_TOOLTIP_STYLES.contentStyle}
                      labelStyle={CHART_TOOLTIP_STYLES.labelStyle}
                      itemStyle={CHART_TOOLTIP_STYLES.itemStyle}
                      formatter={(value: number) => [
                        `${value.toLocaleString(locale)} ${t("listens")}`,
                        t("Listens"),
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="listens"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ fill: "#8b5cf6", r: 3 }}
                      activeDot={{ r: 5, stroke: "#8b5cf6", strokeWidth: 2 }}
                      animationDuration={500}
                      animationEasing="ease-in-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function TimelineFallback() {
  const t = useTranslations("timeline");
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") || "day") as PeriodType;
  return (
    <>
      <div className="bg-white dark:bg-gray-800/95 border-b border-gray-100 dark:border-gray-700/50 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8 px-4 sm:px-6 lg:px-8 py-3 backdrop-blur-sm">
        <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl animate-shimmer w-64" />
      </div>
      <div className="mt-6">
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t("title")}
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-violet/10 dark:bg-accent-violet/20 text-accent-violet border border-accent-violet/20">
              {period === "day"
                ? t("periodBadgeDay")
                : period === "week"
                  ? t("periodBadgeWeek")
                  : t("periodBadgeMonth")}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("subtitle")}
          </p>
        </header>
        <LineChartSkeleton height={500} />
      </div>
    </>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelineFallback />}>
      <TimelineContent />
    </Suspense>
  );
}

