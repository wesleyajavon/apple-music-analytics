"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import { MobileBottomSheet } from "@/lib/components/mobile-bottom-sheet";

export type SpotifyPlaygroundTabId = "me" | "topTracks" | "topArtists" | "recentlyPlayed";

type EndpointResult =
  | { ok: true; path: string; status: number; data: unknown }
  | { ok: false; path: string; status: number; error: string };

export type SpotifyPlaygroundPayload = {
  ok: true;
  fetchedAt: string;
  endpoints: Record<SpotifyPlaygroundTabId, EndpointResult>;
  spotifyConnectionScope?: string | null;
  expectedSpotifyApiScopes?: string;
};

const TAB_ORDER: SpotifyPlaygroundTabId[] = ["me", "topTracks", "topArtists", "recentlyPlayed"];

function ChevronIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getEndpointPreviewLines(tabId: SpotifyPlaygroundTabId, data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;

  if (tabId === "me") {
    const lines: string[] = [];
    if (typeof record.display_name === "string" && record.display_name.trim()) {
      lines.push(record.display_name);
    }
    if (typeof record.email === "string" && record.email.trim()) {
      lines.push(record.email);
    }
    if (typeof record.product === "string" && record.product.trim()) {
      lines.push(record.product);
    }
    if (typeof record.country === "string" && record.country.trim()) {
      lines.push(record.country);
    }
    return lines.slice(0, 4);
  }

  if (tabId === "topTracks" || tabId === "topArtists") {
    if (!Array.isArray(record.items)) return [];
    return record.items
      .slice(0, 3)
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const name = "name" in item && typeof item.name === "string" ? item.name : "";
        if (tabId === "topTracks" && "artists" in item && Array.isArray(item.artists)) {
          const firstArtist = item.artists[0];
          const artistName =
            firstArtist &&
            typeof firstArtist === "object" &&
            "name" in firstArtist &&
            typeof firstArtist.name === "string"
              ? firstArtist.name
              : "";
          return artistName ? `${name} — ${artistName}` : name;
        }
        return name;
      })
      .filter(Boolean);
  }

  if (tabId === "recentlyPlayed") {
    if (!Array.isArray(record.items)) return [];
    return record.items
      .slice(0, 3)
      .map((item) => {
        if (!item || typeof item !== "object" || !("track" in item)) return "";
        const track = item.track;
        if (!track || typeof track !== "object") return "";
        const name = "name" in track && typeof track.name === "string" ? track.name : "";
        const artists = "artists" in track && Array.isArray(track.artists) ? track.artists : [];
        const firstArtist = artists[0];
        const artistName =
          firstArtist &&
          typeof firstArtist === "object" &&
          "name" in firstArtist &&
          typeof firstArtist.name === "string"
            ? firstArtist.name
            : "";
        return artistName ? `${name} — ${artistName}` : name;
      })
      .filter(Boolean);
  }

  return [];
}

function countHealthyEndpoints(payload: SpotifyPlaygroundPayload | null): number {
  if (!payload?.endpoints) return 0;
  return TAB_ORDER.filter((id) => payload.endpoints[id]?.ok).length;
}

function SpotifyPlaygroundMobileSkeleton() {
  return (
    <section className="-mx-4 -mt-4 space-y-4 pb-8 lg:hidden" aria-busy="true">
      <div className="overflow-hidden bg-slate-950 px-4 pb-5 pt-4 text-white">
        <div className="mb-5 h-6 w-28 animate-pulse rounded-full bg-white/15" />
        <div className="mb-3 h-8 w-4/5 animate-pulse rounded-xl bg-white/15" />
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
      </div>
      <div className="-mx-0 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="h-24 min-w-[9.75rem] snap-start animate-pulse rounded-3xl bg-slate-200 dark:bg-white/10"
          />
        ))}
      </div>
      <div className="px-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/10" />
      </div>
    </section>
  );
}

