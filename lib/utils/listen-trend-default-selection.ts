export const LISTEN_TREND_DEFAULT_SERIES_COUNT = 5;

export function sliceDefaultTrendSelection(
  catalogIds: readonly string[],
  max = LISTEN_TREND_DEFAULT_SERIES_COUNT,
): string[] {
  return catalogIds.slice(0, Math.min(max, catalogIds.length));
}

export function idsEqualOrdered(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Auto top-N follows the date range until the user curates the series.
 * Returns `null` when the current selection should be kept.
 */
export function nextDefaultTrendSelection({
  selectionTouched,
  chartFetching,
  catalogIds,
  currentIds,
  max = LISTEN_TREND_DEFAULT_SERIES_COUNT,
}: {
  selectionTouched: boolean;
  chartFetching: boolean;
  catalogIds: readonly string[];
  currentIds: readonly string[];
  max?: number;
}): string[] | null {
  if (selectionTouched || chartFetching || catalogIds.length === 0) return null;
  const next = sliceDefaultTrendSelection(catalogIds, max);
  if (idsEqualOrdered(currentIds, next)) return null;
  return next;
}
