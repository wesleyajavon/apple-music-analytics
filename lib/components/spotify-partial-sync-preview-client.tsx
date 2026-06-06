"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { Code2, LayoutDashboard, Loader2, Music2, RefreshCw, Sparkles } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_CYAN,
  DASHBOARD_SPOTLIGHT_GRADIENT_TABLE,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_TABLE_BODY_DIVIDE,
} from "@/lib/constants/dashboard-spotlight";
import { toast } from "sonner";

/** Même shell hero que `/dashboard/timeline` — vibe startup / Vercel */
const SPOTIFY_SNAPSHOT_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

type TabId = "me" | "topTracks" | "topArtists" | "recentlyPlayed";

type EndpointResult =
  | { ok: true; path: string; status: number; data: unknown }
  | { ok: false; path: string; status: number; error: string };

type PlaygroundApiBody = {
  ok: true;
  fetchedAt: string;
  endpoints: Record<TabId, EndpointResult>;
};

type SpotifyImage = { url?: string };

type SpotifyTrack = {
  name?: string;
  artists?: { name?: string }[];
  album?: { name?: string; images?: SpotifyImage[] };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asTopTracks(data: unknown): SpotifyTrack[] {
  if (!isRecord(data)) return [];
  const items = data.items;
  if (!Array.isArray(items)) return [];
  return items.filter((x): x is SpotifyTrack => isRecord(x));
}

function asTopArtists(data: unknown): { name?: string; images?: SpotifyImage[] }[] {
  if (!isRecord(data)) return [];
  const items = data.items;
  if (!Array.isArray(items)) return [];
  return items.filter((x) => isRecord(x)) as { name?: string; images?: SpotifyImage[] }[];
}

function asRecentlyPlayed(
  data: unknown,
): { played_at?: string; track?: SpotifyTrack | null }[] {
  if (!isRecord(data)) return [];
  const items = data.items;
  if (!Array.isArray(items)) return [];
  return items.filter((x) => isRecord(x)) as {
    played_at?: string;
    track?: SpotifyTrack | null;
  }[];
}

function coverUrl(trackOrArtistImages: SpotifyImage[] | undefined): string | null {
  const first = trackOrArtistImages?.[0]?.url;
  return typeof first === "string" && first.startsWith("http") ? first : null;
}

function SpotifySnapshotHeroTrustPanel() {
  const t = useTranslations("partialSyncPreview");
  return (
    <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust1")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust2")}</span>
      </li>
      <li className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
        <span>{t("heroTrust3")}</span>
      </li>
    </ul>
  );
}

