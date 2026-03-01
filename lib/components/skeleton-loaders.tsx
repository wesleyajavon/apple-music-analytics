/**
 * Composants de skeleton loaders adaptés à chaque type de contenu
 * Remplace les spinners génériques pour une meilleure perception de performance
 */

"use client";

import { useTranslations } from "next-intl";

function HeatmapLegendText({ type }: { type: "less" | "more" }) {
  const t = useTranslations("common");
  return <>{type === "less" ? t("less") : t("more")}</>;
}

/**
 * Skeleton pour une carte statistique
 */
export function StatCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour une grille de cartes statistiques
 */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton pour un graphique (ligne, barres, camembert, etc.)
 */
export function ChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card p-6">
      <div className="mb-4 space-y-2">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
      </div>
      <div
        className="bg-gray-100 dark:bg-gray-900 rounded animate-shimmer"
        style={{ height: `${height}px` }}
      >
        {/* Simulation de grille de graphique */}
        <div className="h-full flex flex-col justify-between p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-px bg-gray-200 dark:bg-gray-700"
              style={{ opacity: 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour un graphique en ligne (timeline)
 */
export function LineChartSkeleton({ height = 500 }: { height?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card p-6">
      <div className="mb-4 space-y-2">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
      </div>
      <div
        className="bg-gray-100 dark:bg-gray-900 rounded animate-shimmer relative overflow-hidden"
        style={{ height: `${height}px` }}
      >
        {/* Simulation de ligne de graphique avec animation */}
        <svg className="w-full h-full" viewBox="0 0 800 400">
          {/* Grille */}
          {Array.from({ length: 5 }).map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={80 + i * 80}
              x2="800"
              y2={80 + i * 80}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-200 dark:text-gray-700"
              opacity={0.3}
            />
          ))}
          {/* Ligne animée */}
          <path
            d="M 0,300 Q 200,200 400,250 T 800,200"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-gray-300 dark:text-gray-600"
            opacity={0.5}
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Skeleton pour un graphique en camembert
 */
export function PieChartSkeleton({ height = 500 }: { height?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-4 space-y-2">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-center">
        <div
          className="bg-gray-100 dark:bg-gray-900 rounded-full animate-pulse"
          style={{ width: `${height * 0.6}px`, height: `${height * 0.6}px` }}
        />
      </div>
      {/* Légende */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton pour un tableau
 */
export function TableSkeleton({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: cols }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Skeleton pour le graphique réseau d'artistes
 */
export function NetworkGraphSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-4 space-y-2">
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div
        className="bg-gray-100 dark:bg-gray-900 rounded animate-pulse relative overflow-hidden"
        style={{ height: "800px", minHeight: "600px" }}
      >
        {/* Simulation de nœuds de réseau */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour la liste de genres (avec barres horizontales)
 */
export function GenreListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
        >
          <div className="flex items-center flex-1 min-w-0">
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded mr-3 animate-shimmer" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          </div>
          <div className="flex items-center gap-3 ml-3">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton pour les cartes de pic (jour/heure)
 */
export function PeakCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="space-y-3">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton pour le sélecteur de type de graphique
 */
export function ChartTypeSelectorSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour le sélecteur de genres (checkboxes)
 */
export function GenreSelectorSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton pour les listes de hausse/baisse de genres
 */
export function RiseDeclineListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between text-sm"
        >
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton pour la page Overview complète — layout Bento Grid
 */
export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {/* 4 StatCards */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sm:col-span-2 lg:col-span-1">
            <StatCardSkeleton />
          </div>
        ))}
        {/* Timeline (2×2) */}
        <div className="sm:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[280px]">
          <LineChartSkeleton height={280} />
        </div>
        {/* AI Insights (1×2) — content-aware skeleton */}
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 min-h-[280px]">
          <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[220px] flex flex-col">
            <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                  <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                </div>
                <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer shrink-0" />
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 -mx-1 rounded-lg border-l-4 border-l-gray-300 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-800/50"
                >
                  <div
                    className="h-6 w-6 shrink-0 rounded-md bg-gray-200 dark:bg-gray-700 animate-shimmer"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div
                      className="h-3.5 w-full bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                    <div
                      className="h-3.5 w-4/5 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Taste Profile (1×2) — content-aware skeleton */}
        <div className="sm:col-span-2 lg:col-span-1 lg:row-span-2 min-h-[280px]">
          <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[220px] flex flex-col">
            <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                  <div className="h-4 w-52 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                </div>
                <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer shrink-0" />
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                    style={{
                      width: i === 4 ? "60%" : "100%",
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Top genres (2×1) */}
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              </div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartSkeleton height={200} />
              <GenreListSkeleton count={6} />
            </div>
          </div>
        </div>
        {/* Top artists (2×1) */}
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              </div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChartSkeleton height={200} />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* When Will I Listen? — content-aware skeleton */}
      <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer shrink-0" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
                <div
                  className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
                <div
                  className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Taste Evolution — content-aware skeleton */}
      <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card min-h-[220px] flex flex-col">
        <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-4 w-52 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
            <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer shrink-0" />
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-shimmer"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
                style={{
                  width: i === 3 ? "70%" : "100%",
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour la page Genres complète – hero, top 3, chart, détail
 */
export function GenresSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero bandeau skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-gray-200 dark:bg-gray-700/50 px-6 py-8 sm:px-8 sm:py-10">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded animate-shimmer" />
          <div className="h-4 w-64 bg-gray-300 dark:bg-gray-600 rounded animate-shimmer" />
          <div className="flex flex-wrap gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white/20 dark:bg-black/20 px-4 py-3 backdrop-blur-sm">
                <div className="h-3 w-16 bg-white/40 rounded animate-shimmer mb-2" />
                <div className="h-8 w-20 bg-white/40 rounded animate-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 3 spotlight skeleton */}
      <div>
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-2" />
        <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-6" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-3xl bg-card-surface shadow-xl p-6 border border-card-border">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-shimmer mb-4" />
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-2" />
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-1" />
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-3" />
                <div className="w-full max-w-[160px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart type + chart skeleton */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-shimmer" />
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-shimmer" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-card-border bg-card-surface shadow-card p-6">
          <div className="mb-4 space-y-2">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          </div>
          <div className="flex justify-center">
            <div
              className="bg-gray-100 dark:bg-gray-900 rounded-full animate-shimmer"
              style={{ width: 300, height: 300 }}
            />
          </div>
        </div>
      </div>

      {/* Detail list skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton pour la page Temporal Analysis complète
 */
export function TemporalAnalysisSkeleton() {
  return (
    <div className="space-y-8">
      <PeakCardsSkeleton />
      <ChartSkeleton height={400} />
      <ChartSkeleton height={400} />
      <ChartSkeleton height={400} />
      <TableSkeleton rows={7} cols={4} />
    </div>
  );
}

/**
 * Skeleton pour la page Genres Trends complète
 */
export function GenreTrendsSkeleton() {
  return (
    <div className="space-y-6">
      <GenreSelectorSkeleton count={10} />
      <LineChartSkeleton height={500} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <RiseDeclineListSkeleton count={5} />
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <RiseDeclineListSkeleton count={5} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour le calendrier heatmap
 */
export function HeatmapCalendarSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="mb-4 space-y-2">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
      </div>
      {/* Simulation d'une grille de calendrier */}
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, weekIndex) => (
          <div key={weekIndex} className="flex gap-1">
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className="flex-1 aspect-square bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
              />
            ))}
          </div>
        ))}
      </div>
      {/* Légende */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span><HeatmapLegendText type="less" /></span>
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
              style={{
                opacity: 0.3 + (i * 0.15),
              }}
            />
          ))}
        </div>
        <span><HeatmapLegendText type="more" /></span>
      </div>
    </div>
  );
}

