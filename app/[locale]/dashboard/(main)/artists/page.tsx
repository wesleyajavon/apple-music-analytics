"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "@/i18n/navigation";
import { artistKeys, fetchArtistStats, useArtistStats } from "@/lib/hooks/use-artists";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import {
  ArtistsMobileEmpty,
  ArtistsMobileError,
  ArtistsMobileExperience,
  ArtistsMobileSkeleton,
} from "@/lib/components/artists-mobile";
import {
  DashboardSectionPanel,
  useDashboardSectionView,
} from "@/lib/components/dashboard-section-switcher";
import { ArtistsViewSwitcher, ARTISTS_VIEWS } from "@/lib/components/artists-view-switcher";
import { ArtistsCanvasSection, ArtistsMasthead, ArtistsMetricStrip } from "@/lib/components/artists-chrome";
import { ArtistsSpotlight } from "@/lib/components/artists-spotlight";
import {
  ArtistsLeaderboardChart,
  ArtistsLeaderboardChartSkeleton,
} from "@/lib/components/artists-leaderboard-chart";
import { ArtistsRankingList } from "@/lib/components/artists-ranking-list";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";

function ArtistsPageFallback() {
  const locale = useLocale();
  return (
    <>
      <div className="lg:hidden">
        <ArtistsMobileSkeleton />
      </div>
      <div className="hidden space-y-12 lg:block">
        <ArtistsMasthead />
        <ArtistsMetricStrip locale={locale} loading />
        <ReplayRankingSkeleton />
      </div>
    </>
  );
}