function SpotifySnapshotHero({ spotifyDisplayName }: { spotifyDisplayName: string | null }) {
  const t = useTranslations("partialSyncPreview");
  return (
    <div className={SPOTIFY_SNAPSHOT_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("eyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Sparkles className="h-9 w-9 shrink-0 text-violet-200/90 sm:h-11 sm:w-11" aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("subtitle")}</p>
          {spotifyDisplayName ? (
            <p className="mt-4 text-sm font-medium text-white/80">{t("connectedAs", { name: spotifyDisplayName })}</p>
          ) : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/dashboard/overview"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {t("ctaOverview")}
            </Link>
            <Link
              href="/dashboard/spotify-playground"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              <Code2 className="h-4 w-4" aria-hidden />
              {t("ctaPlayground")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                <span className="rounded-full border border-green-400/30 bg-green-400/10 px-2.5 py-1 text-[0.66rem] font-semibold text-green-100">{t("heroStatTag")}</span>
              </div>
              <SpotifySnapshotHeroTrustPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotSection({
  gradientClass,
  hairlineClass,
  icon,
  title,
  children,
}: {
  gradientClass: string;
  hairlineClass: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={`relative ${DASHBOARD_SPOTLIGHT_SHELL} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 dark:hover:shadow-black/35`}>
      <div className={gradientClass} aria-hidden />
      <div className={hairlineClass} aria-hidden />
      <div className="relative">
        <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} flex items-center gap-2 px-5 py-4 sm:px-6`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-violet-600 dark:border-white/10 dark:bg-white/10 dark:text-violet-200">{icon}</span>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </section>
  );
}

function PanelSkeleton() {
  return (
    <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} space-y-3`} aria-busy="true">
      {[1, 2, 3].map((k) => (
        <div key={k} className="flex gap-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/5 max-w-[240px] animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-2/5 max-w-[180px] animate-pulse rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CoverThumb({
  src,
  alt,
  roundClass = "rounded-lg",
}: {
  src: string | null;
  alt: string;
  roundClass?: string;
}) {
  if (!src) {
    return (
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center border border-slate-200/90 bg-slate-100 dark:border-white/10 dark:bg-white/5 ${roundClass}`}
        aria-hidden
      >
        <Music2 className="h-5 w-5 text-slate-400 opacity-80 dark:text-slate-500" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={44}
      height={44}
      className={`h-11 w-11 shrink-0 border border-slate-200/80 object-cover dark:border-white/10 ${roundClass}`}
      sizes="44px"
    />
  );
}

const SNAPSHOT_DATA_TABS: TabId[] = ["topTracks", "topArtists", "recentlyPlayed"];

function countHealthySnapshotEndpoints(
  endpoints: PlaygroundApiBody["endpoints"] | undefined,
): { ok: number; total: number } {
  if (!endpoints) return { ok: 0, total: SNAPSHOT_DATA_TABS.length };
  const ok = SNAPSHOT_DATA_TABS.filter((tab) => endpoints[tab]?.ok).length;
  return { ok, total: SNAPSHOT_DATA_TABS.length };
}

function SpotifySnapshotMobileDisclosure({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const t = useTranslations("partialSyncPreview");
  return (
    <details
      className="group rounded-[1.75rem] border border-card-border bg-white/80 shadow-card backdrop-blur dark:border-white/[0.08] dark:bg-[#090b14]"
      open={defaultOpen}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-sm font-semibold text-foreground dark:text-white">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-muted dark:text-slate-400">{description}</span>
        </span>
        <span className="rounded-full border border-card-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition group-open:bg-primary group-open:text-primary-foreground dark:border-white/[0.10] dark:bg-white/[0.06]">
          {t("mobile.open")}
        </span>
      </summary>
      <div className="border-t border-card-border px-4 py-4 dark:border-white/[0.08]">{children}</div>
    </details>
  );
}

function SpotifySnapshotMobileLoading() {
  const t = useTranslations("partialSyncPreview");
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,0.18),transparent_34%)]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="h-8 w-24 animate-pulse rounded-full bg-white/15" />
            <div className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="mt-6 h-9 w-3/4 animate-pulse rounded bg-white/15" />
          <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
          <div className="mt-5 flex gap-4 rounded-3xl border border-white/10 bg-white/[0.07] p-4">
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-white/15" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-4/5 animate-pulse rounded bg-white/15" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        </div>
      </section>
      <div>
        <div className="h-3 w-28 animate-pulse rounded bg-muted/40" />
        <div className="-mx-4 mt-3 flex gap-3 overflow-hidden px-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 min-w-[8.5rem] animate-pulse rounded-3xl border border-white/10 bg-slate-950/80"
            />
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-muted">{t("loading")}</p>
    </div>
  );
}

function SpotifySnapshotMobileTrackCard({
  track,
  rank,
}: {
  track: SpotifyTrack;
  rank: number;
}) {
  const t = useTranslations("partialSyncPreview");
  const img = coverUrl(track.album?.images);
  const artistLine = track.artists?.map((a) => a.name).filter(Boolean).join(", ");
  const title = track.name ?? "—";

  return (
    <article className="min-w-[8.5rem] max-w-[8.5rem] snap-start rounded-3xl border border-white/10 bg-slate-950 p-3 text-white shadow-lg shadow-black/10">
      <div className="relative">
        {img ? (
          <Image
            src={img}
            alt={t("coverAlt", { title })}
            width={120}
            height={120}
            className="aspect-square w-full rounded-2xl border border-white/10 object-cover"
            sizes="120px"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
            <Music2 className="h-8 w-8 text-slate-400" aria-hidden />
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex min-h-7 min-w-7 items-center justify-center rounded-full border border-white/15 bg-black/55 px-2 text-[11px] font-bold text-white backdrop-blur">
          {t("mobile.rankLabel", { rank })}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5" title={title}>
        {title}
      </p>
      <p className="mt-1 truncate text-xs text-slate-400" title={artistLine || undefined}>
        {artistLine || "—"}
      </p>
    </article>
  );
}

function SpotifySnapshotMobileArtistChip({
  artist,
  rank,
}: {
  artist: { name?: string; images?: SpotifyImage[] };
  rank: number;
}) {
  const t = useTranslations("partialSyncPreview");
  const img = coverUrl(artist.images);
  const name = artist.name ?? "—";

  return (
    <article className="min-w-[7.5rem] snap-start rounded-3xl border border-white/10 bg-slate-950 p-3 text-white shadow-lg shadow-black/10">
      <div className="flex flex-col items-center text-center">
        {img ? (
          <Image
            src={img}
            alt={t("artistCoverAlt", { name })}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border border-white/10 object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
            <Music2 className="h-6 w-6 text-slate-400" aria-hidden />
          </div>
        )}
        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5" title={name}>
          {name}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {t("mobile.rankLabel", { rank })}
        </p>
      </div>
    </article>
  );
}

function SpotifySnapshotMobileCompactRow({
  title,
  subtitle,
  meta,
  imageSrc,
  imageAlt,
  roundClass = "rounded-xl",
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  imageSrc: string | null;
  imageAlt: string;
  roundClass?: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5">
      <CoverThumb src={imageSrc} alt={imageAlt} roundClass={roundClass} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white" title={title}>
          {title}
        </p>
        {subtitle ? (
          <p className="truncate text-xs text-slate-400" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
        {meta ? <p className="mt-0.5 text-[11px] text-slate-500">{meta}</p> : null}
      </div>
    </div>
  );
}

function SpotifySnapshotMobileFlow({
  spotifyDisplayName,
  topTracks,
  topArtists,
  recent,
  payload,
  loadError,
  isLoading,
  isSubmitting,
  endpointError,
  onRefresh,
  onCompleteOnboarding,
}: {
  spotifyDisplayName: string | null;
  topTracks: SpotifyTrack[];
  topArtists: { name?: string; images?: SpotifyImage[] }[];
  recent: { played_at?: string; track?: SpotifyTrack | null }[];
  payload: PlaygroundApiBody | null;
  loadError: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  endpointError: (tab: TabId) => string | null;
  onRefresh: () => void;
  onCompleteOnboarding: () => void;
}) {
  const t = useTranslations("partialSyncPreview");
  const format = useFormatter();
  const tm = useTranslations("partialSyncPreview.mobile");

  const primaryBtnClass =
    "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition-all disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950";

  const topTrack = topTracks[0];
  const topArtist = topArtists[0];
  const latestRecent = recent[0];
  const latestRecentTrack = latestRecent?.track;
  const endpointHealth = countHealthySnapshotEndpoints(payload?.endpoints);

  const endpointStatusLabel =
    endpointHealth.ok === endpointHealth.total
      ? tm("endpointsHealthy")
      : endpointHealth.ok > 0
        ? tm("endpointsPartial")
        : tm("endpointsFailed");

  const fetchedShort = payload?.fetchedAt
    ? format.dateTime(new Date(payload.fetchedAt), { timeStyle: "short" })
    : "—";

  const primaryInsight = topTrack
    ? {
        eyebrow: tm("primaryInsight.topTrackEyebrow"),
        title: topTrack.name ?? "—",
        body: tm("primaryInsight.topTrackBody"),
        subtitle: topTrack.artists?.map((a) => a.name).filter(Boolean).join(", ") || "—",
        cover: coverUrl(topTrack.album?.images),
        coverTitle: topTrack.name ?? "—",
      }
    : latestRecentTrack
      ? {
          eyebrow: tm("primaryInsight.recentEyebrow"),
          title: latestRecentTrack.name ?? t("recentUnknownTrack"),
          body: tm("primaryInsight.recentBody"),
          subtitle: latestRecentTrack.artists?.map((a) => a.name).filter(Boolean).join(", ") || "—",
          cover: coverUrl(latestRecentTrack.album?.images),
          coverTitle: latestRecentTrack.name ?? t("recentUnknownTrack"),
        }
      : {
          eyebrow: tm("primaryInsight.emptyEyebrow"),
          title: spotifyDisplayName ?? t("title"),
          body: tm("primaryInsight.emptyBody"),
          subtitle: spotifyDisplayName ? t("connectedAs", { name: spotifyDisplayName }) : t("subtitle"),
          cover: null as string | null,
          coverTitle: t("title"),
        };

  const signals = [
    {
      key: "artist",
      label: tm("signals.topArtist"),
      value: topArtist?.name ?? "—",
    },
    {
      key: "recent",
      label: tm("signals.recentCount"),
      value: recent.length > 0 ? String(recent.length) : "—",
    },
    {
      key: "endpoints",
      label: tm("signals.endpointsOk"),
      value: `${endpointHealth.ok}/${endpointHealth.total} · ${endpointStatusLabel}`,
    },
    {
      key: "fetched",
      label: tm("signals.fetched"),
      value: fetchedShort,
    },
  ];

  if (isLoading && !payload) {
    return <SpotifySnapshotMobileLoading />;
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,0.20),transparent_34%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.86)_48%,rgba(8,47,73,0.72))]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-100">
              {tm("heroEyebrow")}
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-2.5 text-[11px] font-semibold text-white/85">
                {tm("readOnlyBadge")}
              </span>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-60"
                aria-label={tm("refresh")}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{primaryInsight.eyebrow}</p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.06em]">{primaryInsight.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">{primaryInsight.body}</p>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.07] p-4">
            {primaryInsight.cover ? (
              <Image
                src={primaryInsight.cover}
                alt={t("coverAlt", { title: primaryInsight.coverTitle })}
                width={72}
                height={72}
                className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl border border-white/10 object-cover"
                sizes="72px"
              />
            ) : (
              <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Music2 className="h-7 w-7 text-slate-400" aria-hidden />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white" title={primaryInsight.subtitle}>
                {primaryInsight.subtitle}
              </p>
              {spotifyDisplayName ? (
                <p className="mt-1 truncate text-xs text-slate-400">{t("connectedAs", { name: spotifyDisplayName })}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/overview"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {tm("goToOverview")}
            </Link>
            <Link
              href="/dashboard/spotify-playground"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white"
            >
              <Code2 className="h-4 w-4" aria-hidden />
              {tm("playgroundCta")}
            </Link>
          </div>
        </div>
      </section>

      {loadError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100"
        >
          {loadError}
        </div>
      ) : null}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted dark:text-slate-400">
          {tm("signalsLabel")}
        </p>
        <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {signals.map((signal) => (
            <article
              key={signal.key}
              className="min-w-[9.25rem] snap-start rounded-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-lg shadow-black/10"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{signal.label}</p>
              <p className="mt-2 line-clamp-2 text-lg font-semibold tracking-[-0.03em]" title={signal.value}>
                {signal.value}
              </p>
            </article>
          ))}
        </div>
      </div>

      {topTracks.length > 0 ? (
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-foreground dark:text-white">{tm("tracksRailTitle")}</h2>
            <p className="mt-1 text-xs leading-5 text-muted dark:text-slate-400">{tm("tracksRailHint")}</p>
          </div>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {topTracks.slice(0, 5).map((track, i) => (
              <SpotifySnapshotMobileTrackCard key={`${track.name ?? "track"}-${i}`} track={track} rank={i + 1} />
            ))}
          </div>
        </div>
      ) : null}

      {topArtists.length > 0 ? (
        <div>
          <h2 className="text-base font-semibold text-foreground dark:text-white">{tm("artistsRailTitle")}</h2>
          <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {topArtists.slice(0, 5).map((artist, i) => (
              <SpotifySnapshotMobileArtistChip key={`${artist.name ?? "artist"}-${i}`} artist={artist} rank={i + 1} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {topTracks.length > 0 ? (
          <SpotifySnapshotMobileDisclosure
            title={tm("topTracksDisclosureTitle")}
            description={tm("topTracksDisclosureDescription")}
          >
            <div className="rounded-3xl bg-slate-950 p-3">
              {endpointError("topTracks") ? (
                <p className="text-sm text-red-400">{endpointError("topTracks")}</p>
              ) : (
                <div className="space-y-2">
                  {topTracks.map((track, i) => {
                    const img = coverUrl(track.album?.images);
                    const artistLine = track.artists?.map((a) => a.name).filter(Boolean).join(", ");
                    const title = track.name ?? "—";
                    return (
                      <SpotifySnapshotMobileCompactRow
                        key={`${track.name ?? "track"}-${i}`}
                        title={title}
                        subtitle={artistLine || "—"}
                        meta={track.album?.name}
                        imageSrc={img}
                        imageAlt={t("coverAlt", { title })}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </SpotifySnapshotMobileDisclosure>
        ) : null}

        {topArtists.length > 0 ? (
          <SpotifySnapshotMobileDisclosure
            title={tm("topArtistsDisclosureTitle")}
            description={tm("topArtistsDisclosureDescription")}
          >
            <div className="rounded-3xl bg-slate-950 p-3">
              {endpointError("topArtists") ? (
                <p className="text-sm text-red-400">{endpointError("topArtists")}</p>
              ) : (
                <div className="space-y-2">
                  {topArtists.map((artist, i) => (
                    <SpotifySnapshotMobileCompactRow
                      key={`${artist.name ?? "artist"}-${i}`}
                      title={artist.name ?? "—"}
                      imageSrc={coverUrl(artist.images)}
                      imageAlt={t("artistCoverAlt", { name: artist.name ?? "—" })}
                      roundClass="rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>
          </SpotifySnapshotMobileDisclosure>
        ) : null}

        <SpotifySnapshotMobileDisclosure
          title={tm("recentTitle")}
          description={tm("recentDescription")}
          defaultOpen={recent.length > 0 && topTracks.length === 0}
        >
          {endpointError("recentlyPlayed") ? (
            <p className="text-sm text-red-600 dark:text-red-400">{endpointError("recentlyPlayed")}</p>
          ) : recent.length === 0 ? (
            <p className={DASHBOARD_SPOTLIGHT_MUTED}>{t("emptySection")}</p>
          ) : (
            <div className="rounded-3xl bg-slate-950 p-3">
              <div className="space-y-2">
                {recent.map((row, i) => {
                  const tr = row.track;
                  const img = tr ? coverUrl(tr.album?.images) : null;
                  const played = row.played_at ? new Date(row.played_at) : null;
                  const artistLine = tr?.artists?.map((a) => a.name).filter(Boolean).join(", ");
                  const title = tr?.name ?? t("recentUnknownTrack");
                  const meta =
                    played && !Number.isNaN(played.getTime())
                      ? format.dateTime(played, { dateStyle: "medium", timeStyle: "short" })
                      : undefined;
                  return (
                    <SpotifySnapshotMobileCompactRow
                      key={`${row.played_at ?? i}-${tr?.name ?? "x"}`}
                      title={title}
                      subtitle={artistLine || "—"}
                      meta={meta}
                      imageSrc={img}
                      imageAlt={tr?.name ? t("coverAlt", { title: tr.name }) : t("coverAltFallback")}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </SpotifySnapshotMobileDisclosure>

        <SpotifySnapshotMobileDisclosure
          title={tm("trustDisclosureTitle")}
          description={tm("trustDisclosureDescription")}
        >
          <ul className="space-y-3 text-sm leading-6 text-muted dark:text-slate-300">
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>{t("heroTrust1")}</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>{t("heroTrust2")}</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              <span>{t("heroTrust3")}</span>
            </li>
          </ul>
        </SpotifySnapshotMobileDisclosure>
      </div>

      <section className="rounded-[1.75rem] border border-card-border bg-white/80 p-4 shadow-card backdrop-blur dark:border-white/[0.08] dark:bg-[#090b14]">
        <h2 className="text-sm font-semibold text-foreground dark:text-white">{tm("nextStepsTitle")}</h2>
        <p className="mt-1 text-xs leading-5 text-muted dark:text-slate-400">{tm("nextStepsDescription")}</p>
        <p className={`mt-3 text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("nextStepsHint")}</p>
        {payload?.fetchedAt ? (
          <p className={`mt-3 text-center text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
            {t("fetchedAt", {
              time: format.dateTime(new Date(payload.fetchedAt), {
                dateStyle: "medium",
                timeStyle: "medium",
              }),
            })}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-3">
          <button type="button" className={primaryBtnClass} onClick={onCompleteOnboarding} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                <span>{t("finishing")}</span>
              </>
            ) : (
              <span>{t("goToDashboard")}</span>
            )}
          </button>
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} inline-flex min-h-11 items-center justify-center no-underline`}
          >
            {t("backToImport")}
          </Link>
        </div>
      </section>
    </div>
  );
}

export function SpotifyPartialSyncPreviewClient({
  spotifyDisplayName,
}: {
  spotifyDisplayName: string | null;
}) {
  const t = useTranslations("partialSyncPreview");
  const format = useFormatter();
  const router = useRouter();

  const [payload, setPayload] = useState<PlaygroundApiBody | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlayground = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/spotify/playground", { cache: "no-store" });
      const raw: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error: unknown }).error === "string"
            ? (raw as { error: string }).error
            : `HTTP ${res.status}`;
        setLoadError(msg);
        setPayload(null);
        return;
      }
      if (
        typeof raw !== "object" ||
        raw === null ||
        !("ok" in raw) ||
        (raw as { ok: unknown }).ok !== true ||
        !("endpoints" in raw)
      ) {
        setLoadError(t("invalidResponse"));
        setPayload(null);
        return;
      }
      setPayload(raw as PlaygroundApiBody);
    } catch {
      setLoadError(t("networkError"));
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchPlayground();
  }, [fetchPlayground]);

  const completeOnboarding = useCallback(
    async (nextPath = "/dashboard/overview") => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/user/onboarding/complete", { method: "POST" });
        const raw: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (isRecentAuthRequiredError(raw) || res.status === 401) {
            toast.error(t("recentAuthRequired"));
            redirectToRecentSignIn(
              `/dashboard/spotify-snapshot${typeof window !== "undefined" ? window.location.search : ""}`,
            );
            return;
          }
          throw new Error("complete_failed");
        }
        router.refresh();
        router.replace(nextPath);
      } catch {
        toast.error(t("completeError"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [router, t],
  );

  const topTracks = payload?.endpoints.topTracks?.ok ? asTopTracks(payload.endpoints.topTracks.data) : [];
  const topArtists = payload?.endpoints.topArtists?.ok ? asTopArtists(payload.endpoints.topArtists.data) : [];
  const recent = payload?.endpoints.recentlyPlayed?.ok ? asRecentlyPlayed(payload.endpoints.recentlyPlayed.data) : [];

  const endpointError = (tab: TabId) => {
    const r = payload?.endpoints[tab];
    if (!r || r.ok) return null;
    return r.error;
  };

  const primaryBtnClass =
    "inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:bg-white dark:text-slate-950 dark:shadow-black/25 dark:hover:bg-slate-100 sm:w-auto";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="lg:hidden">
        <SpotifySnapshotMobileFlow
          spotifyDisplayName={spotifyDisplayName}
          topTracks={topTracks}
          topArtists={topArtists}
          recent={recent}
          payload={payload}
          loadError={loadError}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          endpointError={endpointError}
          onRefresh={() => void fetchPlayground()}
          onCompleteOnboarding={() => void completeOnboarding()}
        />
      </div>

      <div className="hidden space-y-8 lg:block">
      <SpotifySnapshotHero spotifyDisplayName={spotifyDisplayName} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={DASHBOARD_SPOTLIGHT_TITLE}>{t("liveSnapshotTitle")}</h2>
        <button
          type="button"
          onClick={() => void fetchPlayground()}
          disabled={isLoading}
          className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} inline-flex items-center gap-2`}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isLoading ? t("loading") : t("reload")}
        </button>
      </div>

      {loadError ? (
        <div
          role="alert"
          className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} border-red-200/90 bg-red-50 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100`}
        >
          {loadError}
        </div>
      ) : null}

      <div className="space-y-6">
        <SnapshotSection
          gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY}
          hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET}
          icon={<Music2 className="h-4 w-4" aria-hidden />}
          title={t("topTracks")}
        >
          {isLoading && !payload ? (
            <PanelSkeleton />
          ) : endpointError("topTracks") ? (
            <p className="text-sm text-red-600 dark:text-red-400">{endpointError("topTracks")}</p>
          ) : topTracks.length === 0 ? (
            <p className={DASHBOARD_SPOTLIGHT_MUTED}>{t("emptySection")}</p>
          ) : (
            <ul className={`space-y-0 ${DASHBOARD_SPOTLIGHT_TABLE_BODY_DIVIDE}`}>
              {topTracks.map((track, i) => {
                const img = coverUrl(track.album?.images);
                const artistLine = track.artists?.map((a) => a.name).filter(Boolean).join(", ");
                const title = track.name ?? "—";
                return (
                  <li key={`${track.name ?? "track"}-${i}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <CoverThumb src={img} alt={t("coverAlt", { title })} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{title}</p>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-400">{artistLine || "—"}</p>
                      {track.album?.name ? (
                        <p className="truncate text-xs text-slate-500 dark:text-slate-500">{track.album.name}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SnapshotSection>

        <SnapshotSection
          gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_CYAN}
          hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_CYAN}
          icon={<Sparkles className="h-4 w-4" aria-hidden />}
          title={t("topArtists")}
        >
          {isLoading && !payload ? (
            <PanelSkeleton />
          ) : endpointError("topArtists") ? (
            <p className="text-sm text-red-600 dark:text-red-400">{endpointError("topArtists")}</p>
          ) : topArtists.length === 0 ? (
            <p className={DASHBOARD_SPOTLIGHT_MUTED}>{t("emptySection")}</p>
          ) : (
            <ul className={`space-y-0 ${DASHBOARD_SPOTLIGHT_TABLE_BODY_DIVIDE}`}>
              {topArtists.map((artist, i) => (
                <li key={`${artist.name ?? "artist"}-${i}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <CoverThumb src={coverUrl(artist.images)} alt={t("artistCoverAlt", { name: artist.name ?? "—" })} roundClass="rounded-full" />
                  <p className="truncate font-medium text-slate-900 dark:text-white">{artist.name ?? "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </SnapshotSection>

        <SnapshotSection
          gradientClass={DASHBOARD_SPOTLIGHT_GRADIENT_TABLE}
          hairlineClass={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET}
          icon={<Music2 className="h-4 w-4 opacity-90" aria-hidden />}
          title={t("recentlyPlayed")}
        >
          {isLoading && !payload ? (
            <PanelSkeleton />
          ) : endpointError("recentlyPlayed") ? (
            <p className="text-sm text-red-600 dark:text-red-400">{endpointError("recentlyPlayed")}</p>
          ) : recent.length === 0 ? (
            <p className={DASHBOARD_SPOTLIGHT_MUTED}>{t("emptySection")}</p>
          ) : (
            <ul className={`space-y-0 ${DASHBOARD_SPOTLIGHT_TABLE_BODY_DIVIDE}`}>
              {recent.map((row, i) => {
                const tr = row.track;
                const img = tr ? coverUrl(tr.album?.images) : null;
                const played = row.played_at ? new Date(row.played_at) : null;
                const artistLine = tr?.artists?.map((a) => a.name).filter(Boolean).join(", ");
                const title = tr?.name ?? "";
                return (
                  <li key={`${row.played_at ?? i}-${tr?.name ?? "x"}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    <CoverThumb src={img} alt={title ? t("coverAlt", { title }) : t("coverAltFallback")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{tr?.name ?? t("recentUnknownTrack")}</p>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-400">{artistLine || "—"}</p>
                      {played && !Number.isNaN(played.getTime()) ? (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                          {format.dateTime(played, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SnapshotSection>

        {payload?.fetchedAt ? (
          <p className={`text-center text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
            {t("fetchedAt", {
              time: format.dateTime(new Date(payload.fetchedAt), {
                dateStyle: "medium",
                timeStyle: "medium",
              }),
            })}
          </p>
        ) : null}
      </div>

      <section className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_TABLE} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
        <div className="relative space-y-4 p-6 sm:p-8">
          <p className={`${DASHBOARD_SPOTLIGHT_MUTED} max-w-3xl leading-relaxed`}>{t("nextStepsHint")}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" className={primaryBtnClass} onClick={() => void completeOnboarding()} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  <span>{t("finishing")}</span>
                </>
              ) : (
                <span>{t("goToDashboard")}</span>
              )}
            </button>
            <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={`${DASHBOARD_SPOTLIGHT_BTN_SECONDARY} no-underline sm:inline-flex sm:min-h-[48px] sm:items-center`}>
              {t("backToImport")}
            </Link>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
