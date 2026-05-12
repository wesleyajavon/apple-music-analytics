"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DASHBOARD_ONBOARDING_REIMPORT_PATH } from "@/lib/utils/onboarding-route";

type TabId = "me" | "topTracks" | "topArtists" | "recentlyPlayed";

type EndpointResult =
  | { ok: true; path: string; status: number; data: unknown }
  | { ok: false; path: string; status: number; error: string };

type PlaygroundApiBody = {
  ok: true;
  fetchedAt: string;
  endpoints: Record<TabId, EndpointResult>;
  spotifyConnectionScope?: string | null;
  expectedSpotifyApiScopes?: string;
};

type SpotifyPlaygroundClientProps = {
  hasSpotifyConnection: boolean;
  spotifyDisplayName: string | null;
};

const TAB_ORDER: TabId[] = ["me", "topTracks", "topArtists", "recentlyPlayed"];

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
    [t]
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

  if (!hasSpotifyConnection) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card-surface p-6 shadow-card sm:p-8">
          <h2 className="text-lg font-medium text-foreground">
            {t("notConnected.title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("notConnected.description")}
          </p>
          <Link
            href={DASHBOARD_ONBOARDING_REIMPORT_PATH}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-accent-violet px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t("notConnected.cta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
          {spotifyDisplayName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("connectedAs", { name: spotifyDisplayName })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void fetchPlayground()}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-card-border bg-card-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isLoading ? t("loading") : t("reload")}
        </button>
      </div>

      {showApiTroubleshootHint ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50/95"
          role="note"
        >
          <p className="font-medium">{t("apiTroubleshootTitle")}</p>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-amber-950/90 dark:text-amber-50/90">
            {t("apiTroubleshootBody")}
          </p>
          {payload?.expectedSpotifyApiScopes ? (
            <div className="mt-3 rounded-lg border border-amber-300/40 bg-white/60 p-3 text-xs dark:border-amber-800/40 dark:bg-black/20">
              <p className="font-medium text-foreground">{t("scopeStoredLabel")}</p>
              <p className="mt-1 font-mono text-muted-foreground break-all">
                {payload.spotifyConnectionScope?.trim() || "—"}
              </p>
              <p className="mt-2 font-medium text-foreground">{t("scopeExpectedLabel")}</p>
              <p className="mt-1 font-mono text-muted-foreground break-all">
                {payload.expectedSpotifyApiScopes}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
        >
          {loadError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-card-border bg-card-surface shadow-card">
        <div
          className="flex flex-wrap gap-1 border-b border-card-border bg-muted/30 p-2"
          role="tablist"
          aria-label={t("tablistLabel")}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === tab.id
                  ? "bg-card-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6" role="tabpanel">
          {isLoading && !payload ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-64 rounded-lg bg-muted" />
            </div>
          ) : activeResult ? (
            <>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                  GET {activeResult.path}
                </code>
                <span
                  className={
                    activeResult.ok
                      ? "font-medium text-emerald-700 dark:text-emerald-400"
                      : "font-medium text-red-700 dark:text-red-400"
                  }
                >
                  {activeResult.ok
                    ? t("statusOk", { status: activeResult.status })
                    : t("statusError", { status: activeResult.status })}
                </span>
              </div>
              {activeResult.ok ? (
                <pre className="max-h-[min(70vh,32rem)] overflow-auto rounded-xl border border-card-border bg-background/80 p-4 text-xs leading-relaxed text-foreground">
                  {JSON.stringify(activeResult.data, null, 2)}
                </pre>
              ) : (
                <pre className="max-h-[min(40vh,16rem)] overflow-auto rounded-xl border border-red-200 bg-red-50/50 p-4 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-100">
                  {activeResult.error}
                </pre>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("emptyPanel")}</p>
          )}
          {payload?.fetchedAt ? (
            <p className="mt-4 text-xs text-muted-foreground">
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
    </div>
  );
}