function ArtistsContent() {
  const DEFAULT_PAGE_SIZE = 20;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const t = useTranslations("artists");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets({
    demoPath: "/dashboard/artists",
  });
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;
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
  } = useArtistStats(startDate, endDate, userId, 20);
  const {
    data: pagedData,
    isLoading: isPagedLoading,
    isFetching: isPagedFetching,
    error: pagedError,
    refetch: refetchPaged,
  } = useArtistStats(startDate, endDate, userId, pageSize, offset, { q: rankingQuery });

  const topArtists = useMemo(() => topData?.topArtists ?? [], [topData?.topArtists]);
  const pagedArtists = useMemo(() => pagedData?.topArtists ?? [], [pagedData?.topArtists]);
  const pagination = pagedData?.pagination;
  const totalArtistsInRange = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalArtistsInRange / pageSize));
  const { activeView, setView } = useDashboardSectionView(ARTISTS_VIEWS, "spotlight");

  useEffect(() => {
    if (page > totalPages) {
      updatePaginationParams(totalPages, pageSize);
    }
  }, [page, pageSize, totalPages, updatePaginationParams]);

  useEffect(() => {
    if (!pagination?.hasMore) return;
    const nextOffset = offset + pageSize;
    void queryClient.prefetchQuery({
      queryKey: artistKeys.stats({
        startDate,
        endDate,
        userId,
        limit: pageSize,
        offset: nextOffset,
        q: rankingQuery,
      }),
      queryFn: () => fetchArtistStats(startDate, endDate, userId, pageSize, nextOffset, rankingQuery),
    });
  }, [
    endDate,
    offset,
    pageSize,
    pagination?.hasMore,
    queryClient,
    rankingQuery,
    startDate,
    userId,
  ]);

  const barChartData = useMemo(
    () =>
      topArtists.slice(0, 20).map((artist) => ({
        name: artist.artistName.length > 20 ? `${artist.artistName.substring(0, 20)}...` : artist.artistName,
        fullName: artist.artistName,
        listens: artist.listenCount,
      })),
    [topArtists]
  );

  const rankingProps = {
    page,
    pageSize,
    totalPages,
    total: totalArtistsInRange,
    offset,
    onPageChange: (nextPage: number) => updatePaginationParams(nextPage, pageSize),
    onPageSizeChange: (nextPageSize: number) => updatePaginationParams(1, nextPageSize),
    onOpenArtistInsights: handleOpenArtistInsights,
    locale,
    searchInput,
    onSearchInputChange: setSearchInput,
  };

  const rankingList = (
    <ArtistsRankingList
      {...rankingProps}
      artists={pagedArtists}
      hasMore={pagination?.hasMore ?? false}
      isFetching={isPagedFetching || !pagedData}
      searchFieldId="artists-ranking-search-desktop"
    />
  );

  const rankingMobile = (
    <ArtistsRankingList
      {...rankingProps}
      artists={pagedArtists}
      hasMore={pagination?.hasMore ?? false}
      isFetching={isPagedFetching || !pagedData}
      searchFieldId="artists-ranking-search-mobile"
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

  if (!isTopLoading && topError && !topData) {
    return (
      <>
        <div className="lg:hidden">
          <ArtistsMobileError error={topError} onRetry={refetchTop} />
        </div>
        <div className="hidden space-y-12 lg:block">
          <ArtistsMasthead />
          <ArtistsViewSwitcher idPrefix="artists-error" activeSection={activeView} onLocalViewChange={setView} />
          <ErrorState variant="startup" error={topError} message={t("errorLoading")} onRetry={refetchTop} />
        </div>
      </>
    );
  }

  if (!isTopLoading && (!topData || topData.topArtists.length === 0)) {
    return (
      <>
        <div className="lg:hidden">
          <ArtistsMobileEmpty />
        </div>
        <div className="hidden space-y-12 lg:block">
          <ArtistsMasthead />
          <ArtistsViewSwitcher idPrefix="artists-empty" activeSection={activeView} onLocalViewChange={setView} />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
      </>
    );
  }

  if (!isPagedLoading && pagedError && !pagedData) {
    return (
      <>
        <div className="space-y-6 lg:hidden">
          <ArtistsMobileExperience
            overview={topData?.overview}
            topArtists={topArtists}
            isTopLoading={isTopLoading}
            onOpenArtistInsights={handleOpenArtistInsights}
            locale={locale}
            activeView={activeView}
            onViewChange={setView}
            barChartData={barChartData}
            rankingList={
              <ArtistsRankingList
                {...rankingProps}
                artists={[]}
                hasMore={false}
                isFetching={false}
                searchFieldId="artists-ranking-search-mobile"
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
          <ArtistsMasthead />
          {topData ? (
            <ArtistsMetricStrip overview={topData.overview} locale={locale} />
          ) : (
            <ArtistsMetricStrip locale={locale} loading />
          )}
          <ArtistsViewSwitcher
            idPrefix="artists-paged-error"
            activeSection={activeView}
            onLocalViewChange={setView}
          />
          <ErrorState variant="startup" error={pagedError} message={t("errorLoading")} onRetry={refetchPaged} />
        </div>
        {insightsPanel}
      </>
    );
  }

  const overview = topData?.overview;

  return (
    <>
      <div className="lg:hidden">
        <ArtistsMobileExperience
          overview={overview}
          topArtists={topArtists}
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
        <ArtistsMasthead />
        {overview ? (
          <ArtistsMetricStrip overview={overview} locale={locale} />
        ) : (
          <ArtistsMetricStrip locale={locale} loading />
        )}

        <ArtistsViewSwitcher
          idPrefix="artists-desktop"
          activeSection={activeView}
          onLocalViewChange={setView}
        />

        <DashboardSectionPanel idPrefix="artists-desktop" view="spotlight" activeView={activeView}>
          <ArtistsSpotlight
            titleId="artists-desktop-spotlight-title"
            artists={topArtists}
            isLoading={isTopLoading}
            locale={locale}
            onOpenArtistInsights={handleOpenArtistInsights}
          />
        </DashboardSectionPanel>

        <DashboardSectionPanel idPrefix="artists-desktop" view="leaderboard" activeView={activeView}>
          <ArtistsCanvasSection
            titleId="artists-desktop-leaderboard-title"
            eyebrow={t("sections.charts.eyebrow")}
            title={t("sections.charts.title")}
            description={t("sections.charts.description")}
          >
            {isTopLoading ? (
              <ArtistsLeaderboardChartSkeleton />
            ) : (
              <ArtistsLeaderboardChart data={barChartData} locale={locale} />
            )}
          </ArtistsCanvasSection>
        </DashboardSectionPanel>

        <DashboardSectionPanel idPrefix="artists-desktop" view="ranking" activeView={activeView}>
          <ArtistsCanvasSection
            titleId="artists-desktop-ranking-title"
            eyebrow={t("sections.table.eyebrow")}
            title={t("sections.table.title")}
            description={t("sections.table.description")}
          >
            {rankingList}
          </ArtistsCanvasSection>
        </DashboardSectionPanel>
      </div>
      {insightsPanel}
    </>
  );
}

export default function ArtistsPage() {
  return (
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<ArtistsPageFallback />}>
        <ArtistsContent />
      </Suspense>
    </div>
  );
}