/**
 * Skeleton pour la distribution par jour de la semaine
 */
export function WeekdayDistributionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 animate-shimmer" />
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton pour la page Heatmap complète
 */
export function HeatmapSkeleton() {
  return (
    <div className="space-y-6">
      {/* En-tête avec sélecteur */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <StatCardsSkeleton count={4} />

      {/* Calendrier heatmap */}
      <HeatmapCalendarSkeleton />

      {/* Distribution par jour de la semaine */}
      <WeekdayDistributionSkeleton />
    </div>
  );
}

/**
 * Skeleton pour les détails du jour sélectionné
 */
export function DayDetailsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
        </div>
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
      </div>

      {/* Statistiques du jour */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
          </div>
        ))}
      </div>

      {/* Top artistes */}
      <div className="mb-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              </div>
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Liste des écoutes */}
      <div>
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer mb-3" />
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour une carte d'année Replay
 */
export function ReplayYearCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* En-tête avec l'année */}
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div>
          <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Top Artists */}
      <div className="mb-6">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
            >
              <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Top Tracks */}
      <div>
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton pour la page Replay complète
 */
export function ReplaySkeleton() {
  return (
    <div className="space-y-8">
      {/* Sélecteur d'années */}
      <div className="mb-8">
        <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Grille de cartes d'années */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <ReplayYearCardSkeleton key={i} />
        ))}
      </div>

      {/* Statistiques comparatives */}
      <div className="mt-8 space-y-8">
        <div className="h-6 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6" />
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
