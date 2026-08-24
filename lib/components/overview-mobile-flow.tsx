"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OverviewMobileHero } from "@/lib/components/overview-hero";
import { SpotlightRankBubble, type LibraryLeaderItem } from "@/lib/components/overview-library-rankings";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import { usePublicDemoViewer } from "@/lib/hooks/use-public-demo-viewer";
import type { OverviewStatsChanges } from "@/lib/components/overview-stats-section";
import type { OverviewStatsWithTopArtists } from "@/lib/hooks/use-listening";
import {
  buildOverviewPrimaryInsight,
  formatListeningTime,
  type OverviewArtistLeader,
  type OverviewGenreLeader,
  type OverviewTrackLeader,
} from "@/lib/utils/overview-page";

type MobileOverviewStat = {
  label: string;
  value: string;
  change?: {
    displayValue: string;
    isPositive: boolean;
  } | null;
};

type MobileLeaderItem = LibraryLeaderItem & {
  href?: string;
};

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.75c0 5.385 4.365 9.75 9.75 9.75s9.75-4.365 9.75-9.75S17.385 2.25 12 2.25 2.25 6.615 2.25 12m13.5 0a1.125 1.125 0 0 1-1.125 1.125H9.75a1.125 1.125 0 0 1-1.125-1.125v-6.75m9 0V9.375"
      />
    </svg>
  );
}

function DuetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
      />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  );
}

