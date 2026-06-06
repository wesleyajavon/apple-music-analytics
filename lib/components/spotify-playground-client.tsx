"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Code2, LayoutDashboard, Loader2, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
} from "@/lib/constants/dashboard-spotlight";
import {
  SpotifyPlaygroundMobileConnected,
  SpotifyPlaygroundMobileDisconnected,
  type SpotifyPlaygroundPayload,
} from "@/lib/components/spotify-playground-mobile";

type TabId = "me" | "topTracks" | "topArtists" | "recentlyPlayed";

type EndpointResult =
  | { ok: true; path: string; status: number; data: unknown }
  | { ok: false; path: string; status: number; error: string };

type PlaygroundApiBody = SpotifyPlaygroundPayload;

type SpotifyPlaygroundClientProps = {
  hasSpotifyConnection: boolean;
  spotifyDisplayName: string | null;
};

const TAB_ORDER: TabId[] = ["me", "topTracks", "topArtists", "recentlyPlayed"];

const PLAYGROUND_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

function TrustBullets({ trustKeys }: { trustKeys: readonly ["heroTrust1", "heroTrust2", "heroTrust3"] | readonly ["noConnectionTrust1", "noConnectionTrust2", "noConnectionTrust3"] }) {
  const t = useTranslations("spotifyPlayground");
  return (
    <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
      {trustKeys.map((key) => (
        <li key={key} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]" aria-hidden />
          <span>{t(key)}</span>
        </li>
      ))}
    </ul>
  );
}

function PlaygroundHeroGlassHeader({
  badgeKey,
  tagKey,
}: {
  badgeKey: "heroStatBadge" | "noConnectionStatBadge";
  tagKey: "heroStatTag" | "noConnectionStatTag";
}) {
  const t = useTranslations("spotifyPlayground");
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-4">
      <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t(badgeKey)}</p>
      <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t(tagKey)}</span>
    </div>
  );
}

