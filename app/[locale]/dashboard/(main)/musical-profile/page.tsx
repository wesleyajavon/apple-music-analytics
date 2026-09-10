"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { GenreDistributionDto } from "@/lib/dto/genres";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import type { TasteProfileInput, TasteProfileResponse } from "@/lib/dto/taste-profile";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import {
  OverviewStatsWithTopArtists,
  useGenres,
  useOverviewStats,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { firstKnownGenreName } from "@/lib/utils/genre-unknown-label";
import { useInteractiveAiBlockedByGenreBackfill } from "@/lib/hooks/use-interactive-ai-blocked-by-genre-backfill";
import {
  MusicalProfileDestinations,
  MusicalProfileIdentity,
  MusicalProfileMasthead,
  MusicalProfileMetricStrip,
} from "@/lib/components/musical-profile-chrome";
import { MusicalProfileSpotlight } from "@/lib/components/musical-profile-spotlight";
import { ReplayRankingSkeleton } from "@/lib/components/replay-ranking-grid";
import {
  MobileMusicalProfileView,
  MusicalProfileMobileError,
  MusicalProfileMobileSkeleton,
  MusicalProfileNoDataMobileView,
} from "@/lib/components/musical-profile-mobile";

const TOP_LIMIT = 6;
const PROFILE_AI_STALE_TIME = 5 * 60 * 1000;
const DESKTOP_CANVAS = "hidden space-y-12 pb-6 lg:block lg:pb-10";

function getTopArtistFallback(artists: ArtistStatsDto[], overview?: OverviewStatsWithTopArtists) {
  if (artists[0]) return artists[0].artistName;
  return overview?.topArtists?.[0]?.artistName ?? "";
}

function buildTasteProfileInput(params: {
  startDate: string;
  endDate: string;
  overview: OverviewStatsWithTopArtists;
  genres: GenreDistributionDto[];
  temporal: TemporalAnalysisDto;
  artists: ArtistStatsDto[];
  locale: string;
}): TasteProfileInput {
  const labels = getAiInsightsLabels(params.locale);

  return {
    dateRange: { start: params.startDate, end: params.endDate },
    genreDistribution: params.genres.slice(0, 12).map((genre) => ({
      genre: genre.genre,
      count: genre.count,
      percentage: genre.percentage,
    })),
    listeningByTimeOfDay: params.temporal.byHourOfDay.map((hour) => ({
      hour: hour.hour,
      listens: hour.listens,
    })),
    topArtists: params.artists.slice(0, 10).map((artist) => ({
      artistName: artist.artistName,
      listenCount: artist.listenCount,
      genre: undefined,
    })),
    peakDay: params.temporal.peakDay
      ? {
          dayName: labels.dayNames[params.temporal.peakDay.dayOfWeek],
          listens: params.temporal.peakDay.listens,
        }
      : undefined,
    peakHour: params.temporal.peakHour
      ? {
          hour: params.temporal.peakHour.hour,
          listens: params.temporal.peakHour.listens,
        }
      : undefined,
    totalListens: params.overview.totalListens,
    uniqueArtists: params.overview.uniqueArtists,
    uniqueTracks: params.overview.uniqueTracks,
  };
}

function usePreparedTasteProfile(params: {
  input: TasteProfileInput | null;
  startDate?: string;
  endDate?: string;
  locale: string;
  userId?: string;
  interactiveAiBlockedByGenreBackfill?: boolean;
}) {
  return useQuery<TasteProfileResponse, Error>({
    queryKey: [
      "musical-profile",
      "prepared-taste-profile",
      {
        startDate: params.startDate,
        endDate: params.endDate,
        locale: params.locale,
        userId: params.userId,
        totalListens: params.input?.totalListens,
        uniqueArtists: params.input?.uniqueArtists,
        uniqueTracks: params.input?.uniqueTracks,
      },
    ],
    queryFn: () =>
      apiClient.post<TasteProfileResponse>("/ai/taste-profile", {
        ...params.input,
        tone: "poetic",
        locale: params.locale,
        userId: params.userId,
      }),
    enabled: !!params.input && !params.interactiveAiBlockedByGenreBackfill,
    staleTime: PROFILE_AI_STALE_TIME,
    retry: false,
  });
}

function MusicalProfileFallback() {
  const locale = useLocale();
  return (
    <>
      <MusicalProfileMobileSkeleton locale={locale} />
      <div className={DESKTOP_CANVAS}>
        <MusicalProfileMasthead />
        <MusicalProfileMetricStrip locale={locale} loading />
        <ReplayRankingSkeleton count={4} />
      </div>
    </>
  );
}

