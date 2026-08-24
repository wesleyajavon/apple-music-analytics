"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ArtistAvatarHydrated } from "@/lib/components/artist-avatar-hydrated";
import { DashboardCinematicHeroBg } from "@/lib/components/dashboard-ui";
import { GroqQuotaNotice } from "@/lib/components/error-state";
import { MusicalProfilePeriodBadge } from "@/lib/components/musical-profile-period-badge";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";
import { useListenDateRange } from "@/lib/hooks/use-listen-date-range";
import { isGroqDailyQuotaError } from "@/lib/utils/groq-quota-message";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";

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

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.576-.576 1.5-.576 2.076 0l2.652 2.652c.576.576.576 1.5 0 2.076l-2.88 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
      />
    </svg>
  );
}

const GENRE_COLORS = [
  "#818cf8",
  "#f472b6",
  "#22d3ee",
  "#f59e0b",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
  "#c084fc",
  "#38bdf8",
  "#f97316",
];

export type GenreMobileRow = {
  name: string;
  value: number;
  percentage: number;
  count: number;
  rank: number;
};

export type GenreMobileArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
};

function GenresMobileHero({
  locale,
  heading,
  listenLabel,
  shareLabel,
}: {
  locale: string;
  heading: string;
  listenLabel?: string;
  shareLabel?: string;
}) {
  const t = useTranslations("genres.mobile");
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
          {listenLabel ? (
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-white/80">{listenLabel}</p>
          ) : null}
          {shareLabel ? <p className="mt-0.5 text-xs text-white/70">{shareLabel}</p> : null}
        </div>
      </div>
    </section>
  );
}

