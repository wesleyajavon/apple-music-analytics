/** Options alignées sur l’affichage overview (next-intl / client). */
const DATE_OPTS = { month: "short", day: "numeric", year: "numeric" } as const;

/** Format compact pour badges mobile (une seule ligne). */
const MOBILE_DATE_OPTS = {
  month: "2-digit",
  day: "2-digit",
  year: "2-digit",
} as const;

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

/** Plage numérique compacte pour badges mobile (ex. 01/15/24–06/20/24). */
export function formatMobileDateRangeLabel(
  startDate?: string,
  endDate?: string,
  locale?: string,
): string {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString(locale, MOBILE_DATE_OPTS)}–${end.toLocaleDateString(locale, MOBILE_DATE_OPTS)}`;
}
