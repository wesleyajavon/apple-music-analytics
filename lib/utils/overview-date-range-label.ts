/** Options alignées sur l’affichage overview (next-intl / client). */
const DATE_OPTS = { month: "short", day: "numeric", year: "numeric" } as const;

/**
 * Formate une plage de dates pour l’en-tête overview.
 * Le locale doit correspondre à next-intl pour cohérence SSR / client.
 */
export function formatOverviewDateRangeLabel(
  startDate?: string,
  endDate?: string,
  locale?: string
): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(locale, DATE_OPTS)} – ${end.toLocaleDateString(locale, DATE_OPTS)}`;
}