export function GenresMobileSkeleton() {
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

export function GenresMobileEmpty() {
  const t = useTranslations("genres.mobile");

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

export function GenresMobileError({
  locale,
  error,
  onRetry,
}: {
  locale: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations("genres.mobile");
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

function DestinationRow({
  href,
  title,
  lead,
  icon,
}: {
  href: string;
  title: string;
  lead: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-gray-950 shadow-sm dark:text-white"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">
          {lead}
        </span>
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
    </Link>
  );
}

function GenreRankRow({
  genre,
  locale,
  onOpen,
}: {
  genre: GenreMobileRow;
  locale: string;
  onOpen: (genre: GenreMobileRow) => void;
}) {
  const t = useTranslations("genres.mobile");
  const color = GENRE_COLORS[Math.max(0, genre.rank - 1) % GENRE_COLORS.length];

  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 text-left shadow-sm"
      onClick={() => onOpen(genre)}
      aria-label={t("sheetOpenAria", { name: genre.name })}
    >
      <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-muted">
        {genre.rank}
      </span>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{genre.name}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {genre.percentage.toLocaleString(locale, { maximumFractionDigits: 1 })}%
      </span>
      <ChevronIcon className="h-4 w-4 shrink-0 text-gray-400" />
    </button>
  );
}

function GenreDetailSheet({
  genre,
  artists,
  locale,
  trendsHref,
  open,
  onClose,
}: {
  genre: GenreMobileRow | null;
  artists: GenreMobileArtist[];
  locale: string;
  trendsHref: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("genres");
  const tm = useTranslations("genres.mobile");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      insetAboveBottomNav
    >
      {genre ? (
        <div className="px-4 pb-2 pt-1">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="truncate text-lg font-semibold tracking-tight text-foreground">
                {genre.name}
              </h2>
              <p className="mt-1 text-sm tabular-nums text-muted">
                {tm("shareLabel", { share: formatShare(genre.percentage / 100, locale) })}
                {" · "}
                {tm("listenCount", { count: formatter.format(genre.count) })}
              </p>
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

          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {tm("sheetArtistsTitle")}
            </h3>
            {artists.length > 0 ? (
              <ul className="space-y-2">
                {artists.map((artist, index) => (
                  <li
                    key={artist.id}
                    className="flex min-h-11 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <ArtistAvatarHydrated
                        artistId={artist.id}
                        artistName={artist.name}
                        imageUrl={artist.imageUrl}
                        avatarApiSize={80}
                        colorIndex={index}
                        alt=""
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {artist.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted">{tm("sheetNoArtists")}</p>
            )}
            <DestinationRow
              href={trendsHref}
              title={t("viewTrends")}
              lead={tm("sheetTrendsLead")}
              icon={<TrendIcon className="h-5 w-5" />}
            />
          </div>
        </div>
      ) : null}
    </MobileBottomSheet>
  );
}

export function GenresMobileExperience({
  trendsHref,
  paletteHref,
  chartData,
  rankingRows,
  totalListens,
  topArtistsByGenre,
  showPalette,
  locale,
  searchInput,
  onSearchInputChange,
  detailPage,
  detailPageSize,
  detailTotal,
  detailTotalPages,
  detailStart,
  detailEnd,
  onPageChange,
  onPageSizeChange,
}: {
  trendsHref: string;
  paletteHref: string;
  chartData: GenreMobileRow[];
  rankingRows: GenreMobileRow[];
  totalListens: number;
  topArtistsByGenre: Map<string, GenreMobileArtist[]>;
  showPalette: boolean;
  locale: string;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  detailPage: number;
  detailPageSize: number;
  detailTotal: number;
  detailTotalPages: number;
  detailStart: number;
  detailEnd: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
}) {
  const t = useTranslations("genres");
  const tm = useTranslations("genres.mobile");
  const topGenre = chartData[0];
  const topThreeShare = chartData.slice(0, 3).reduce((sum, genre) => sum + genre.percentage, 0) / 100;
  const topShare = (topGenre?.percentage ?? 0) / 100;
  const formatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const [selectedGenre, setSelectedGenre] = useState<GenreMobileRow | null>(null);

  if (!topGenre) return <GenresMobileEmpty />;

  const selectedArtists = selectedGenre
    ? (topArtistsByGenre.get(selectedGenre.name) ?? []).slice(0, 3)
    : [];

  return (
    <div className={MOBILE_BLEED}>
      <GenresMobileHero
        locale={locale}
        heading={topGenre.name}
        listenLabel={tm("listenCount", { count: formatter.format(topGenre.count) })}
        shareLabel={tm("shareLabel", { share: formatShare(topShare, locale) })}
      />

      <section className="px-4" aria-label={tm("signalsLabel")}>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("signalsLabel")}
        </p>
        <div className={SNAP_RAIL}>
          <SignalTile label={t("statGenres")} value={formatter.format(chartData.length)} />
          <SignalTile label={t("totalListens")} value={formatter.format(totalListens)} />
          <SignalTile label={tm("topThreeSignal")} value={formatShare(topThreeShare, locale)} />
        </div>
      </section>

      <section className="space-y-3 px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {tm("listTitle")}
        </h2>
        <div>
          <label htmlFor="genres-ranking-search-mobile" className="sr-only">
            {t("rankingSearchAria")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              id="genres-ranking-search-mobile"
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
          {rankingRows.length === 0 ? (
            <p className="px-1 py-8 text-center text-sm text-muted">{t("rankingSearchEmpty")}</p>
          ) : (
            rankingRows.map((genre) => (
              <GenreRankRow key={genre.name} genre={genre} locale={locale} onOpen={setSelectedGenre} />
            ))
          )}
        </div>
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted">
            {t("paginationSummary", {
              start: detailStart,
              end: detailEnd,
              total: detailTotal,
            })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(detailPage - 1)}
              disabled={detailPage === 1}
              className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("paginationPrevious")}
            </button>
            <span className="shrink-0 px-2 text-xs font-semibold text-muted">
              {t("paginationPage", { page: detailPage, totalPages: detailTotalPages })}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(detailPage + 1)}
              disabled={detailPage >= detailTotalPages}
              className="min-h-11 flex-1 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("paginationNext")}
            </button>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-surface px-4 text-sm font-semibold text-foreground">
            <span>{t("pageSizeLabel")}</span>
            <select
              value={detailPageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-xl border border-card-border bg-card-surface px-3 py-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-2 px-4">
        <DestinationRow
          href={trendsHref}
          title={t("viewTrends")}
          lead={tm("trendsLead")}
          icon={<TrendIcon className="h-5 w-5" />}
        />
        {showPalette ? (
          <DestinationRow
            href={paletteHref}
            title={t("apiMappingNoticeLink")}
            lead={tm("paletteLead")}
            icon={<PaletteIcon className="h-5 w-5" />}
          />
        ) : null}
      </section>

      <GenreDetailSheet
        genre={selectedGenre}
        artists={selectedArtists}
        locale={locale}
        trendsHref={trendsHref}
        open={selectedGenre != null}
        onClose={() => setSelectedGenre(null)}
      />
    </div>
  );
}
