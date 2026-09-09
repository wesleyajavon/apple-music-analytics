"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchTrackStats, trackKeys, useTrackStats } from "@/lib/hooks/use-tracks";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import {
  TrackDetailSheet,
  TracksMobileEmpty,
  TracksMobileError,
  TracksMobileExperience,
  TracksMobileSkeleton,
} from "@/lib/components/tracks-mobile";
import {
  DashboardSectionPanel,
  useDashboardSectionView,
} from "@/lib/components/dashboard-section-switcher";
import { TracksSectionSwitcher } from "@/lib/components/tracks-section-switcher";
import { TracksCanvasSection, TracksMasthead, TracksMetricStrip } from "@/lib/components/tracks-chrome";
import { TracksSpotlight } from "@/lib/components/tracks-spotlight";
import {
  TracksLeaderboardChart,
  TracksLeaderboardChartSkeleton,
} from "@/lib/components/tracks-leaderboard-chart";
import { TracksRankingList } from "@/lib/components/tracks-ranking-list";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";
import { TRACKS_LOCAL_VIEWS } from "@/lib/utils/tracks-section";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { TrackStatsDto } from "@/lib/dto/track";

function TracksPageFallback() {
  const locale = useLocale();
  return (
    <>
      <div className="lg:hidden">
        <TracksMobileSkeleton />
      </div>
      <div className="hidden space-y-12 lg:block">
        <TracksMasthead />
        <TracksMetricStrip locale={locale} loading />
        <ReplayRankingSkeleton />
      </div>
    </>
  );
}