export function SpotifyPlaygroundMobileDisconnected() {
  const t = useTranslations("spotifyPlayground");

  return (
    <section className="-mx-4 -mt-4 space-y-4 pb-8 lg:hidden" aria-labelledby="spotify-playground-mobile-disconnected-title">
      <div className="relative overflow-hidden bg-slate-950 px-4 pb-5 pt-4 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(251,191,36,0.18),transparent_32%)]" />
        <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-amber-100">
            {t("mobile.disconnectedEyebrow")}
          </span>
          <h1
            id="spotify-playground-mobile-disconnected-title"
            className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-balance"
          >
            {t("mobile.disconnectedStoryTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/70">{t("mobile.disconnectedStoryBody")}</p>
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25"
          >
            {t("notConnected.cta")}
          </Link>
        </div>
      </div>

      <details className="group mx-4 border-t border-slate-200/80 dark:border-white/10">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-left">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">{t("mobile.whyLinkTitle")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("mobile.whyLinkSummary")}</p>
          </div>
          <ChevronDown
            className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <ul className="space-y-3 border-t border-slate-200/80 py-3 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:text-slate-400">
          {(["noConnectionTrust1", "noConnectionTrust2", "noConnectionTrust3"] as const).map((key) => (
            <li key={key} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

type SpotifyPlaygroundMobileConnectedProps = {
  spotifyDisplayName: string | null;
  payload: SpotifyPlaygroundPayload | null;
  loadError: string | null;
  isLoading: boolean;
  showApiTroubleshootHint: boolean;
  onReload: () => void;
};

export function SpotifyPlaygroundMobileConnected({
  spotifyDisplayName,
  payload,
  loadError,
  isLoading,
  showApiTroubleshootHint,
  onReload,
}: SpotifyPlaygroundMobileConnectedProps) {
  const t = useTranslations("spotifyPlayground");
  const format = useFormatter();
  const [activeTab, setActiveTab] = useState<SpotifyPlaygroundTabId>("me");
  const [jsonSheetOpen, setJsonSheetOpen] = useState(false);

  const healthyCount = useMemo(() => countHealthyEndpoints(payload), [payload]);
  const totalEndpoints = TAB_ORDER.length;
  const activeResult = payload?.endpoints[activeTab];

  const storyTitle = useMemo(() => {
    if (isLoading && !payload) return t("mobile.loadingStoryTitle");
    if (loadError) return t("mobile.errorStoryTitle");
    if (!payload) return t("mobile.emptyStoryTitle");
    if (healthyCount === totalEndpoints) return t("mobile.allHealthyStoryTitle");
    if (healthyCount === 0) return t("mobile.noneHealthyStoryTitle");
    return t("mobile.partialHealthyStoryTitle", { ok: healthyCount, total: totalEndpoints });
  }, [healthyCount, isLoading, loadError, payload, t, totalEndpoints]);

  const storyBody = useMemo(() => {
    if (loadError) return loadError;
    if (spotifyDisplayName) return t("connectedAs", { name: spotifyDisplayName });
    if (payload?.fetchedAt) {
      return t("fetchedAt", {
        time: format.dateTime(new Date(payload.fetchedAt), {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      });
    }
    return t("mobile.storyBody");
  }, [format, loadError, payload?.fetchedAt, spotifyDisplayName, t]);

  const previewLines = useMemo(() => {
    if (!activeResult?.ok) return [];
    return getEndpointPreviewLines(activeTab, activeResult.data);
  }, [activeResult, activeTab]);

  const metricCards = useMemo(() => {
    const cards = [
      {
        label: t("mobile.metricHealthy"),
        value: payload ? `${healthyCount}/${totalEndpoints}` : "—",
        tone: healthyCount === totalEndpoints ? "ok" : healthyCount === 0 ? "error" : "warn",
      },
      {
        label: t("mobile.metricMode"),
        value: t("heroStatTag"),
      },
      {
        label: t("mobile.metricEndpoints"),
        value: String(totalEndpoints),
      },
      {
        label: t("mobile.metricActive"),
        value: t(`tabs.${activeTab}`),
      },
    ] as const;
    return cards;
  }, [activeTab, healthyCount, payload, t, totalEndpoints]);

  if (isLoading && !payload && !loadError) {
    return <SpotifyPlaygroundMobileSkeleton />;
  }

  return (
    <>
      <section className="-mx-4 -mt-4 space-y-4 pb-8 lg:hidden" aria-labelledby="spotify-playground-mobile-title">
        <div className="relative overflow-hidden bg-slate-950 px-4 pb-5 pt-4 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(34,211,238,0.2),transparent_32%)]" />
          <div className="absolute -bottom-20 right-4 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex min-h-8 items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-violet-100">
                {t("mobile.eyebrow")}
              </span>
              <button
                type="button"
                onClick={() => void onReload()}
                disabled={isLoading}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white disabled:opacity-60"
                aria-label={isLoading ? t("loading") : t("reload")}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
            <h1 id="spotify-playground-mobile-title" className="mt-5 text-3xl font-semibold tracking-[-0.06em] text-balance">
              {storyTitle}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/70">{storyBody}</p>
          </div>
        </div>

        <div className="px-4">
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {metricCards.map((metric) => (
              <article
                key={metric.label}
                className="min-w-[9.75rem] snap-start rounded-3xl border border-white/10 bg-slate-950 p-4 text-white shadow-lg shadow-black/10"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
                <p
                  className={`mt-2 text-xl font-semibold tracking-tight tabular-nums ${
                    "tone" in metric && metric.tone === "ok"
                      ? "text-emerald-300"
                      : "tone" in metric && metric.tone === "error"
                        ? "text-red-300"
                        : "tone" in metric && metric.tone === "warn"
                          ? "text-amber-300"
                          : "text-white"
                  }`}
                >
                  {metric.value}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4 px-4">
        {showApiTroubleshootHint ? (
          <details className="group border-t border-amber-200/70 dark:border-amber-800/40">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-left">
              <div>
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">{t("apiTroubleshootTitle")}</p>
                <p className="text-xs text-amber-900/80 dark:text-amber-100/80">{t("mobile.troubleshootSummary")}</p>
              </div>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-amber-700 transition-transform group-open:rotate-180 dark:text-amber-200"
                aria-hidden
              />
            </summary>
            <div className="space-y-3 border-t border-amber-200/70 py-3 text-sm leading-relaxed text-amber-950/90 dark:border-amber-800/40 dark:text-amber-50/90">
              <p className="whitespace-pre-line">{t("apiTroubleshootBody")}</p>
              {payload?.expectedSpotifyApiScopes ? (
                <div className="text-xs">
                  <p className="font-medium text-slate-900 dark:text-white">{t("scopeStoredLabel")}</p>
                  <p className="mt-1 break-all font-mono text-slate-600 dark:text-slate-400">
                    {payload.spotifyConnectionScope?.trim() || "—"}
                  </p>
                  <p className="mt-2 font-medium text-slate-900 dark:text-white">{t("scopeExpectedLabel")}</p>
                  <p className="mt-1 break-all font-mono text-slate-600 dark:text-slate-400">
                    {payload.expectedSpotifyApiScopes}
                  </p>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        {loadError ? (
          <div role="alert" className="py-3 text-sm text-red-900 dark:text-red-100">
            {loadError}
          </div>
        ) : null}

        <div>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              {t("mobile.endpointsEyebrow")}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("mobile.endpointsHint")}</p>
          </div>
          <div
            className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label={t("tablistLabel")}
          >
            {TAB_ORDER.map((tabId) => {
              const result = payload?.endpoints[tabId];
              const isActive = activeTab === tabId;
              const isHealthy = result?.ok;
              return (
                <button
                  key={tabId}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tabId)}
                  className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-2xl border px-3.5 text-sm font-semibold transition ${
                    isActive
                      ? "border-violet-300/60 bg-violet-50 text-violet-950 shadow-sm dark:border-violet-300/30 dark:bg-violet-950/50 dark:text-violet-50"
                      : "border-slate-200/90 bg-white text-slate-700 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
                  }`}
                >
                  {result ? (
                    isHealthy ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
                    )
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-white/20" aria-hidden />
                  )}
                  {t(`tabs.${tabId}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div role="tabpanel">
          {activeResult ? (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-slate-200/90 bg-slate-50 px-2 py-1 font-mono text-[0.65rem] text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-white">
                  GET {activeResult.path}
                </code>
                <span
                  className={
                    activeResult.ok
                      ? "text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                      : "text-xs font-semibold text-red-700 dark:text-red-400"
                  }
                >
                  {activeResult.ok
                    ? t("statusOk", { status: activeResult.status })
                    : t("statusError", { status: activeResult.status })}
                </span>
              </div>

              {activeResult.ok ? (
                previewLines.length > 0 ? (
                  <ul>
                    {previewLines.map((line, index) => (
                      <li
                        key={`${activeTab}-${index}`}
                        className="flex min-h-11 items-center gap-3 border-t border-slate-200/80 py-2 text-sm text-slate-800 first:border-t-0 dark:border-white/10 dark:text-slate-100"
                      >
                        <span className="w-5 shrink-0 font-mono text-xs text-violet-600 dark:text-violet-300">
                          {index + 1}.
                        </span>
                        <span className="min-w-0 truncate">{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("mobile.previewEmpty")}</p>
                )
              ) : (
                <p className="py-2.5 text-sm text-red-900 dark:text-red-100">{activeResult.error}</p>
              )}

              <button
                type="button"
                onClick={() => setJsonSheetOpen(true)}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
              >
                <Code2 className="h-4 w-4" aria-hidden />
                {t("mobile.viewRawJson")}
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("emptyPanel")}</p>
          )}
        </div>

        <Link
          href="/dashboard/spotify-snapshot"
          className="flex min-h-11 items-center gap-3 border-t border-slate-200/80 py-2 dark:border-white/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-slate-950 dark:text-white">
            {t("ctaSnapshot")}
          </span>
          <ChevronIcon className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>

        <details className="group border-t border-slate-200/80 dark:border-white/10">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-left">
            <div>
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{t("mobile.trustTitle")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("mobile.trustSummary")}</p>
            </div>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <ul className="space-y-3 border-t border-slate-200/80 py-3 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:text-slate-400">
            {(["heroTrust1", "heroTrust2", "heroTrust3"] as const).map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </details>
        </div>
      </section>

      <MobileBottomSheet
        open={jsonSheetOpen}
        onClose={() => setJsonSheetOpen(false)}
        ariaLabelledBy="spotify-playground-json-sheet-title"
        insetAboveBottomNav
      >
        <div className="px-4 pb-4 pt-1">
          <h2
            id="spotify-playground-json-sheet-title"
            className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
          >
            {t("mobile.jsonSheetTitle")}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {activeResult ? t("mobile.jsonSheetHint", { path: activeResult.path }) : t("mobile.jsonSheetEmpty")}
          </p>
          {activeResult ? (
            activeResult.ok ? (
              <pre className="mt-4 max-h-[min(55dvh,28rem)] overflow-auto rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 font-mono text-[0.65rem] leading-relaxed text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100">
                {JSON.stringify(activeResult.data, null, 2)}
              </pre>
            ) : (
              <pre className="mt-4 max-h-[min(40dvh,16rem)] overflow-auto rounded-xl border border-red-200/90 bg-red-50/90 p-3 font-mono text-[0.65rem] text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                {activeResult.error}
              </pre>
            )
          ) : null}
        </div>
      </MobileBottomSheet>
    </>
  );
}