function PlaygroundHeroConnected({
  spotifyDisplayName,
}: {
  spotifyDisplayName: string | null;
}) {
  const t = useTranslations("spotifyPlayground");
  return (
    <div className={PLAYGROUND_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
            {t("heroEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Code2 className="h-9 w-9 shrink-0 text-cyan-200/90 sm:h-11 sm:w-11" aria-hidden />
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
              href="/dashboard/spotify-snapshot"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              {t("ctaSnapshot")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <PlaygroundHeroGlassHeader badgeKey="heroStatBadge" tagKey="heroStatTag" />
              <TrustBullets trustKeys={["heroTrust1", "heroTrust2", "heroTrust3"]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaygroundHeroDisconnected() {
  const t = useTranslations("spotifyPlayground");
  return (
    <div className={PLAYGROUND_HERO_SHELL_CLASS}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
      <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
      <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.55)]" />
            {t("noConnectionEyebrow")}
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            <Code2 className="h-9 w-9 shrink-0 text-cyan-200/90 sm:h-11 sm:w-11" aria-hidden />
            <span className="max-w-4xl text-balance">{t("title")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t("notConnected.description")}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100"
            >
              {t("notConnected.cta")}
            </Link>
            <Link
              href="/dashboard/overview"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              {t("ctaOverview")}
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
              <PlaygroundHeroGlassHeader badgeKey="noConnectionStatBadge" tagKey="noConnectionStatTag" />
              <TrustBullets trustKeys={["noConnectionTrust1", "noConnectionTrust2", "noConnectionTrust3"]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpotifyPlaygroundClient({
  hasSpotifyConnection,
  spotifyDisplayName,
}: SpotifyPlaygroundClientProps) {
  const t = useTranslations("spotifyPlayground");
  const format = useFormatter();
  const [activeTab, setActiveTab] = useState<TabId>("me");
  const [payload, setPayload] = useState<PlaygroundApiBody | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (hasSpotifyConnection) {
      void fetchPlayground();
    }
  }, [hasSpotifyConnection, fetchPlayground]);

  const tabs = useMemo(
    () =>
      TAB_ORDER.map((id) => ({
        id,
        label: t(`tabs.${id}`),
      })),
    [t],
  );

  const activeResult = payload?.endpoints[activeTab];

  const anySpotifyGatewayOr5xx = useMemo(() => {
    if (!payload?.endpoints) return false;
    for (const id of TAB_ORDER) {
      const e = payload.endpoints[id];
      if (e && !e.ok && e.status >= 500) return true;
    }
    return false;
  }, [payload]);

  const scopeLooksIncomplete = useMemo(() => {
    const stored = payload?.spotifyConnectionScope?.trim();
    if (!stored) return false;
    const have = new Set(stored.split(/\s+/).filter(Boolean));
    return !have.has("user-top-read") || !have.has("user-read-recently-played");
  }, [payload]);

  const anyScopeRelatedFailure = useMemo(() => {
    if (!payload?.endpoints) return false;
    for (const id of TAB_ORDER) {
      const e = payload.endpoints[id];
      if (e && !e.ok) {
        if (e.status === 403) return true;
        if (/insufficient|scope/i.test(e.error)) return true;
      }
    }
    return false;
  }, [payload]);

  const showApiTroubleshootHint =
    Boolean(payload) && (scopeLooksIncomplete || anyScopeRelatedFailure || anySpotifyGatewayOr5xx);

  const outerClass = "mx-auto max-w-6xl space-y-8";

  if (!hasSpotifyConnection) {
    return (
      <>
        <SpotifyPlaygroundMobileDisconnected />
        <div className={`${outerClass} hidden lg:block`}>
          <PlaygroundHeroDisconnected />
          <section className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`} aria-labelledby="playground-disconnected-panel-title">
            <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
            <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
            <div className="relative p-6 sm:p-8">
              <h2 id="playground-disconnected-panel-title" className={DASHBOARD_SPOTLIGHT_TITLE}>
                {t("notConnected.title")}
              </h2>
              <p className={`mt-2 max-w-2xl ${DASHBOARD_SPOTLIGHT_MUTED}`}>{t("notConnected.panelHint")}</p>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <SpotifyPlaygroundMobileConnected
        spotifyDisplayName={spotifyDisplayName}
        payload={payload}
        loadError={loadError}
        isLoading={isLoading}
        showApiTroubleshootHint={showApiTroubleshootHint}
        onReload={fetchPlayground}
      />
      <div className={`${outerClass} hidden lg:block`}>
      <PlaygroundHeroConnected spotifyDisplayName={spotifyDisplayName} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={DASHBOARD_SPOTLIGHT_TITLE}>{t("panelToolbarTitle")}</h2>
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

      {showApiTroubleshootHint ? (
        <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} border-amber-200/90 bg-amber-50/90 dark:border-amber-400/25 dark:bg-amber-950/35`} role="note">
          <p className="font-medium text-amber-950 dark:text-amber-50">{t("apiTroubleshootTitle")}</p>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-amber-950/90 dark:text-amber-50/90">{t("apiTroubleshootBody")}</p>
          {payload?.expectedSpotifyApiScopes ? (
            <div className="mt-3 rounded-xl border border-amber-300/50 bg-white/70 p-3 text-xs dark:border-amber-800/40 dark:bg-black/25">
              <p className="font-medium text-slate-900 dark:text-white">{t("scopeStoredLabel")}</p>
              <p className="mt-1 break-all font-mono text-slate-600 dark:text-slate-400">{payload.spotifyConnectionScope?.trim() || "—"}</p>
              <p className="mt-2 font-medium text-slate-900 dark:text-white">{t("scopeExpectedLabel")}</p>
              <p className="mt-1 break-all font-mono text-slate-600 dark:text-slate-400">{payload.expectedSpotifyApiScopes}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {loadError ? (
        <div role="alert" className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} border-red-200/90 bg-red-50 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100`}>
          {loadError}
        </div>
      ) : null}

      <section className={`relative ${DASHBOARD_SPOTLIGHT_SHELL}`} aria-labelledby="playground-json-panel-title">
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
        <div className="relative">
          <div className={`${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM} px-3 py-3 sm:px-4`}>
            <p id="playground-json-panel-title" className="sr-only">
              {t("tablistLabel")}
            </p>
            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/90 bg-slate-50/90 p-1.5 dark:border-white/10 dark:bg-black/25" role="tablist" aria-label={t("tablistLabel")}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-white text-slate-950 shadow-sm dark:bg-white dark:text-slate-950"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6" role="tabpanel">
            {isLoading && !payload ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-48 rounded-lg bg-slate-200 dark:bg-white/10" />
                <div className="h-64 rounded-xl bg-slate-200 dark:bg-white/10" />
              </div>
            ) : activeResult ? (
              <>
                <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                  <code className="rounded-lg border border-slate-200/90 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-white">
                    GET {activeResult.path}
                  </code>
                  <span className={activeResult.ok ? "font-medium text-emerald-700 dark:text-emerald-400" : "font-medium text-red-700 dark:text-red-400"}>
                    {activeResult.ok ? t("statusOk", { status: activeResult.status }) : t("statusError", { status: activeResult.status })}
                  </span>
                </div>
                {activeResult.ok ? (
                  <pre className="max-h-[min(70vh,32rem)] overflow-auto rounded-xl border border-slate-200/90 bg-slate-50/90 p-4 font-mono text-xs leading-relaxed text-slate-900 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100">
                    {JSON.stringify(activeResult.data, null, 2)}
                  </pre>
                ) : (
                  <pre className="max-h-[min(40vh,16rem)] overflow-auto rounded-xl border border-red-200/90 bg-red-50/90 p-4 font-mono text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                    {activeResult.error}
                  </pre>
                )}
              </>
            ) : (
              <p className={DASHBOARD_SPOTLIGHT_MUTED}>{t("emptyPanel")}</p>
            )}
            {payload?.fetchedAt ? (
              <p className={`mt-4 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                {t("fetchedAt", {
                  time: format.dateTime(new Date(payload.fetchedAt), {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  }),
                })}
              </p>
            ) : null}
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
