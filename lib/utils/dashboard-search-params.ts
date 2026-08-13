import type { PeriodType } from "@/lib/components/period-selector";

/**
 * Query keys shared across dashboard pages (date bar + period selector).
 * Preserved when navigating via sidebar so filters are not reset.
 */
export const DASHBOARD_PRESERVED_SEARCH_KEYS = [
  "startDate",
  "endDate",
  "preset",
  "period",
  "userId",
] as const;

/** Route-specific aggregation default when `period` is absent from the target URL. */
export const DASHBOARD_ROUTE_DEFAULT_PERIOD: Partial<Record<string, PeriodType>> = {
  "/dashboard/timeline": "month",
};

/**
 * Appends current dashboard filter params to a path (e.g. sidebar `Link` href).
 * Existing query keys on `targetPath` are kept unless overwritten by a preserved key.
 */
export function mergeDashboardSearchParams(
  targetPath: string,
  sourceSearchParams: URLSearchParams
): string {
  const qIndex = targetPath.indexOf("?");
  const path = qIndex === -1 ? targetPath : targetPath.slice(0, qIndex);
  const existingQuery = qIndex === -1 ? "" : targetPath.slice(qIndex + 1);
  const merged = new URLSearchParams(existingQuery);
  const routeDefaultPeriod = DASHBOARD_ROUTE_DEFAULT_PERIOD[path];

  for (const key of DASHBOARD_PRESERVED_SEARCH_KEYS) {
    if (key === "period" && routeDefaultPeriod) continue;
    if (!sourceSearchParams.has(key)) continue;
    merged.delete(key);
    for (const v of sourceSearchParams.getAll(key)) {
      merged.append(key, v);
    }
  }

  if (routeDefaultPeriod && !merged.has("period")) {
    merged.set("period", routeDefaultPeriod);
  }

  const qs = merged.toString();
  return qs ? `${path}?${qs}` : path;
}
