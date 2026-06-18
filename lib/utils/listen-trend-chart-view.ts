export type ListenTrendChartViewMode = "period" | "cumulative";

export type DualLineChartPoint = { date: string; self: number; friend: number };

export function toCumulativeSingleSeries<T extends object>(
  data: readonly T[],
  valueKey: keyof T
): T[] {
  let sum = 0;
  return data.map((row) => ({
    ...row,
    [valueKey]: (sum += Number(row[valueKey as keyof T]) || 0),
  }));
}

export function toCumulativeMultiSeries<T extends object>(
  data: readonly T[],
  seriesKeys: readonly string[]
): T[] {
  const totals = new Map<string, number>();
  for (const key of seriesKeys) totals.set(key, 0);

  return data.map((row) => {
    const next = { ...row } as T;
    const record = next as Record<string, unknown>;
    const source = row as Record<string, unknown>;
    for (const key of seriesKeys) {
      const cumulative = (totals.get(key) ?? 0) + (Number(source[key]) || 0);
      totals.set(key, cumulative);
      record[key] = cumulative;
    }
    return next;
  });
}

export function toCumulativeDualLineChartData(
  data: readonly DualLineChartPoint[]
): DualLineChartPoint[] {
  let selfSum = 0;
  let friendSum = 0;
  return data.map((row) => ({
    date: row.date,
    self: (selfSum += row.self),
    friend: (friendSum += row.friend),
  }));
}

export function applyListenTrendChartViewSingle<T extends object>(
  data: readonly T[],
  mode: ListenTrendChartViewMode,
  valueKey: keyof T
): T[] {
  return mode === "cumulative" ? toCumulativeSingleSeries(data, valueKey) : [...data];
}

export function applyListenTrendChartViewMulti<T extends object>(
  data: readonly T[],
  mode: ListenTrendChartViewMode,
  seriesKeys: readonly string[]
): T[] {
  if (mode !== "cumulative" || seriesKeys.length === 0) return [...data];
  return toCumulativeMultiSeries(data, seriesKeys);
}

export function applyListenTrendChartViewDual(
  data: readonly DualLineChartPoint[],
  mode: ListenTrendChartViewMode
): DualLineChartPoint[] {
  return mode === "cumulative" ? toCumulativeDualLineChartData(data) : [...data];
}

/** @deprecated Use ListenTrendChartViewMode */
export type DuetChartViewMode = ListenTrendChartViewMode;

/** @deprecated Use applyListenTrendChartViewDual */
export const applyDuetChartView = applyListenTrendChartViewDual;
