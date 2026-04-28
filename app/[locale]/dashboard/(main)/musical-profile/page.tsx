"use client";

import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { EmptyState, useEmptyStatePresets } from "@/lib/components/empty-state";
import { ErrorState, GroqQuotaNotice } from "@/lib/components/error-state";
import {
  ParallaxHero,
  ScrollProgressBar,
  ScrollRevealSection,
  StaggerContainer,
} from "@/lib/components/overview-bis";
import { OverviewSkeleton } from "@/lib/components/skeleton-loaders";
import { getAiInsightsLabels } from "@/lib/constants/ai-insights-labels";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import type { GenreDistributionDto } from "@/lib/dto/genres";
import type { TemporalAnalysisDto } from "@/lib/dto/listening";
import type { TasteProfileInput, TasteProfileResponse } from "@/lib/dto/taste-profile";
import type { TrackStatsDto } from "@/lib/dto/track";
import { useArtistStats } from "@/lib/hooks/use-artists";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import {
  OverviewStatsWithTopArtists,
  useGenres,
  useOverviewStats,
  useTemporalAnalysis,
} from "@/lib/hooks/use-listening";
import { useTrackStats } from "@/lib/hooks/use-tracks";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

const TOP_LIMIT = 6;
const PROFILE_AI_STALE_TIME = 5 * 60 * 1000;

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

function BarsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
    </svg>
  );
}

function formatDateRange(startDate: string | undefined, endDate: string | undefined, locale: string): string {
  if (!startDate || !endDate) return "";
  const formatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
}

function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

function formatCompactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatListeningTime(seconds: number, locale: string, t: ReturnType<typeof useTranslations<"musical-profile">>): string {
  const hours = Math.round(seconds / 3600);
  if (hours >= 1) return `${formatCompactNumber(hours, locale)} ${t("units.hours")}`;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${formatCompactNumber(minutes, locale)} ${t("units.minutes")}`;
}

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
    enabled: !!params.input,
    staleTime: PROFILE_AI_STALE_TIME,
    retry: false,
  });
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-xl shadow-gray-900/5 backdrop-blur dark:border-white/10 dark:bg-gray-900/70">
      <div className={`mb-4 h-1.5 w-14 rounded-full ${accent}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}