function TracksContent() {
  const DEFAULT_PAGE_SIZE = 20;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("tracks");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets({
    demoPath: "/dashboard/tracks",
  });
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") || undefined;

  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = [20, 50, 100].includes(
    Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)
  )
    ? Number.parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10)
    : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const qParam = (searchParams.get("q") ?? "").trim();
  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebouncedValue(searchInput.trim().slice(0, 200), 320);
  const rankingQuery = debouncedSearch.length > 0 ? debouncedSearch : undefined;

  const [artistInsightsTarget, setArtistInsightsTarget] = useState<{
    artist: ArtistStatsDto;
    avatarColorIndex: number;
  } | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<TrackStatsDto | null>(null);

  const handleOpenArtistInsights = useCallback((artist: ArtistStatsDto, avatarColorIndex: number) => {
    setArtistInsightsTarget({ artist, avatarColorIndex });
  }, []);

  const updatePaginationParams = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(Math.max(1, nextPage)));
      params.set("pageSize", String(nextPageSize));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const currentQ = (searchParams.get("q") ?? "").trim();
    if (debouncedSearch === currentQ) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams]);

  const {
    data: topData,
    isLoading: isTopLoading,
    error: topError,
    refetch: refetchTop,
  } = useTrackStats(startDate, endDate, userId, 20, 0);
  const {
    data: pagedData,
    isLoading: isPagedLoading,
    isFetching: isPagedFetching,
    error: pagedError,
    refetch: refetchPaged,
  } = useTrackStats(startDate, endDate, userId, pageSize, offset, { q: rankingQuery });

  const topTracks = useMemo(() => topData?.topTracks ?? [], [topData?.topTracks]);
  const pagedTracks = useMemo(() => pagedData?.topTracks ?? [], [pagedData?.topTracks]);
  const pagination = pagedData?.pagination;
  const totalTracksInRange = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalTracksInRange / pageSize));
  const { activeView, setView } = useDashboardSectionView(TRACKS_LOCAL_VIEWS, "spotlight");

  useEffect(() => {
    if (page > totalPages) {
      updatePaginationParams(totalPages, pageSize);
    }
  }, [page, pageSize, totalPages, updatePaginationParams]);

  useEffect(() => {
    if (!pagination?.hasMore) return;
    const nextOffset = offset + pageSize;
    void queryClient.prefetchQuery({
      queryKey: trackKeys.stats({
        startDate,
        endDate,
        userId,
        limit: pageSize,
        offset: nextOffset,
        q: rankingQuery,
      }),
      queryFn: () => fetchTrackStats(startDate, endDate, userId, pageSize, nextOffset, rankingQuery),
    });
  }, [endDate, offset, pageSize, pagination?.hasMore, queryClient, rankingQuery, startDate, userId]);

  const barChartData = useMemo(
    () =>
      topTracks.slice(0, 20).map((track) => ({
        name: track.trackTitle.length > 20 ? `${track.trackTitle.substring(0, 20)}...` : track.trackTitle,
        fullName: `${track.trackTitle} - ${track.artistName}`,
        listens: track.listenCount,
      })),
    [topTracks]
  );

  const rankingProps = {
    page,
    pageSize,
    totalPages,
    total: totalTracksInRange,
    offset,
    locale,
    searchInput,
    onSearchInputChange: setSearchInput,
    onPageChange: (nextPage: number) => updatePaginationParams(nextPage, pageSize),
    onPageSizeChange: (nextPageSize: number) => updatePaginationParams(1, nextPageSize),
  };

  const rankingList = (
    <TracksRankingList
      {...rankingProps}
      tracks={pagedTracks}
      hasMore={pagination?.hasMore ?? false}
      isFetching={isPagedFetching || !pagedData}
      searchFieldId="tracks-ranking-search-desktop"
      layout="table"
    />
  );

  const rankingMobile = (
    <TracksRankingList
      {...rankingProps}
      tracks={pagedTracks}
      hasMore={pagination?.hasMore ?? false}
      isFetching={isPagedFetching || !pagedData}
      searchFieldId="tracks-ranking-search-mobile"
      layout="list"
      onOpenTrack={setSelectedTrack}
    />
  );

  const insightsPanel = (
    <ArtistUserInsightsPanel
      open={artistInsightsTarget != null}
      artistId={artistInsightsTarget?.artist.artistId ?? null}
      previewArtist={artistInsightsTarget?.artist ?? null}
      startDate={startDate}
      endDate={endDate}
      userId={userId}
      locale={locale}
      colorIndex={artistInsightsTarget?.avatarColorIndex ?? 0}
      onClose={() => setArtistInsightsTarget(null)}
    />
  );

  const trackDetailSheet = (
    <TrackDetailSheet
      track={selectedTrack}
      totalListens={topData?.overview.totalListens ?? 0}
      locale={locale}
      open={selectedTrack != null}
      onClose={() => setSelectedTrack(null)}
    />
  );

  if (!isTopLoading && topError && !topData) {
    return (
      <>
        <div className="lg:hidden">
          <TracksMobileError error={topError} onRetry={refetchTop} />
        </div>
        <div className="hidden space-y-12 lg:block">
          <TracksMasthead />
          <TracksSectionSwitcher idPrefix="tracks-error" activeSection={activeView} onLocalViewChange={setView} />
          <ErrorState variant="startup" error={topError} message={t("errorLoading")} onRetry={refetchTop} />
        </div>
      </>
    );
  }

  if (!isTopLoading && (!topData || topData.topTracks.length === 0)) {
    return (
      <>
        <div className="lg:hidden">
          <TracksMobileEmpty />
        </div>
        <div className="hidden space-y-12 lg:block">
          <TracksMasthead />
          <TracksSectionSwitcher idPrefix="tracks-empty" activeSection={activeView} onLocalViewChange={setView} />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
      </>
    );
  }

  if (!isPagedLoading && pagedError && !pagedData) {
    return (
      <>
        <div className="space-y-6 lg:hidden">
          <TracksMobileExperience
            overview={topData?.overview}
            topTracks={topTracks}
            isTopLoading={isTopLoading}
            onOpenArtistInsights={handleOpenArtistInsights}
            locale={locale}
            activeView={activeView}
            onViewChange={setView}
            barChartData={barChartData}
            rankingList={
              <TracksRankingList
                {...rankingProps}
                tracks={[]}
                hasMore={false}
                isFetching={false}
                searchFieldId="tracks-ranking-search-mobile"
                layout="list"
                onOpenTrack={setSelectedTrack}
              />
            }
          />
          {isGroqDailyQuotaError(pagedError) ? (
            <GroqQuotaNotice error={pagedError} />
          ) : (
            <button
              type="button"
              onClick={() => refetchPaged()}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-card-border bg-surface-raised px-5 py-3 text-sm font-semibold text-foreground"
            >
              {tCommon("retry")}
            </button>
          )}
        </div>
        <div className="hidden space-y-12 lg:block">
          <TracksMasthead />
          {topData ? (
            <TracksMetricStrip overview={topData.overview} locale={locale} />
          ) : (
            <TracksMetricStrip locale={locale} loading />
          )}
          <TracksSectionSwitcher
            idPrefix="tracks-paged-error"
            activeSection={activeView}
            onLocalViewChange={setView}
          />
          <ErrorState variant="startup" error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
        </div>
        {insightsPanel}
        {trackDetailSheet}
      </>
    );
  }

  const overview = topData?.overview;

  return (
    <>
      <div className="lg:hidden">
        <TracksMobileExperience
          overview={overview}
          topTracks={topTracks}
          isTopLoading={isTopLoading}
          onOpenArtistInsights={handleOpenArtistInsights}
          locale={locale}
          activeView={activeView}
          onViewChange={setView}
          barChartData={barChartData}
          rankingList={rankingMobile}
        />
      </div>

      <div className="hidden space-y-12 lg:block">
        <TracksMasthead />
        {overview ? (
          <TracksMetricStrip overview={overview} locale={locale} />
        ) : (
          <TracksMetricStrip locale={locale} loading />
        )}

        <TracksSectionSwitcher
          idPrefix="tracks-desktop"
          activeSection={activeView}
          onLocalViewChange={setView}
        />

        <DashboardSectionPanel idPrefix="tracks-desktop" view="spotlight" activeView={activeView}>
          <TracksSpotlight
            titleId="tracks-desktop-spotlight-title"
            tracks={topTracks}
            isLoading={isTopLoading}
            locale={locale}
            onOpenArtistInsights={handleOpenArtistInsights}
          />
        </DashboardSectionPanel>

        <DashboardSectionPanel idPrefix="tracks-desktop" view="leaderboard" activeView={activeView}>
          <TracksCanvasSection
            titleId="tracks-desktop-leaderboard-title"
            eyebrow={t("sections.chart.eyebrow")}
            title={t("sections.chart.title")}
            description={t("sections.chart.description")}
          >
            {isTopLoading ? (
              <TracksLeaderboardChartSkeleton />
            ) : (
              <TracksLeaderboardChart data={barChartData} locale={locale} />
            )}
          </TracksCanvasSection>
        </DashboardSectionPanel>

        <DashboardSectionPanel idPrefix="tracks-desktop" view="ranking" activeView={activeView}>
          <TracksCanvasSection
            titleId="tracks-desktop-ranking-title"
            eyebrow={t("sections.table.eyebrow")}
            title={t("sections.table.title")}
            description={t("sections.table.description")}
          >
            {rankingList}
          </TracksCanvasSection>
        </DashboardSectionPanel>
      </div>
      {insightsPanel}
      {trackDetailSheet}
    </>
  );
}

export default function TracksPage() {
  return (
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<TracksPageFallback />}>
        <TracksContent />
      </Suspense>
    </div>
  );
}
