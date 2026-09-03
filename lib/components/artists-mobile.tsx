"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import type { ArtistOverviewDto, ArtistStatsDto } from "@/lib/dto/artist";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";

const MOBILE_BLEED = "-mx-4 -mt-4 space-y-4 pb-8 lg:hidden";
const HERO_SHELL = "relative overflow-hidden bg-gray-950 px-4 pb-5 pt-4 text-white";
const SNAP_RAIL =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
      />
    </svg>
  );
}

function formatShare(share: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(share);
}

function ArtistsMobileHero({
  locale,
  topArtist,
  listenLabel,
  shareLabel,
  heading,
}: {
  locale: string;
  topArtist?: ArtistStatsDto;
  listenLabel?: string;
  shareLabel?: string;
  heading?: string;
}) {
  const t = useTranslations("artists.mobile");
  const { startDate, endDate } = useListenDateRange();
  const name = heading ?? topArtist?.artistName ?? t("emptyTitle");

  return (
    <section className={HERO_SHELL}>
      <DashboardCinematicHeroBg />
      <div className="relative space-y-4">
        <div className="flex justify-end">
          <MusicalProfilePeriodBadge
            startDate={startDate}
            endDate={endDate}
            locale={locale}
            variant="mobile"
            className="min-w-0"
          />
        </div>
        <div className="flex items-center gap-3.5">
          {topArtist ? (
            <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-[1.2rem] shadow-2xl shadow-black/35 ring-1 ring-white/15">
              <ArtistAvatarHydrated
                artistId={topArtist.artistId}
                artistName={topArtist.artistName}
                imageUrl={topArtist.imageUrl}
                avatarApiSize={256}
                colorIndex={0}
                alt=""
                width={72}
                height={72}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-1 text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
              {name}
            </h1>
            {listenLabel ? (
              <p className="mt-1.5 text-sm font-semibold tabular-nums text-white/80">{listenLabel}</p>
            ) : null}
            {shareLabel ? (
              <p className="mt-0.5 text-xs text-white/62">{shareLabel}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ArtistsMobileSkeleton() {
  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative flex items-center gap-3.5">
          <div className="h-[4.5rem] w-[4.5rem] animate-pulse rounded-[1.2rem] bg-white/15" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
            <div className="h-7 w-40 animate-pulse rounded bg-white/20" />
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </section>
      <section className="px-4">
        <div className={SNAP_RAIL}>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-24 min-w-[9.75rem] snap-start animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </section>
      <section className="space-y-2 px-4">
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface" />
        ))}
      </section>
    </div>
  );
}

export function ArtistsMobileEmpty() {
  const t = useTranslations("artists.mobile");

  return (
    <DashboardMobileImportEmpty
      eyebrow={t("heroEyebrow")}
      title={t("emptyTitle")}
      lead={t("emptyLead")}
      demoPath="/dashboard/artists"
      importLabel={t("emptyCta")}
    />
  );
}

export function ArtistsMobileError({
  locale,
  error,
  onRetry,
}: {
  locale: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("artists.mobile");
  const tCommon = useTranslations("common");
  const { startDate, endDate } = useListenDateRange();
  const isQuota = isGroqDailyQuotaError(error);

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <div className="flex justify-end">
            <MusicalProfilePeriodBadge
              startDate={startDate}
              endDate={endDate}
              locale={locale}
              variant="mobile"
              className="min-w-0"
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("heroEyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
            {t("errorLead")}
          </h1>
          {isQuota ? (
            <GroqQuotaNotice error={error} />
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
            >
              {tCommon("retry")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function SignalTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-[9.75rem] snap-start rounded-3xl border border-card-border bg-gray-950 p-4 text-white shadow-lg shadow-black/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em]">{value}</p>
    </article>
  );
}

function ArtistRankRow({
  artist,
  rank,
  locale,
  onOpenInsights,
}: {
  artist: ArtistStatsDto;
  rank: number;
  locale: string;
  onOpenInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
}) {
  const t = useTranslations("artists");

  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
      onClick={() => onOpenInsights(artist, rank - 1)}
      aria-label={t("artistInsightsAriaOpen", { name: artist.artistName })}
    >
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">{rank}</span>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
        <ArtistAvatarHydrated
          artistId={artist.artistId}
          artistName={artist.artistName}
          imageUrl={artist.imageUrl}
          avatarApiSize={80}
          colorIndex={rank - 1}
          alt=""
          width={40}
          height={40}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
        {artist.artistName}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {artist.listenCount.toLocaleString(locale)}
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

export function ArtistsMobileExperience({
  trendsHref,
  overview,
  topArtists,
  pagedArtists,
  isTopLoading,
  isPagedFetching,
  page,
  pageSize,
  totalPages,
  total,
  hasMore,
  offset,
  onPageChange,
  onPageSizeChange,
  onOpenArtistInsights,
  locale,
  searchInput,
  onSearchInputChange,
}: {
  trendsHref: string;
  overview: ArtistOverviewDto | undefined;
  topArtists: ArtistStatsDto[];
  pagedArtists: ArtistStatsDto[];
  isTopLoading: boolean;
  isPagedFetching: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  offset: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  onOpenArtistInsights: (artist: ArtistStatsDto, avatarColorIndex: number) => void;
  locale: string;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
}) {
  const t = useTranslations("artists");
  const tm = useTranslations("artists.mobile");
  const topArtist = topArtists[0];
  const topShare =
    overview && overview.totalListens > 0 && topArtist
      ? topArtist.listenCount / overview.totalListens
      : 0;
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + pagedArtists.length, total);

  if (isTopLoading) return <ArtistsMobileSkeleton />;

  return (
    <div className={MOBILE_BLEED}>
      <ArtistsMobileHero
        locale={locale}
        topArtist={topArtist}
        listenLabel={
          topArtist
            ? tm("listenCount", { count: formatter.format(topArtist.listenCount) })
            : undefined
        }
        shareLabel={topArtist ? tm("shareLabel", { share: formatShare(topShare, locale) }) : undefined}
      />

      <section className="px-4" aria-label={tm("signalsLabel")}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("signalsLabel")}
        </p>
        <div className={SNAP_RAIL}>
          <SignalTile label={t("artists")} value={formatter.format(overview?.totalArtists ?? 0)} />
          <SignalTile label={t("listens")} value={formatter.format(overview?.totalListens ?? 0)} />
          <SignalTile label={tm("shareSignal")} value={formatShare(topShare, locale)} />
        </div>
      </section>

      <section className="space-y-3 px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("listTitle")}
        </h2>
        <div>
          <label htmlFor="artists-ranking-search-mobile" className="sr-only">
            {t("rankingSearchAria")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              id="artists-ranking-search-mobile"
              type="search"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              placeholder={t("rankingSearchPlaceholder")}
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 w-full rounded-2xl border border-card-border bg-white py-2.5 pl-10 pr-3 text-sm text-foreground shadow-sm placeholder:text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/25 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>
        </div>
        <div className="space-y-2">
          {isPagedFetching
            ? Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                <div
                  key={`artist-mobile-row-skeleton-${index}`}
                  className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface"
                />
              ))
            : pagedArtists.length === 0
              ? (
                  <p className="px-1 py-8 text-center text-sm text-muted">{t("rankingSearchEmpty")}</p>
                )
              : pagedArtists.map((artist, index) => (
                  <ArtistRankRow
                    key={artist.artistId}
                    artist={artist}
                    rank={artist.rank ?? offset + index + 1}
                    locale={locale}
                    onOpenInsights={onOpenArtistInsights}
                  />
                ))}
        </div>
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted">
            {t("paginationSummary", {
              start: pageStart,
              end: pageEnd,
              total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("paginationPrevious")}
            </button>
            <span className="shrink-0 px-2 text-xs font-semibold text-muted">
              {t("paginationPage", { page, totalPages })}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasMore}
              className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("paginationNext")}
            </button>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground">
            <span>{t("pageSizeLabel")}</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-xl border border-card-border bg-card-surface px-3 py-2 text-sm"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </section>

      <section className="px-4">
        <Link
          href={trendsHref}
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-gray-950 shadow-sm dark:text-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
            <TrendIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold tracking-tight">{t("viewTrends")}</span>
            <span className="mt-0.5 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
              {tm("trendsLead")}
            </span>
          </span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
        </Link>
      </section>
    </div>
  );
}