function MobileChangePill({
  change,
  label,
}: {
  change?: MobileOverviewStat["change"];
  label: string;
}) {
  if (!change) return null;

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-[11px] font-semibold tabular-nums ${
        change.isPositive
          ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
          : "border border-rose-300/20 bg-rose-400/10 text-rose-100"
      }`}
    >
      {change.isPositive ? "+" : "-"}
      {change.displayValue}% {label}
    </span>
  );
}

function MobileMetricRail({
  stats,
  comparisonLabel,
}: {
  stats: MobileOverviewStat[];
  comparisonLabel: string;
}) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className="min-w-[9.75rem] snap-start rounded-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-lg shadow-black/10"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {stat.label}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em]">
            {stat.value}
          </p>
          <div className="mt-3 min-h-8">
            <MobileChangePill change={stat.change} label={comparisonLabel} />
          </div>
        </article>
      ))}
    </div>
  );
}

function MobileLeaderRow({
  item,
  index,
  locale,
  listensLabel,
  showPercentage = false,
}: {
  item: MobileLeaderItem;
  index: number;
  locale: string;
  listensLabel: string;
  showPercentage?: boolean;
}) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <SpotlightRankBubble rank={index + 1} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-950 dark:text-white" title={item.title}>
            {item.title}
          </p>
          {item.subtitle ? (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400" title={item.subtitle}>
              {item.subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-gray-950 dark:text-white">
          {item.count.toLocaleString(locale)}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {showPercentage ? `${item.percentage.toFixed(1)}% · ${listensLabel}` : listensLabel}
        </p>
      </div>
    </>
  );

  const className =
    "flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-2.5 shadow-sm";

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function DestinationRow({
  href,
  title,
  lead,
  icon,
  primary = false,
  disabled = false,
}: {
  href: string;
  title: string;
  lead: string;
  icon: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  const className = primary
    ? "flex min-h-14 items-center gap-3 rounded-2xl bg-white px-3.5 py-3 text-gray-950 shadow-lg shadow-black/20"
    : "flex min-h-14 items-center gap-3 rounded-2xl border border-card-border bg-card-surface px-3.5 py-3 text-gray-950 shadow-sm dark:text-white";

  const content = (
    <>
      <span
        className={
          primary
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet"
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold tracking-tight">{title}</span>
        <span
          className={`mt-0.5 block truncate text-xs leading-5 ${
            primary ? "text-gray-600" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {lead}
        </span>
      </span>
      <ChevronIcon className={`h-4 w-4 shrink-0 ${primary ? "text-gray-500" : "text-gray-400"}`} />
    </>
  );

  if (disabled) {
    return (
      <div className={`${className} cursor-default opacity-80`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={className} aria-label={title}>
      {content}
    </Link>
  );
}

export function MobileOverviewFlow({
  title,
  data,
  changes,
  topTracks,
  topArtists,
  topGenres,
  locale,
  tracksHref,
  artistsHref,
  genresHref,
  musicalProfileHref,
  musicAgentHref,
  duetHref,
  avatarUrl,
}: {
  title: string;
  data: OverviewStatsWithTopArtists;
  changes: OverviewStatsChanges;
  topTracks: OverviewTrackLeader[];
  topArtists: OverviewArtistLeader[];
  topGenres: OverviewGenreLeader[];
  locale: string;
  tracksHref: string;
  artistsHref: string;
  genresHref: string;
  musicalProfileHref: string;
  musicAgentHref: string;
  duetHref: string;
  avatarUrl?: string | null;
}) {
  const t = useTranslations("overview");
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const topTrack = topTracks[0];
  const topArtist = topArtists[0];
  const topGenre = topGenres[0];
  const primaryInsight = buildOverviewPrimaryInsight({
    pageTitle: title,
    locale,
    data,
    topTrack,
    topArtist,
    labels: {
      topTrackEyebrow: t("mobile.primaryInsight.topTrackEyebrow"),
      topTrackBody: t("mobile.primaryInsight.topTrackBody", {
        artist: topTrack?.artistName ?? "",
      }),
      topArtistEyebrow: t("mobile.primaryInsight.topArtistEyebrow"),
      topArtistBody: t("mobile.primaryInsight.topArtistBody"),
      libraryEyebrow: t("mobile.primaryInsight.libraryEyebrow"),
      libraryBody: t("mobile.primaryInsight.libraryBody"),
      listens: t("listens"),
      totalListens: t("stats.totalListens"),
    },
  });

  const stats: MobileOverviewStat[] = [
    {
      label: t("mobile.railStreams"),
      value: data.totalListens.toLocaleString(locale),
      change: changes?.totalListens,
    },
    {
      label: t("mobile.railArtists"),
      value: data.uniqueArtists.toLocaleString(locale),
      change: changes?.uniqueArtists,
    },
    {
      label: t("mobile.railTime"),
      value: formatListeningTime(data.totalPlayTime, t("notAvailable")),
      change: changes?.totalPlayTime,
    },
  ];

  const leaderSections = [
    {
      key: "tracks",
      title: t("topTracks"),
      href: tracksHref,
      showPercentage: false,
      items: topTracks.slice(0, 3).map((track) => ({
        id: track.trackId,
        title: track.name,
        subtitle: track.artistName,
        count: track.count,
        percentage: track.percentage,
      })),
    },
    {
      key: "artists",
      title: t("topArtists"),
      href: artistsHref,
      showPercentage: false,
      items: topArtists.slice(0, 3).map((artist) => ({
        id: artist.artistId,
        title: artist.name,
        count: artist.count,
        percentage: artist.percentage,
      })),
    },
    {
      key: "genres",
      title: t("topGenres"),
      href: genresHref,
      showPercentage: true,
      items: topGenres.slice(0, 3).map((genre) => ({
        id: genre.genre,
        title: genre.genre,
        count: genre.count,
        percentage: genre.percentage,
      })),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="-mx-4 -mt-4 space-y-4 pb-8">
      <OverviewMobileHero
        title={title}
        avatarUrl={avatarUrl}
        insight={primaryInsight}
        genreName={topGenre?.genre}
      />

      <section className="px-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.metricsTitle")}
        </p>
        <MobileMetricRail stats={stats} comparisonLabel={t("mobile.vsShort")} />
      </section>

      {leaderSections.map((section) => (
        <section key={section.key} className="px-4">
          <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
              {section.title}
            </h2>
            <Link
              href={section.href}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-foreground"
            >
              {t("seeAll")}
              <ChevronIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {section.items.map((item, index) => (
              <MobileLeaderRow
                key={item.id}
                item={item}
                index={index}
                locale={locale}
                listensLabel={t("listens")}
                showPercentage={section.showPercentage}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-2 px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
          {t("mobile.destinationsTitle")}
        </h2>
        <div className="space-y-2">
          <DestinationRow
            href={musicAgentHref}
            title={t("mobile.askAgentCta")}
            lead={t("mobile.askLead")}
            icon={<ChatIcon className="h-5 w-5" />}
            primary
          />
          <DestinationRow
            href={duetHref}
            title={t("mobile.duetTitle")}
            lead={t("mobile.duetLead")}
            icon={<DuetIcon className="h-5 w-5" />}
            disabled={isPublicDemoViewer}
          />
          <DestinationRow
            href={musicalProfileHref}
            title={t("mobile.profileTitle")}
            lead={t("mobile.profileLead")}
            icon={<ProfileIcon className="h-5 w-5" />}
          />
        </div>
      </section>
    </div>
  );
}
