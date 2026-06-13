"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { TopThreeArtists } from "@/lib/components/top-three-artists-cards";
import { ErrorState } from "@/lib/components/error-state";
import { LiveStatusDot } from "@/lib/components/live-status-dot";

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
        <div className="relative overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-[#fbf8ff] to-[#eef7ff] shadow-card ring-1 ring-white/70 animate-fade-in-up dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0c0e18] dark:ring-white/[0.06]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.12),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(79,144,224,0.14),transparent_32%)] dark:opacity-90" />
          <div className="relative border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="mt-2 h-4 w-72 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-gray-200/80 bg-white/80 p-6 dark:border-white/[0.06] dark:bg-[#0c0e18]"
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
      <div className="relative h-full overflow-hidden rounded-[2rem] border border-card-border bg-gradient-to-br from-white via-[#fbf8ff] to-[#eef7ff] shadow-card ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/[0.08] dark:from-[#06070d] dark:via-[#070812] dark:to-[#0c0e18] dark:ring-white/[0.06] animate-fade-in-up">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.12),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(79,144,224,0.14),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(152,80,208,0.12),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(79,144,224,0.10),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_48%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl dark:bg-accent-cyan/12"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-cyan/50 to-transparent dark:via-cyan-200/35"
          aria-hidden
        />
        <div className="relative">
          <div className="border-b border-white/70 px-6 py-5 dark:border-white/[0.06]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-violet/20 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet shadow-sm backdrop-blur dark:border-violet-400/18 dark:bg-[#141622] dark:text-violet-100">
                  <LiveStatusDot />
                  {tOverview("artistSpotlight.badge")}
                </div>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-gray-950 dark:text-white sm:text-4xl">
                  {tOverview("artistSpotlight.title")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted dark:text-slate-400 sm:text-base">
                  {tOverview("artistSpotlight.description")}
                </p>
              </div>
              <Link
                href={`/dashboard/artists${artistsQuery}`}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-2xl border border-card-border bg-white/70 px-4 py-2.5 text-sm font-semibold text-accent-violet shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-card dark:border-white/[0.10] dark:bg-[#161822] dark:text-violet-100 dark:hover:bg-[#1c2030]"
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