function MusicalProfileContent() {
  const t = useTranslations("musical-profile");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? undefined;
  const withFilters = useMemo(
    () => (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams]
  );
  const emptyStatePresets = useEmptyStatePresets({
    demoPath: "/dashboard/musical-profile",
  });

  const interactiveAiBlockedByGenreBackfill = useInteractiveAiBlockedByGenreBackfill();

  const [avatarName, setAvatarName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    setAvatarName(null);
    setAvatarUrl(null);

    async function hydrateDashboardSubjectAvatar() {
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
      setAvatarName(payload.user?.name?.trim() || null);
      setAvatarUrl(payload.user?.avatarUrl ?? null);
    }

    void hydrateDashboardSubjectAvatar();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch } =
    useOverviewStats(startDate, endDate, userId);
  const { data: artistsData, isLoading: artistsLoading, error: artistsError } =
    useArtistStats(startDate, endDate, userId, TOP_LIMIT, 0);
  const { data: genresData, isLoading: genresLoading, error: genresError } =
    useGenres(startDate, endDate, userId);
  const { data: temporalData, isLoading: temporalLoading, error: temporalError } =
    useTemporalAnalysis(startDate, endDate, userId);

  const [artistInsightsTarget, setArtistInsightsTarget] = useState<{
    artist: ArtistStatsDto;
    avatarColorIndex: number;
  } | null>(null);

  const handleOpenArtistInsights = useCallback((artist: ArtistStatsDto, avatarColorIndex: number) => {
    setArtistInsightsTarget({ artist, avatarColorIndex });
  }, []);

  const topArtists = useMemo(
    () => artistsData?.topArtists ?? [],
    [artistsData?.topArtists]
  );

  const profileInput = useMemo(() => {
    if (!startDate || !endDate || !overview || !genresData || !temporalData) {
      return null;
    }

    return buildTasteProfileInput({
      startDate,
      endDate,
      overview,
      genres: genresData.data,
      temporal: temporalData,
      artists: topArtists,
      locale,
    });
  }, [endDate, genresData, locale, overview, startDate, temporalData, topArtists]);

  const {
    data: aiProfile,
    isLoading: aiLoading,
    error: aiError,
  } = usePreparedTasteProfile({
    input: profileInput,
    startDate,
    endDate,
    locale,
    userId,
    interactiveAiBlockedByGenreBackfill,
  });

  const isLoading =
    isRangeLoading || overviewLoading || artistsLoading || genresLoading || temporalLoading;

  const dataError = overviewError ?? artistsError ?? genresError ?? temporalError;
  const hasListeningData = (overview?.totalListens ?? 0) > 0 || topArtists.length > 0;
  const seeAllArtistsHref = withFilters("/dashboard/artists");
  const subjectAvatar = { avatarUrl, avatarName };

  if (!isLoading && dataError && !hasListeningData) {
    return (
      <>
        <MusicalProfileMobileError
          error={dataError}
          onRetry={() => void refetch()}
          {...subjectAvatar}
        />
        <div className={DESKTOP_CANVAS}>
          <MusicalProfileMasthead {...subjectAvatar} />
          <ErrorState
            variant="startup"
            error={dataError}
            message={t("errorLoading")}
            onRetry={() => void refetch()}
          />
        </div>
      </>
    );
  }

  if (!isLoading && !hasListeningData) {
    return (
      <>
        <MusicalProfileNoDataMobileView {...subjectAvatar} />
        <div className={DESKTOP_CANVAS}>
          <MusicalProfileMasthead {...subjectAvatar} />
          <EmptyState
            variant="startup"
            {...emptyStatePresets.importData}
            message={t("noData")}
            description={t("importDescription")}
          />
        </div>
      </>
    );
  }

  const topArtistName = getTopArtistFallback(topArtists, overview);
  const topGenreName = firstKnownGenreName(genresData?.data);
  const profileDescription =
    aiProfile?.description?.trim() ||
    t("deterministicProfile", {
      artist: topArtistName || t("unknownArtist"),
      genre: topGenreName || t("unknownGenre"),
    });

  const identityProps = {
    aiCached: aiProfile?.cached,
    aiError: aiError ?? null,
    aiLoading,
    interactiveAiBlockedByGenreBackfill,
    profileDescription,
    showAiUnavailable: aiProfile?.aiUnavailable,
    aiUnavailableReason: aiProfile?.aiUnavailableReason,
  };

  const mastheadIdentity = (
    <MusicalProfileIdentity titleId="musical-profile-identity-title" {...identityProps} />
  );

  return (
    <>
      <MobileMusicalProfileView
        {...identityProps}
        {...subjectAvatar}
        artistsLoading={isLoading}
        locale={locale}
        peakDay={temporalData?.peakDay ?? null}
        peakHour={temporalData?.peakHour ?? null}
        seeAllArtistsHref={seeAllArtistsHref}
        topArtists={topArtists}
        totalListens={overview?.totalListens}
        totalPlayTime={overview?.totalPlayTime}
        uniqueArtists={overview?.uniqueArtists}
        uniqueTracks={overview?.uniqueTracks}
        withFilters={withFilters}
        onOpenArtistInsights={handleOpenArtistInsights}
      />

      <div className={DESKTOP_CANVAS}>
        <MusicalProfileMasthead {...subjectAvatar}>{mastheadIdentity}</MusicalProfileMasthead>
        <MusicalProfileMetricStrip
          locale={locale}
          loading={isLoading}
          totalListens={overview?.totalListens}
          totalPlayTime={overview?.totalPlayTime}
          uniqueArtists={overview?.uniqueArtists}
          uniqueTracks={overview?.uniqueTracks}
          peakDay={temporalData?.peakDay ?? null}
          peakHour={temporalData?.peakHour ?? null}
        />
        <MusicalProfileSpotlight
          titleId="musical-profile-desktop-signature-title"
          artists={topArtists}
          isLoading={isLoading}
          locale={locale}
          seeAllHref={seeAllArtistsHref}
          onOpenArtistInsights={handleOpenArtistInsights}
        />
        <MusicalProfileDestinations
          titleId="musical-profile-desktop-explore-title"
          yourMusicHref={withFilters("/dashboard/overview")}
          chatHref={withFilters("/dashboard/ask-your-soundprint")}
          duetHref={withFilters("/dashboard/duet/friends")}
        />
      </div>

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
    </>
  );
}

export default function MusicalProfilePage() {
  const pathname = usePathname();

  return (
    <div className="max-lg:p-0 lg:py-6">
      <Suspense fallback={<MusicalProfileFallback />}>
        <div key={pathname}>
          <MusicalProfileContent />
        </div>
      </Suspense>
    </div>
  );
}
