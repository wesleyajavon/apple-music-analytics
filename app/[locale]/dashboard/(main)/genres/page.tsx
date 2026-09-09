"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import {
  GenresCanvasSection,
  GenresMasthead,
  GenresMetricStrip,
  GenresPaletteLink,
} from "@/lib/components/genres-chrome";
import {
  GenreDistributionChart,
  type GenreChartType,
} from "@/lib/components/genres-distribution-chart";
import {
  GenreDetailSheet,
  GenresMobileEmpty,
  GenresMobileError,
  GenresMobileExperience,
  GenresMobileSkeleton,
} from "@/lib/components/genres-mobile";
import { GenresRankingList, type GenreChartRow } from "@/lib/components/genres-ranking-list";
import { GenresSectionSwitcher } from "@/lib/components/genres-section-switcher";
import { GenresSpotlight } from "@/lib/components/genres-spotlight";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";
import {
  DashboardSectionPanel,
  useDashboardSectionView,
} from "@/lib/components/dashboard-section-switcher";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useGenres } from "@/lib/hooks/use-listening";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import { GENRES_LOCAL_VIEWS } from "@/lib/utils/genres-section";

const DEFAULT_GENRES_PAGE_SIZE = 20;
const MAX_CHART_SLICES = 12;

function filterGenresByQuery(rows: GenreChartRow[], query: string): GenreChartRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => row.name.toLowerCase().includes(needle));
}

function aggregateChartSeries(
  rows: GenreChartRow[],
  totalListens: number,
  otherLabel: string
): GenreChartRow[] {
  if (rows.length <= MAX_CHART_SLICES) {
    return rows;
  }
  const top = rows.slice(0, MAX_CHART_SLICES - 1);
  const tail = rows.slice(MAX_CHART_SLICES - 1);
  const otherCount = tail.reduce((sum, x) => sum + x.count, 0);
  const otherPercentage =
    totalListens > 0
      ? (otherCount / totalListens) * 100
      : tail.reduce((sum, x) => sum + x.percentage, 0);
  return [
    ...top,
    {
      name: otherLabel,
      value: otherCount,
      count: otherCount,
      percentage: otherPercentage,
      rank: MAX_CHART_SLICES,
    },
  ];
}

function useGenresPaletteHref() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("genresPage");
    params.delete("genresPageSize");
    params.delete("view");
    params.delete("q");
    const qs = params.toString();
    return qs ? `/dashboard/genres/palette?${qs}` : "/dashboard/genres/palette";
  }, [searchParams]);
}

function GenresPageFallback() {
  const locale = useLocale();
  return (
    <>
      <div className="lg:hidden">
        <GenresMobileSkeleton />
      </div>
      <div className="hidden space-y-12 lg:block">
        <GenresMasthead />
        <GenresMetricStrip locale={locale} loading />
        <ReplayRankingSkeleton />
      </div>
    </>
  );
}

function GenresContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const paletteAccessRestricted = searchParams.get("palette") === "restricted";
  const isPublicDemoViewer = usePublicDemoViewer(userId);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("genres");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets({
    demoPath: "/dashboard/genres",
  });

  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const [chartType, setChartType] = useState<GenreChartType>("pie");
  const { activeView, setView } = useDashboardSectionView(GENRES_LOCAL_VIEWS, "spotlight");
  const qParam = (searchParams.get("q") ?? "").trim();
  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebouncedValue(searchInput.trim().slice(0, 200), 320);
  const parsedPageSize = Number.parseInt(
    searchParams.get("genresPageSize") ?? String(DEFAULT_GENRES_PAGE_SIZE),
    10
  );
  const detailPage = Math.max(1, Number.parseInt(searchParams.get("genresPage") ?? "1", 10) || 1);
  const detailPageSize = [10, 20, 50].includes(parsedPageSize)
    ? parsedPageSize
    : DEFAULT_GENRES_PAGE_SIZE;
  const detailOffset = (detailPage - 1) * detailPageSize;
  const [selectedGenre, setSelectedGenre] = useState<GenreChartRow | null>(null);

  const updateDetailPaginationParams = useCallback(
    (nextPage: number, nextPageSize: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("genresPage", String(Math.max(1, nextPage)));
      params.set("genresPageSize", String(nextPageSize));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    const currentQ = (searchParams.get("q") ?? "").trim();
    if (debouncedSearch === currentQ) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    params.set("genresPage", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedSearch, pathname, router, searchParams]);

  const { data, isLoading, error, refetch } = useGenres(startDate, endDate, userId, {
    enabled: !!startDate && !!endDate,
  });

  const isLoadingOrFetching = isRangeLoading || isLoading;
  const paletteHref = useGenresPaletteHref();
  const showPalette = !paletteAccessRestricted && !isPublicDemoViewer;

  const chartData = useMemo(
    () =>
      data?.data.map((item, index) => ({
        name: item.genre,
        value: item.count,
        percentage: item.percentage,
        count: item.count,
        rank: index + 1,
      })) || [],
    [data]
  );

  const chartDisplayData = useMemo(
    () => aggregateChartSeries(chartData, data?.totalListens ?? 0, t("other")),
    [chartData, data?.totalListens, t]
  );

  const filteredRows = useMemo(
    () => filterGenresByQuery(chartData, debouncedSearch),
    [chartData, debouncedSearch]
  );
  const detailRows = filteredRows.slice(detailOffset, detailOffset + detailPageSize);
  const detailTotal = filteredRows.length;
  const detailTotalPages = Math.max(1, Math.ceil(detailTotal / detailPageSize));
  const topArtistsByGenre = useMemo(() => {
    const entries = data?.topArtistsForTopGenres ?? [];
    return new Map(
      entries.map((entry) => [
        entry.genre,
        entry.artists.slice(0, 3).map((artist) => ({
          id: artist.id,
          name: artist.name,
          imageUrl: artist.imageUrl,
        })),
      ])
    );
  }, [data?.topArtistsForTopGenres]);

  useEffect(() => {
    if (detailPage > detailTotalPages) {
      updateDetailPaginationParams(detailTotalPages, detailPageSize);
    }
  }, [detailPage, detailPageSize, detailTotalPages, updateDetailPaginationParams]);

  const rankingProps = {
    page: detailPage,
    pageSize: detailPageSize,
    totalPages: detailTotalPages,
    total: detailTotal,
    offset: detailOffset,
    locale,
    searchInput,
    onSearchInputChange: setSearchInput,
    onPageChange: (nextPage: number) => updateDetailPaginationParams(nextPage, detailPageSize),
    onPageSizeChange: (nextPageSize: number) => updateDetailPaginationParams(1, nextPageSize),
  };

  const rankingList = (
    <GenresRankingList
      {...rankingProps}
      rows={detailRows}
      isFetching={isLoadingOrFetching}
      searchFieldId="genres-ranking-search-desktop"
      layout="table"
    />
  );

  const rankingMobile = (
    <GenresRankingList
      {...rankingProps}
      rows={detailRows}
      isFetching={isLoadingOrFetching}
      searchFieldId="genres-ranking-search-mobile"
      layout="list"
      onOpenGenre={setSelectedGenre}
    />
  );

  const selectedArtists = selectedGenre
    ? (topArtistsByGenre.get(selectedGenre.name) ?? []).slice(0, 3)
    : [];

  const genreDetailSheet = (
    <GenreDetailSheet
      genre={selectedGenre}
      artists={selectedArtists}
      locale={locale}
      open={selectedGenre != null}
      onClose={() => setSelectedGenre(null)}
    />
  );

  const paletteLink =
    showPalette || paletteAccessRestricted ? (
      <GenresPaletteLink href={paletteHref} restricted={paletteAccessRestricted} />
    ) : null;

  if (!isLoadingOrFetching && error) {
    return (
      <>
        <div className="lg:hidden">
          <GenresMobileError error={error} onRetry={() => refetch()} />
        </div>
        <div className="hidden space-y-12 lg:block">
          <GenresMasthead />
          <GenresSectionSwitcher idPrefix="genres-error" activeSection={activeView} onLocalViewChange={setView} />
          <ErrorState
            variant="startup"
            error={error}
            message={t("errorLoading")}
            onRetry={() => refetch()}
          />
        </div>
      </>
    );
  }

  if (!isLoadingOrFetching && (!data || data.data.length === 0)) {
    return (
      <>
        <div className="lg:hidden">
          <GenresMobileEmpty />
        </div>
        <div className="hidden space-y-12 lg:block">
          <GenresMasthead />
          <GenresSectionSwitcher idPrefix="genres-empty" activeSection={activeView} onLocalViewChange={setView} />
          <EmptyState variant="startup" {...emptyStatePresets.importData} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden">
        <GenresMobileExperience
          genreCount={chartData.length}
          totalListens={data?.totalListens}
          topGenreName={chartData[0]?.name}
          chartData={chartData}
          isLoading={isLoadingOrFetching}
          locale={locale}
          activeView={activeView}
          onViewChange={setView}
          chartType={chartType}
          onChartTypeChange={setChartType}
          chartDisplayData={chartDisplayData}
          rankingList={rankingMobile}
          onSelectGenre={setSelectedGenre}
          paletteHref={paletteHref}
          showPalette={showPalette}
          paletteRestricted={paletteAccessRestricted}
        />
      </div>

      <div className="hidden space-y-12 lg:block">
        <GenresMasthead />
        {isLoadingOrFetching ? (
          <GenresMetricStrip locale={locale} loading />
        ) : (
          <GenresMetricStrip
            genreCount={chartData.length}
            totalListens={data?.totalListens}
            topGenreName={chartData[0]?.name}
            locale={locale}
          />
        )}
        {paletteLink}

        <GenresSectionSwitcher
          idPrefix="genres-desktop"
          activeSection={activeView}
          onLocalViewChange={setView}
        />

        <DashboardSectionPanel idPrefix="genres-desktop" view="spotlight" activeView={activeView}>
          <GenresSpotlight
            titleId="genres-desktop-spotlight-title"
            genres={chartData}
            isLoading={isLoadingOrFetching}
            locale={locale}
          />
        </DashboardSectionPanel>

        <DashboardSectionPanel idPrefix="genres-desktop" view="distribution" activeView={activeView}>
          <GenresCanvasSection
            titleId="genres-desktop-distribution-title"
            eyebrow={t("sections.distribution.eyebrow")}
            title={t("sections.distribution.title")}
            description={t("sections.distribution.description")}
          >
            <GenreDistributionChart
              chartType={chartType}
              onChartTypeChange={setChartType}
              isLoading={isLoadingOrFetching}
              chartDisplayData={chartDisplayData}
            />
          </GenresCanvasSection>
        </DashboardSectionPanel>

        <DashboardSectionPanel idPrefix="genres-desktop" view="ranking" activeView={activeView}>
          <GenresCanvasSection
            titleId="genres-desktop-ranking-title"
            eyebrow={t("sections.ranking.eyebrow")}
            title={t("sections.ranking.title")}
            description={t("sections.ranking.description")}
          >
            {rankingList}
          </GenresCanvasSection>
        </DashboardSectionPanel>
      </div>
      {genreDetailSheet}
    </>
  );
}

export default function GenresPage() {
  return (
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<GenresPageFallback />}>
        <GenresContent />
      </Suspense>
    </div>
  );
}
