"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { Loader2, Music2, Sparkles } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { DashboardHeroTitle } from "@/lib/components/dashboard-hero-title";
import {
  isRecentAuthRequiredError,
  redirectToRecentSignIn,
} from "@/lib/auth/recent-auth-client";
import { toast } from "sonner";

const ONBOARDING_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-3xl border border-violet-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.2),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#2e1065_100%)] px-6 py-8 shadow-2xl shadow-violet-950/40 sm:px-8 sm:py-10";

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
        className={`flex h-11 w-11 shrink-0 items-center justify-center bg-muted ${roundClass}`}
        aria-hidden
      >
        <Music2 className="h-5 w-5 text-muted-foreground opacity-70" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={44}
      height={44}
      className={`h-11 w-11 shrink-0 object-cover ${roundClass}`}
      sizes="44px"
    />
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
  const topArtists = payload?.endpoints.topArtists?.ok
    ? asTopArtists(payload.endpoints.topArtists.data)
    : [];
  const recent = payload?.endpoints.recentlyPlayed?.ok
    ? asRecentlyPlayed(payload.endpoints.recentlyPlayed.data)
    : [];

  const endpointError = (tab: TabId) => {
    const r = payload?.endpoints[tab];
    if (!r || r.ok) return null;
    return r.error;
  };

  const primaryBtnClass =
    "group inline-flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:opacity-[0.98] hover:shadow-card-hover active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  const secondaryBtnClass =
    "inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted/50";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className={ONBOARDING_HERO_SHELL_CLASS}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(34,211,238,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30" />
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-400/18 blur-3xl" />
        <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-cyan-400/16 blur-3xl" />
        <div className="relative space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/90">{t("eyebrow")}</p>
          <DashboardHeroTitle icon={Sparkles} variant="hero">
            {t("title")}
          </DashboardHeroTitle>
          <p className="max-w-xl text-base leading-relaxed text-violet-100/92">{t("subtitle")}</p>
          {spotifyDisplayName ? (
            <p className="text-sm text-violet-100/85">{t("connectedAs", { name: spotifyDisplayName })}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("liveSnapshotTitle")}</h2>
        <button
          type="button"
          onClick={() => void fetchPlayground()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-card-border bg-card-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted/50 disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {isLoading ? t("loading") : t("reload")}
        </button>
      </div>

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
        >
          {loadError}
        </div>
      ) : null}

      {isLoading && !payload ? (
        <div className="space-y-4">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-40 animate-pulse rounded-2xl border border-card-border bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-card-border bg-card-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-accent-violet" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">{t("topTracks")}</h3>
            </div>
            {endpointError("topTracks") ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{endpointError("topTracks")}</p>
            ) : topTracks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("emptySection")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {topTracks.map((track, i) => {
                  const img = coverUrl(track.album?.images);
                  const artistLine = track.artists?.map((a) => a.name).filter(Boolean).join(", ");
                  const title = track.name ?? "—";
                  return (
                    <li key={`${track.name ?? "track"}-${i}`} className="flex gap-3">
                      <CoverThumb
                        src={img}
                        alt={t("coverAlt", { title })}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="truncate font-medium text-foreground">{title}</p>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{artistLine || "—"}</p>
                        {track.album?.name ? (
                          <p className="truncate text-xs text-muted-foreground">{track.album.name}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-card-border bg-card-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-500" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">{t("topArtists")}</h3>
            </div>
            {endpointError("topArtists") ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{endpointError("topArtists")}</p>
            ) : topArtists.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("emptySection")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {topArtists.map((artist, i) => (
                  <li key={`${artist.name ?? "artist"}-${i}`} className="flex items-center gap-3">
                    <CoverThumb
                      src={coverUrl(artist.images)}
                      alt={t("artistCoverAlt", { name: artist.name ?? "—" })}
                      roundClass="rounded-full"
                    />
                    <p className="truncate font-medium text-foreground">{artist.name ?? "—"}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-card-border bg-card-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-2">
              <Music2 className="h-4 w-4 text-accent-violet opacity-90" aria-hidden />
              <h3 className="text-sm font-semibold text-foreground">{t("recentlyPlayed")}</h3>
            </div>
            {endpointError("recentlyPlayed") ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{endpointError("recentlyPlayed")}</p>
            ) : recent.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("emptySection")}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {recent.map((row, i) => {
                  const tr = row.track;
                  const img = tr ? coverUrl(tr.album?.images) : null;
                  const played = row.played_at ? new Date(row.played_at) : null;
                  const artistLine = tr?.artists?.map((a) => a.name).filter(Boolean).join(", ");
                  const title = tr?.name ?? "";
                  return (
                    <li key={`${row.played_at ?? i}-${tr?.name ?? "x"}`} className="flex gap-3">
                      <CoverThumb
                        src={img}
                        alt={title ? t("coverAlt", { title }) : t("coverAltFallback")}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{tr?.name ?? t("recentUnknownTrack")}</p>
                        <p className="truncate text-sm text-muted-foreground">{artistLine || "—"}</p>
                        {played && !Number.isNaN(played.getTime()) ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format.dateTime(played, { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {payload?.fetchedAt ? (
            <p className="text-center text-xs text-muted-foreground">
              {t("fetchedAt", {
                time: format.dateTime(new Date(payload.fetchedAt), {
                  dateStyle: "medium",
                  timeStyle: "medium",
                }),
              })}
            </p>
          ) : null}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-card-border bg-card-surface p-5 shadow-card">
        <p className="text-sm leading-relaxed text-muted-foreground">{t("nextStepsHint")}</p>
        <button
          type="button"
          className={`${primaryBtnClass} w-full sm:w-auto`}
          onClick={() => void completeOnboarding()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              <span>{t("finishing")}</span>
            </>
          ) : (
            <span>{t("goToDashboard")}</span>
          )}
        </button>
        <Link href={DASHBOARD_ONBOARDING_REIMPORT_PATH} className={`${secondaryBtnClass} no-underline`}>
          {t("backToImport")}
        </Link>
      </div>
    </div>
  );
}
