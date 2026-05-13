"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { TopThreeArtists } from "@/lib/components/top-three-artists-cards";
import { ErrorState } from "@/lib/components/error-state";

export type TopThreeArtistsOverviewWidgetProps = {
  startDate?: string;
  endDate?: string;
  onOpenArtistInsights?: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
};

/**
 * Bloc « Top 3 artistes » style page /dashboard/artists pour la vue d'ensemble.
 */
export function TopThreeArtistsOverviewWidget({
  startDate,
  endDate,
  onOpenArtistInsights,
}: TopThreeArtistsOverviewWidgetProps) {
  const tArtists = useTranslations("artists");
  const tOverview = useTranslations("overview");
  const locale = useLocale();
  const viewerUserId = useDashboardViewerUserId();

  const { data, isLoading, error, refetch } = useArtistStats(
    startDate,
    endDate,
    viewerUserId,
    3
  );

  const topArtists = data?.topArtists ?? [];
  const maxListens = topArtists[0]?.listenCount ?? 1;

  const artistsQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (viewerUserId) p.set("userId", viewerUserId);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [startDate, endDate, viewerUserId]);

  if (isLoading) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 w-full min-w-0">
        <div className="relative overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 animate-fade-in-up">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="mt-2 h-4 w-72 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-gray-200/80 dark:border-gray-600/50 bg-white/80 dark:bg-gray-800/50 p-6"
                >
                  <div className="mx-auto mb-4 h-[120px] w-[120px] rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="mx-auto h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="mx-auto mt-3 h-8 w-1/2 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sm:col-span-2 lg:col-span-4 w-full min-w-0">
        <div className="rounded-2xl border border-card-border bg-card-surface p-6">
          <ErrorState error={error} message={tArtists("errorLoading")} onRetry={() => refetch()} />
        </div>
      </div>
    );
  }

  if (topArtists.length === 0) {
    return null;
  }

  return (
    <div className="sm:col-span-2 lg:col-span-4 w-full min-w-0">
      <div className="relative h-full overflow-hidden rounded-2xl border-2 border-accent-violet/20 bg-card-surface shadow-2xl dark:shadow-none ring-2 ring-accent-violet/10 dark:ring-accent-violet/20 transition-all duration-300 hover:shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)] hover:border-accent-violet/30 dark:hover:border-accent-violet/40 animate-fade-in-up">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 dark:opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 70% at 50% 40%, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="border-b border-gray-100 dark:border-gray-700/50 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tArtists("top3Title")}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {tOverview("yourFavoriteArtists")}
                </p>
              </div>
              <Link
                href={`/dashboard/artists${artistsQuery}`}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-accent-violet hover:bg-accent-violet/10 dark:hover:bg-accent-violet/20 transition-colors duration-200 shrink-0 self-start"
              >
                {tOverview("seeAll")}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="p-6 pt-4">
            <TopThreeArtists
              artists={topArtists}
              maxListens={maxListens}
              t={tArtists}
              locale={locale}
              onArtistSelect={onOpenArtistInsights}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
