"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import type { TrackOverviewDto, TrackStatsDto } from "@/lib/dto/track";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { formatListeningTime } from "@/lib/utils/overview-page";

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

function formatListenDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

function TracksMobileHero({
  locale,
  heading,
  artistName,
  listenLabel,
  shareLabel,
}: {
  locale: string;
  heading: string;
  artistName?: string;
  listenLabel?: string;
  shareLabel?: string;
}) {
  const t = useTranslations("tracks.mobile");
  const { startDate, endDate } = useListenDateRange();

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
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("heroEyebrow")}
          </p>
          <h1 className="mt-1 text-[1.55rem] font-semibold leading-[1.12] tracking-[-0.05em]">
            {heading}
          </h1>
          {artistName ? <p className="mt-1.5 text-sm text-white/80">{artistName}</p> : null}
          {listenLabel || shareLabel ? (
            <p className="mt-1 text-sm font-semibold tabular-nums text-white/80">
              {[listenLabel, shareLabel].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function TracksMobileSkeleton() {
  return (
    <div className={MOBILE_BLEED} aria-busy="true">
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-3">
          <div className="ml-auto h-8 w-36 animate-pulse rounded-full bg-white/15" />
          <div className="h-3 w-20 animate-pulse rounded bg-white/15" />
          <div className="h-8 w-48 animate-pulse rounded bg-white/20" />
          <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
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

export function TracksMobileEmpty() {
  const t = useTranslations("tracks.mobile");

  return (
    <div className={MOBILE_BLEED}>
      <section className={HERO_SHELL}>
        <DashboardCinematicHeroBg />
        <div className="relative space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-cyan">
            {t("heroEyebrow")}
          </p>
          <h1 className="max-w-[16rem] text-[1.55rem] font-semibold leading-[1.15] tracking-[-0.05em]">
            {t("emptyTitle")}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-white/70">{t("emptyLead")}</p>
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {t("emptyCta")}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function TracksMobileError({
  locale,
  children,
}: {
  locale: string;
  children?: ReactNode;
}) {
  const t = useTranslations("tracks.mobile");

  return (
    <div className={MOBILE_BLEED}>
      <TracksMobileHero locale={locale} heading={t("errorLead")} />
      {children ? <div className="px-4">{children}</div> : null}
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

function TrackRankRow({
  track,
  rank,
  locale,
  onOpen,
}: {
  track: TrackStatsDto;
  rank: number;
  locale: string;
  onOpen: (track: TrackStatsDto) => void;
}) {
  const t = useTranslations("tracks.mobile");

  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
      onClick={() => onOpen(track)}
      aria-label={t("sheetOpenAria", { title: track.trackTitle })}
    >
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{track.trackTitle}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{track.artistName}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {track.listenCount.toLocaleString(locale)}
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

function TrackFiltersSheet({
  open,
  onClose,
  searchInput,
  onSearchInputChange,
  pageSize,
  onPageSizeChange,
}: {
  open: boolean;
  onClose: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (nextPageSize: number) => void;
}) {
  const t = useTranslations("tracks");
  const tm = useTranslations("tracks.mobile");
  const tCommon = useTranslations("common");
  const titleId = useId();

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      insetAboveBottomNav
    >
      <div className="px-4 pb-2 pt-1">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
            {tm("filtersLabel")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
            aria-label={tm("sheetCloseAria")}
          >
            {tCommon("close")}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="tracks-ranking-search-mobile" className="sr-only">
              {t("rankingSearchAria")}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="tracks-ranking-search-mobile"
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
      </div>
    </MobileBottomSheet>
  );
}

function TrackDetailSheet({
  track,
  totalListens,
  locale,
  open,
  onClose,
}: {
  track: TrackStatsDto | null;
  totalListens: number;
  locale: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("tracks");
  const tm = useTranslations("tracks.mobile");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const share = track && totalListens > 0 ? track.listenCount / totalListens : 0;
  const playTime = formatListeningTime(track?.totalPlayTime ?? 0, tm("unavailable"));

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      insetAboveBottomNav
    >
      {track ? (
        <div className="px-4 pb-2 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight text-foreground">
                {track.trackTitle}
              </h2>
              <p className="mt-1 truncate text-sm text-muted">{track.artistName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted"
              aria-label={tm("sheetCloseAria")}
            >
              {tCommon("close")}
            </button>
          </div>
          <dl className="space-y-3">
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
              <dt className="text-sm text-muted">{t("listens")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {track.listenCount.toLocaleString(locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
              <dt className="text-sm text-muted">{tm("shareSignal")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {formatShare(share, locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
              <dt className="text-sm text-muted">{tm("detailGenre")}</dt>
              <dd className="max-w-[60%] truncate text-sm font-semibold text-foreground">
                {track.genre ?? tm("unavailable")}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
              <dt className="text-sm text-muted">{tm("detailFirst")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {formatListenDate(track.firstListenDate, locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
              <dt className="text-sm text-muted">{tm("detailLast")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">
                {formatListenDate(track.lastListenDate, locale)}
              </dd>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5">
              <dt className="text-sm text-muted">{tm("detailPlayTime")}</dt>
              <dd className="text-sm font-semibold tabular-nums text-foreground">{playTime}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </MobileBottomSheet>
  );
}

export function TracksMobileExperience({
  trendsHref,
  overview,
  topTracks,
  pagedTracks,
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
  locale,
  searchInput,
  onSearchInputChange,
}: {
  trendsHref: string;
  overview: TrackOverviewDto | undefined;
  topTracks: TrackStatsDto[];
  pagedTracks: TrackStatsDto[];
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
  locale: string;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
}) {
  const t = useTranslations("tracks");
  const tm = useTranslations("tracks.mobile");
  const topTrack = topTracks[0];
  const topShare =
    overview && overview.totalListens > 0 && topTrack
      ? topTrack.listenCount / overview.totalListens
      : 0;
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + pagedTracks.length, total);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackStatsDto | null>(null);

  if (isTopLoading) return <TracksMobileSkeleton />;
  if (!topTrack) return <TracksMobileEmpty />;

  return (
    <div className={MOBILE_BLEED}>
      <TracksMobileHero
        locale={locale}
        heading={topTrack.trackTitle}
        artistName={topTrack.artistName}
        listenLabel={tm("listenCount", { count: formatter.format(topTrack.listenCount) })}
        shareLabel={tm("shareLabel", { share: formatShare(topShare, locale) })}
      />

      <section className="px-4" aria-label={tm("signalsLabel")}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("signalsLabel")}
        </p>
        <div className={SNAP_RAIL}>
          <SignalTile label={t("tracks")} value={formatter.format(overview?.totalTracks ?? 0)} />
          <SignalTile label={t("listens")} value={formatter.format(overview?.totalListens ?? 0)} />
          <SignalTile label={tm("shareSignal")} value={formatShare(topShare, locale)} />
        </div>
      </section>

      <section className="space-y-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {tm("listTitle")}
          </h2>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-card-border bg-card-surface px-3.5 text-sm font-semibold text-foreground"
            aria-label={tm("filtersOpenAria")}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {tm("filtersLabel")}
          </button>
        </div>
        <div className="space-y-2">
          {isPagedFetching
            ? Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                <div
                  key={`track-mobile-row-skeleton-${index}`}
                  className="h-11 animate-pulse rounded-2xl border border-card-border bg-card-surface"
                />
              ))
            : pagedTracks.length === 0
              ? (
                  <p className="px-1 py-8 text-center text-sm text-muted">{t("rankingSearchEmpty")}</p>
                )
              : pagedTracks.map((track, index) => (
                  <TrackRankRow
                    key={track.trackId}
                    track={track}
                    rank={track.rank ?? offset + index + 1}
                    locale={locale}
                    onOpen={setSelectedTrack}
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

      <TrackFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        searchInput={searchInput}
        onSearchInputChange={onSearchInputChange}
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
      />
      <TrackDetailSheet
        track={selectedTrack}
        totalListens={overview?.totalListens ?? 0}
        locale={locale}
        open={selectedTrack != null}
        onClose={() => setSelectedTrack(null)}
      />
    </div>
  );
}
