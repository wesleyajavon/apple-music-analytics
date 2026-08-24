"use client";

import { useCallback, useMemo, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { useOverviewStats, useTimeline, useGenres } from "@/lib/hooks/use-listening";
import { useTrackStats } from "@/lib/hooks/use-tracks";
import { GenreTrendsSummaryWidget } from "@/lib/components/genre-trends-summary-widget";
import { ArtistTrendsSummaryWidget } from "@/lib/components/artist-trends-summary-widget";
import { TrackTrendsSummaryWidget } from "@/lib/components/track-trends-summary-widget";
import { type OverviewMomentumSlide } from "@/lib/components/overview-momentum-tabs";
import { OverviewListeningMomentumCard } from "@/lib/components/overview-listening-momentum-card";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import { formatOverviewDateRangeLabel } from "@/lib/utils/overview-date-range-label";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import {
  OverviewHeroFrame,
  MobileOverviewEmptyView,
  MobileOverviewLoadingFallback,
  MobileOverviewUnavailable,
} from "@/lib/components/overview-hero";
import { MobileOverviewFlow } from "@/lib/components/overview-mobile-flow";
import { OverviewDesktopFlow } from "@/lib/components/overview-desktop-flow";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import {
  buildOverviewStatsChanges,
  getPreviousPeriod,
} from "@/lib/utils/overview-page";

function OverviewContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("overview");
  const locale = useLocale();
  const emptyStatePresets = useEmptyStatePresets();
  const { startDate: rangeStart, endDate: rangeEnd, isAll } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(rangeStart, rangeEnd, locale);
  const badgeLabel = dateRangeLabel || t("allData");

  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const [firstName, setFirstName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    setFirstName(null);
    setAvatarUrl(null);

    function extractFirstName(rawName?: string | null) {
      if (!rawName) return null;
      const cleaned = rawName.trim();
      if (!cleaned) return null;
      return cleaned.split(/\s+/)[0] ?? null;
    }

    async function hydrateDashboardSubjectDisplayName() {
      const params = new URLSearchParams();
      if (userId) params.set("userId", userId);
      const qs = params.toString();
      const url = qs ? `/api/user/dashboard-subject?${qs}` : "/api/user/dashboard-subject";
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        user?: { name?: string | null; avatarUrl?: string | null } | null;
      };
      if (!mounted) return;
      setFirstName(extractFirstName(payload.user?.name ?? null));
      setAvatarUrl(payload.user?.avatarUrl ?? null);
    }

    hydrateDashboardSubjectDisplayName();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const overviewTitle = firstName ? t("titlePersonal", { name: firstName }) : t("title");

  const [artistInsightsTarget, setArtistInsightsTarget] = useState<{
    artist: ArtistStatsDto;
    avatarColorIndex: number;
  } | null>(null);

  const handleOpenArtistInsights = useCallback((artist: ArtistStatsDto, avatarColorIndex: number) => {
    setArtistInsightsTarget({ artist, avatarColorIndex });
  }, []);

  const previousPeriod = useMemo(
    () => getPreviousPeriod(startDate, endDate),
    [startDate, endDate]
  );

  const { data, isLoading, error, refetch } = useOverviewStats(
    startDate,
    endDate,
    userId
  );

  const { data: previousData } = useOverviewStats(
    previousPeriod?.prevStartDate,
    previousPeriod?.prevEndDate,
    userId,
    { enabled: !!previousPeriod }
  );

  const { data: timelineData } = useTimeline(
    startDate,
    endDate,
    "month",
    userId
  );

  const { data: genresData } = useGenres(startDate, endDate, userId);
  const { data: tracksData } = useTrackStats(
    startDate,
    endDate,
    userId,
    20,
    0
  );

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  const changes = useMemo(
    () => buildOverviewStatsChanges(previousPeriod, data, previousData),
    [previousPeriod, data, previousData]
  );

  const chartData = useMemo(
    () =>
      timelineData?.map((point) => {
        const raw = point.date;
        const d =
          raw.length === 7 && raw[4] === "-"
            ? new Date(`${raw}-01T12:00:00`)
            : new Date(raw);
        return {
          ...point,
          formattedDate: d.toLocaleDateString(locale, {
            month: "short",
            year: "numeric",
          }),
        };
      }) || [],
    [timelineData, locale]
  );

  const topGenres = useMemo(
    () => genresData?.data.slice(0, 6) || [],
    [genresData]
  );

  const topArtistsForChart = useMemo(() => {
    if (!data?.topArtists?.length) return [];
    const total = data.totalListens;
    return data.topArtists.slice(0, 6).map((a) => ({
      artistId: a.artistId,
      name: a.artistName,
      count: a.listenCount,
      percentage: total > 0 ? (a.listenCount / total) * 100 : 0,
    }));
  }, [data]);

  const topTracksForChart = useMemo(() => {
    if (!tracksData?.topTracks?.length) return [];
    const total = tracksData.overview.totalListens;
    return tracksData.topTracks.slice(0, 6).map((track) => ({
      trackId: track.trackId,
      name: track.trackTitle,
      artistName: track.artistName,
      count: track.listenCount,
      percentage: total > 0 ? (track.listenCount / total) * 100 : 0,
    }));
  }, [tracksData]);

  const artistsPageQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (userId) p.set("userId", userId);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [startDate, endDate, userId]);

  const timelineHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/timeline", searchParams),
    [searchParams]
  );
  const genresHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/genres", searchParams),
    [searchParams]
  );
  const tracksHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/tracks", searchParams),
    [searchParams]
  );
  const musicalProfileHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/musical-profile", searchParams),
    [searchParams]
  );
  const musicAgentHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/ask-your-soundprint", searchParams),
    [searchParams]
  );
  const duetHref = useMemo(
    () => mergeDashboardSearchParams("/dashboard/duet/friends", searchParams),
    [searchParams]
  );
  const artistsHref = `/dashboard/artists${artistsPageQuery}`;

  const momentumSlides = useMemo((): OverviewMomentumSlide[] => {
    const slides: OverviewMomentumSlide[] = [];

    if (chartData.length > 0) {
      slides.push({
        id: "timeline",
        label: t("momentumTabs.tabs.timeline"),
        content: (
          <OverviewListeningMomentumCard chartData={chartData} timelineHref={timelineHref} />
        ),
      });
    }

    slides.push(
      {
        id: "artists",
        label: t("momentumTabs.tabs.artists"),
        content: (
          <ArtistTrendsSummaryWidget startDate={startDate} endDate={endDate} embedded />
        ),
      },
      {
        id: "genres",
        label: t("momentumTabs.tabs.genres"),
        content: (
          <GenreTrendsSummaryWidget startDate={startDate} endDate={endDate} embedded />
        ),
      },
      {
        id: "tracks",
        label: t("momentumTabs.tabs.tracks"),
        content: (
          <TrackTrendsSummaryWidget startDate={startDate} endDate={endDate} embedded />
        ),
      }
    );

    return slides;
  }, [chartData, timelineHref, startDate, endDate, t]);

  const sharedFlowProps = {
    title: overviewTitle,
    showPeriodHint: isAll,
    changes,
    momentumSlides,
    topTracks: topTracksForChart,
    topArtists: topArtistsForChart,
    topGenres,
    locale,
    tracksHref,
    artistsHref,
    genresHref,
    musicalProfileHref,
    musicAgentHref,
    duetHref,
    startDate,
    endDate,
    avatarUrl,
    onOpenArtistInsights: handleOpenArtistInsights,
  };

  if (!isLoading && error) {
    return (
      <div className="space-y-8">
        <MobileOverviewUnavailable
          title={overviewTitle}
          description={t("mobile.errorLead")}
          avatarUrl={avatarUrl}
          error={error}
          onRetry={handleRetry}
        />
        <div className="hidden space-y-8 lg:block">
          <OverviewHeroFrame
            title={overviewTitle}
            description={t("errorStateHint")}
            badgeLabel={badgeLabel}
            avatarUrl={avatarUrl}
          />
          <ErrorState
            variant="startup"
            eyebrow={t("errorStateEyebrow")}
            error={error}
            message={t("errorLoading")}
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  if (!isLoading && (!data || data.totalListens === 0)) {
    const empty = emptyStatePresets.importData;
    return (
      <div className="space-y-8">
        <MobileOverviewEmptyView avatarUrl={avatarUrl} />
        <div className="hidden space-y-8 lg:block">
          <OverviewHeroFrame
            title={overviewTitle}
            description={t("emptyStateHeroDescription")}
            badgeLabel={badgeLabel}
            avatarUrl={avatarUrl}
          />
          <EmptyState
            variant="startup"
            eyebrow={t("emptyStateEyebrow")}
            aside={t("emptyStateAside")}
            message={empty.message}
            description={empty.description}
            actions={empty.actions}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data ? (
        <div className="lg:hidden">
          <MobileOverviewFlow
            title={overviewTitle}
            data={data}
            changes={changes}
            topTracks={topTracksForChart}
            topArtists={topArtistsForChart}
            topGenres={topGenres}
            locale={locale}
            tracksHref={tracksHref}
            artistsHref={artistsHref}
            genresHref={genresHref}
            musicalProfileHref={musicalProfileHref}
            musicAgentHref={musicAgentHref}
            duetHref={duetHref}
            avatarUrl={avatarUrl}
          />
        </div>
      ) : (
        <MobileOverviewLoadingFallback title={overviewTitle} />
      )}
      <OverviewDesktopFlow
        {...sharedFlowProps}
        badgeLabel={badgeLabel}
        data={data}
        showComparison={!!previousPeriod}
      />

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
    </div>
  );
}

function OverviewPageFallback() {
  const t = useTranslations("overview");
  const locale = useLocale();
  const { startDate, endDate } = useListenDateRange();
  const dateRangeLabel = formatOverviewDateRangeLabel(startDate, endDate, locale);
  const badgeLabel = dateRangeLabel || t("allData");

  return (
    <div className="space-y-8">
      <MobileOverviewLoadingFallback title={t("title")} />
      <div className="hidden space-y-8 lg:block">
        <OverviewHeroFrame
          title={t("title")}
          description={t("subtitle")}
          badgeLabel={badgeLabel}
        />
        <OverviewSkeleton />
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get("startDate") ?? "";
  const endDateParam = searchParams.get("endDate") ?? "";
  const filterKey = `${startDateParam}-${endDateParam}`;

  return (
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<OverviewPageFallback />}>
        <OverviewContent key={filterKey} />
      </Suspense>
    </div>
  );
}
