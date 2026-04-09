"use client";

import { useEffect, useMemo, useState } from "react";

type HealthResponse = {
  status: "ok" | "warn" | "critical";
  warnThreshold: number;
  criticalThreshold: number;
  maxBlockedInCurrentMinute: number;
  totalBlockedInCurrentMinute: number;
  routesMonitored: number;
  hottestRoute: { route: string; blockedInCurrentMinute: number } | null;
  generatedAt: string;
};

type OverviewRouteStat = {
  route: string;
  blockedInCurrentMinute: number;
  overSpikeThreshold: boolean;
};

type OverviewResponse = {
  routeStats: OverviewRouteStat[];
};

function statusTone(status: HealthResponse["status"]): string {
  if (status === "critical") return "text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/40";
  if (status === "warn") return "text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/40";
  return "text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/40";
}

export function RateLimitHealthWidget() {
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [topRoutes, setTopRoutes] = useState<OverviewRouteStat[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("rate-limit-admin-key");
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    localStorage.setItem("rate-limit-admin-key", adminKey);
  }, [adminKey]);

  const canFetch = useMemo(() => adminKey.trim().length > 0, [adminKey]);

  useEffect(() => {
    if (!canFetch) return;

    let mounted = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const headers = { "x-admin-key": adminKey.trim() };
        const [healthRes, overviewRes] = await Promise.all([
          fetch("/api/admin/rate-limit/health", { headers, cache: "no-store" }),
          fetch("/api/admin/rate-limit/overview?perRouteTopLimit=1", {
            headers,
            cache: "no-store",
          }),
        ]);

        if (!healthRes.ok) {
          throw new Error(`Health API ${healthRes.status}`);
        }
        if (!overviewRes.ok) {
          throw new Error(`Overview API ${overviewRes.status}`);
        }

        const healthJson = (await healthRes.json()) as HealthResponse;
        const overviewJson = (await overviewRes.json()) as OverviewResponse;
        if (!mounted) return;
        setHealth(healthJson);
        setTopRoutes((overviewJson.routeStats ?? []).slice(0, 5));
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Unable to load rate limit health");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    timer = setInterval(load, 5000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [adminKey, canFetch]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800/90 shadow-card p-6 border-l-4 border-l-accent-emerald hover:shadow-card-hover transition-shadow mb-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Rate Limit Health
        </h2>
        {health && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusTone(
              health.status
            )}`}
          >
            {health.status}
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Widget admin avec refresh auto toutes les 5 secondes.
      </p>

      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Admin key
      </label>
      <input
        type="password"
        value={adminKey}
        onChange={(e) => setAdminKey(e.target.value)}
        placeholder="x-admin-key / RATE_LIMIT_ADMIN_KEY"
        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 mb-4"
      />

      {!canFetch && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Saisis une clé admin pour charger la santé du rate limiting.
        </p>
      )}

      {error && <p className="text-sm text-red-700 dark:text-red-300 mb-3">{error}</p>}

      {health && (
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Max bloqué/min</p>
              <p className="text-lg font-semibold">{health.maxBlockedInCurrentMinute}</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total bloqué/min</p>
              <p className="text-lg font-semibold">{health.totalBlockedInCurrentMinute}</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Routes monitorées</p>
              <p className="text-lg font-semibold">{health.routesMonitored}</p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/60 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Seuil warn/critical</p>
              <p className="text-lg font-semibold">
                {health.warnThreshold}/{health.criticalThreshold}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Hottest route</p>
            <p className="font-medium">
              {health.hottestRoute
                ? `${health.hottestRoute.route} (${health.hottestRoute.blockedInCurrentMinute}/min)`
                : "Aucune"}
            </p>
          </div>

          {topRoutes.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Top routes (minute courante)</p>
              <ul className="space-y-1">
                {topRoutes.map((item) => (
                  <li key={item.route} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-900/60 px-3 py-2">
                    <span className="truncate pr-3">{item.route}</span>
                    <span className="font-semibold">{item.blockedInCurrentMinute}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Dernier refresh: {new Date(health.generatedAt).toLocaleTimeString()}
            {loading ? " (refresh...)" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
