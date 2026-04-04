/**
 * Query keys shared across dashboard pages (date bar + period selector).
 * Preserved when navigating via sidebar so filters are not reset.
 */
export const DASHBOARD_PRESERVED_SEARCH_KEYS = [
  "startDate",
  "endDate",
  "preset",
  "period",
] as const;

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

  for (const key of DASHBOARD_PRESERVED_SEARCH_KEYS) {
    if (!sourceSearchParams.has(key)) continue;
    merged.delete(key);
    for (const v of sourceSearchParams.getAll(key)) {
      merged.append(key, v);
    }
  }

  const qs = merged.toString();
  return qs ? `${path}?${qs}` : path;
}