function RankedArtistCard({
  artist,
  rank,
  locale,
  listensLabel,
}: {
  artist: ArtistStatsDto;
  rank: number;
  locale: string;
  listensLabel: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-card-border bg-card-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent-violet/10 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-accent-violet/20" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet to-accent-indigo text-lg font-bold text-white shadow-lg shadow-accent-violet/20">
          {rank}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-950 dark:text-white">
            {artist.artistName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatNumber(artist.listenCount, locale)} {listensLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function RankedTrackCard({
  track,
  rank,
  locale,
  listensLabel,
  byLabel,
}: {
  track: TrackStatsDto;
  rank: number;
  locale: string;
  listensLabel: string;
  byLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-rose">
            #{rank}
          </p>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-gray-950 dark:text-white">
            {track.trackTitle}
          </h3>
          <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
            {byLabel} {track.artistName}
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-accent-rose/10 px-3 py-1 text-xs font-semibold text-accent-rose">
          {formatNumber(track.listenCount, locale)}
        </div>
      </div>
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        {formatNumber(track.listenCount, locale)} {listensLabel}
      </p>
    </div>
  );
}

function GenreBar({
  genre,
  index,
  locale,
  listensLabel,
  ofListensLabel,
}: {
  genre: GenreDistributionDto;
  index: number;
  locale: string;
  listensLabel: string;
  ofListensLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            #{index + 1}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-gray-950 dark:text-white">
            {genre.genre}
          </h3>
        </div>
        <p className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-200">
          {genre.percentage.toFixed(1)}%
        </p>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-violet via-accent-indigo to-accent-cyan"
          style={{ width: `${Math.min(100, Math.max(4, genre.percentage))}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        {formatNumber(genre.count, locale)} {listensLabel} {ofListensLabel}
      </p>
    </div>
  );
}

function AiAttributeCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  if (!body.trim()) return null;

  return (
    <div className="rounded-2xl border border-card-border bg-card-surface p-6 shadow-card">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-violet/10 text-accent-violet">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-950 dark:text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{body}</p>
    </div>
  );
}

function MusicalProfileNoDataView({
  locale,
  withFilters,
}: {
  locale: string;
  withFilters: (href: string) => string;
}) {
  const t = useTranslations("musical-profile");
  const emptyStatePresets = useEmptyStatePresets();
  const { startDate, endDate } = useListenDateRange();
  const dateRangeLabel = formatDateRange(startDate, endDate, locale);
  const previewBullets = [t("emptyFeature.item1"), t("emptyFeature.item2"), t("emptyFeature.item3")];

  return (
    <div className="space-y-8 pb-10">
      <ParallaxHero>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-accent-violet/20 bg-gray-950 px-6 py-8 text-white shadow-2xl shadow-accent-violet/20 sm:px-10 sm:py-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.45),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.28),transparent_30%),linear-gradient(135deg,rgba(17,24,39,0.98),rgba(76,29,149,0.78))]" />
          <div className="absolute -bottom-24 left-1/2 h-56 w-[80%] -translate-x-1/2 rounded-full bg-accent-violet/25 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                <ProfileIcon className="h-5 w-5 text-accent-cyan" />
                {t("heroBadge")}
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                {t("heroSubtitle")}
              </p>
              {dateRangeLabel ? (
                <p className="mt-5 text-sm font-medium text-white/55">{dateRangeLabel}</p>
              ) : null}
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
                {t("heroSignature")}
              </p>
              <p className="mt-3 text-2xl font-bold leading-tight text-white/50">{t("unknownArtist")}</p>
              <p className="mt-2 text-sm text-white/55">{t("heroSignatureHintFallback")}</p>
            </div>
          </div>
        </motion.section>
      </ParallaxHero>

      <section className="relative min-h-[240px] w-full overflow-hidden rounded-2xl border border-accent-violet/25 bg-card-surface shadow-2xl ring-1 ring-accent-violet/10 transition-all duration-300 dark:border-accent-violet/30 dark:ring-accent-violet/20">
        <div
          className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-50"
          style={{
            background:
              "radial-gradient(circle at top left, rgba(139, 92, 246, 0.18), transparent 34%), radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.12), transparent 28%)",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-violet via-accent-indigo to-accent-cyan opacity-80" />
        <div className="relative border-b border-gray-100/80 px-6 py-5 dark:border-gray-700/50">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-violet/20 bg-accent-violet/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-violet dark:bg-accent-violet/15">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-violet" aria-hidden />
            {t("emptyFeature.badge")}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("emptyFeature.title")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("emptyFeature.lead")}</p>
        </div>
        <div className="relative space-y-6 p-6">
          <ul className="list-none space-y-3">
            {previewBullets.map((text) => (
              <li key={text} className="flex gap-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-violet"
                  aria-hidden
                />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <Link
            href={withFilters("/dashboard/overview")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            {t("overviewCallout.cta")}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      <EmptyState
        {...emptyStatePresets.importData}
        message={t("noData")}
        description={t("importDescription")}
      />
    </div>
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

  const { startDate, endDate, isLoading: isRangeLoading } = useListenDateRange();
  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch } =
    useOverviewStats(startDate, endDate, userId);
  const { data: artistsData, isLoading: artistsLoading, error: artistsError } =
    useArtistStats(startDate, endDate, userId, TOP_LIMIT, 0);
  const { data: tracksData, isLoading: tracksLoading, error: tracksError } =
    useTrackStats(startDate, endDate, userId, TOP_LIMIT, 0);
  const { data: genresData, isLoading: genresLoading, error: genresError } =
    useGenres(startDate, endDate, userId);
  const { data: temporalData, isLoading: temporalLoading, error: temporalError } =
    useTemporalAnalysis(startDate, endDate, userId);

  const topArtists = useMemo(
    () => artistsData?.topArtists ?? [],
    [artistsData?.topArtists]
  );
  const topTracks = useMemo(
    () => tracksData?.topTracks ?? [],
    [tracksData?.topTracks]
  );
  const topGenres = useMemo(
    () => genresData?.data.slice(0, TOP_LIMIT) ?? [],
    [genresData?.data]
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
  });

  const isLoading =
    isRangeLoading ||
    overviewLoading ||
    artistsLoading ||
    tracksLoading ||
    genresLoading ||
    temporalLoading;

  const dataError = overviewError ?? artistsError ?? tracksError ?? genresError ?? temporalError;
  const hasListeningData = (overview?.totalListens ?? 0) > 0 || topArtists.length > 0 || topTracks.length > 0;

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (dataError && !hasListeningData) {
    return (
      <div className="max-w-4xl">
        <ErrorState
          error={dataError}
          message={t("errorLoading")}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!hasListeningData) {
    return <MusicalProfileNoDataView locale={locale} withFilters={withFilters} />;
  }

  const dateRangeLabel = formatDateRange(startDate, endDate, locale);
  const topArtistName = getTopArtistFallback(topArtists, overview);
  const topGenreName = topGenres[0]?.genre ?? "";
  const profileDescription =
    aiProfile?.description?.trim() ||
    t("deterministicProfile", {
      artist: topArtistName || t("unknownArtist"),
      genre: topGenreName || t("unknownGenre"),
    });
  const showAiUnavailable = aiProfile?.aiUnavailable;

  return (
    <div className="space-y-12 pb-10">
      <ParallaxHero>
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-accent-violet/20 bg-gray-950 px-6 py-8 text-white shadow-2xl shadow-accent-violet/20 sm:px-10 sm:py-12"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.45),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(6,182,212,0.28),transparent_30%),linear-gradient(135deg,rgba(17,24,39,0.98),rgba(76,29,149,0.78))]" />
          <div className="absolute -bottom-24 left-1/2 h-56 w-[80%] -translate-x-1/2 rounded-full bg-accent-violet/25 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                <ProfileIcon className="h-5 w-5 text-accent-cyan" />
                {t("heroBadge")}
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                {t("heroSubtitle")}
              </p>
              {dateRangeLabel && (
                <p className="mt-5 text-sm font-medium text-white/55">{dateRangeLabel}</p>
              )}
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
                {t("heroSignature")}
              </p>
              <p className="mt-3 text-2xl font-bold leading-tight">
                {topArtistName || t("unknownArtist")}
              </p>
              <p className="mt-2 text-sm text-white/65">
                {topGenreName
                  ? t("heroSignatureHint", { genre: topGenreName })
                  : t("heroSignatureHintFallback")}
              </p>
            </div>
          </div>
        </motion.section>
      </ParallaxHero>

      <ScrollRevealSection>
        <section className="relative overflow-hidden rounded-[2rem] border border-accent-cyan/20 bg-gradient-to-br from-accent-violet/10 via-card-surface to-accent-cyan/10 p-6 shadow-card sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent-cyan/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-violet">
                {t("overviewCallout.badge")}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-3xl">
                {t("overviewCallout.title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {t("overviewCallout.body")}
              </p>
            </div>
            <Link
              href={withFilters("/dashboard/overview")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              {t("overviewCallout.cta")}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </section>
      </ScrollRevealSection>

      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t("metrics.totalListens")}
          value={formatNumber(overview?.totalListens ?? 0, locale)}
          hint={t("metrics.totalListensHint")}
          accent="bg-accent-violet"
        />
        <MetricCard
          label={t("metrics.listeningTime")}
          value={formatListeningTime(overview?.totalPlayTime ?? 0, locale, t)}
          hint={t("metrics.listeningTimeHint")}
          accent="bg-accent-cyan"
        />
        <MetricCard
          label={t("metrics.uniqueArtists")}
          value={formatNumber(overview?.uniqueArtists ?? 0, locale)}
          hint={t("metrics.uniqueArtistsHint")}
          accent="bg-accent-rose"
        />
        <MetricCard
          label={t("metrics.uniqueTracks")}
          value={formatNumber(overview?.uniqueTracks ?? 0, locale)}
          hint={t("metrics.uniqueTracksHint")}
          accent="bg-accent-emerald"
        />
      </StaggerContainer>

      <ScrollRevealSection>
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-accent-violet/20 bg-card-surface shadow-2xl ring-2 ring-accent-violet/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.14),transparent_32%),radial-gradient(circle_at_90%_40%,rgba(6,182,212,0.1),transparent_28%)]" />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet to-accent-indigo text-white shadow-lg shadow-accent-violet/20">
                <SparkIcon className="h-7 w-7" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-violet">
                {t("sections.sonicIdentity")}
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
                {t("identityTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {t("identitySubtitle")}
              </p>
              {aiProfile?.cached && (
                <p className="mt-4 inline-flex rounded-full bg-accent-violet/10 px-3 py-1 text-xs font-medium text-accent-violet">
                  {t("aiCached")}
                </p>
              )}
              {showAiUnavailable && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  {t("aiUnavailable")}
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-card-border bg-white/70 p-6 dark:bg-gray-900/60 sm:p-8">
              {aiLoading ? (
                <div className="space-y-3 animate-pulse" aria-busy="true">
                  <div className="h-5 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-5 w-11/12 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-5 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ) : aiError ? (
                isGroqDailyQuotaError(aiError) ? (
                  <GroqQuotaNotice error={aiError} />
                ) : (
                  <div role="alert" className="space-y-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {t("aiErrorTitle")}
                    </p>
                    <p className="text-xl font-semibold leading-8 text-gray-900 dark:text-white">
                      {profileDescription}
                    </p>
                  </div>
                )
              ) : (
                <blockquote className="text-2xl font-semibold leading-9 tracking-tight text-gray-950 dark:text-white">
                  &ldquo;{profileDescription}&rdquo;
                </blockquote>
              )}
            </div>
          </div>
        </section>
      </ScrollRevealSection>

      <ScrollRevealSection className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
        <section className="rounded-[2rem] border border-card-border bg-card-surface p-6 shadow-card sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-violet">
                {t("sections.topGenres")}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                {t("genreDnaTitle")}
              </h2>
            </div>
            <BarsIcon className="h-7 w-7 text-accent-violet" />
          </div>
          <div className="space-y-3">
            {topGenres.map((genre, index) => (
              <GenreBar
                key={genre.genre}
                genre={genre}
                index={index}
                locale={locale}
                listensLabel={t("labels.listens")}
                ofListensLabel={t("labels.ofListens")}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-card-border bg-card-surface p-6 shadow-card sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-rose">
              {t("sections.topArtists")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
              {t("artistConstellationTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {topArtists.map((artist, index) => (
              <RankedArtistCard
                key={artist.artistId}
                artist={artist}
                rank={index + 1}
                locale={locale}
                listensLabel={t("labels.listens")}
              />
            ))}
          </div>
        </section>
      </ScrollRevealSection>

      <ScrollRevealSection className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-cyan">
            {t("sections.topTracks")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
            {t("trackObsessionTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topTracks.map((track, index) => (
            <RankedTrackCard
              key={track.trackId}
              track={track}
              rank={index + 1}
              locale={locale}
              listensLabel={t("labels.listens")}
              byLabel={t("labels.by")}
            />
          ))}
        </div>
      </ScrollRevealSection>

      <ScrollRevealSection className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-violet">
            {t("sections.aiAttributes")}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
            {t("aiAttributesTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AiAttributeCard
            title={t("cards.influences")}
            body={aiProfile?.influences ?? ""}
            icon={<SparkIcon className="h-5 w-5" />}
          />
          <AiAttributeCard
            title={t("cards.coreGenres")}
            body={aiProfile?.coreGenres ?? ""}
            icon={<BarsIcon className="h-5 w-5" />}
          />
          <AiAttributeCard
            title={t("cards.uniqueAspect")}
            body={aiProfile?.uniqueAspect ?? ""}
            icon={<ProfileIcon className="h-5 w-5" />}
          />
        </div>
      </ScrollRevealSection>

      <ScrollRevealSection className="border-t border-gray-100 pt-8 dark:border-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-950 dark:text-white">
          {t("exploreMore")}
        </h2>
        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard/artists", label: t("ctas.artists"), icon: <ProfileIcon className="h-5 w-5" /> },
            { href: "/dashboard/tracks", label: t("ctas.tracks"), icon: <BarsIcon className="h-5 w-5" /> },
            { href: "/dashboard/genres", label: t("ctas.genres"), icon: <BarsIcon className="h-5 w-5" /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-card-border bg-card-surface p-4 text-sm font-medium text-gray-700 shadow-card transition-all hover:-translate-y-0.5 hover:border-accent-violet/30 hover:text-accent-violet hover:shadow-card-hover dark:text-gray-300"
            >
              <span className="text-accent-violet">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </StaggerContainer>
      </ScrollRevealSection>
    </div>
  );
}

function MusicalProfileFallback() {
  return (
    <div className="space-y-8">
      <div className="h-72 rounded-[2rem] bg-gray-100 animate-shimmer dark:bg-gray-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 rounded-2xl bg-gray-100 animate-shimmer dark:bg-gray-800" />
        ))}
      </div>
      <div className="h-80 rounded-[2rem] bg-gray-100 animate-shimmer dark:bg-gray-800" />
    </div>
  );
}

export default function MusicalProfilePage() {
  return (
    <div className="relative px-4 py-6 sm:px-0">
      <ScrollProgressBar />
      <Suspense fallback={<MusicalProfileFallback />}>
        <MusicalProfileContent />
      </Suspense>
    </div>
  );
}
