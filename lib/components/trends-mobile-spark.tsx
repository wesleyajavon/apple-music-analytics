"use client";

export const TRENDS_MOBILE_SPARK = {
  width: 260,
  plotHeight: 68,
  plotBottom: 78,
  height: 88,
  padX: 12,
} as const;

export type TrendsMobileSparkSeries = {
  id: string;
  color: string;
  values: number[];
};

function sparkCoords(values: number[], min: number, range: number) {
  if (values.length === 0) return "";
  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? TRENDS_MOBILE_SPARK.width / 2
          : TRENDS_MOBILE_SPARK.padX +
            (index / (values.length - 1)) * (TRENDS_MOBILE_SPARK.width - TRENDS_MOBILE_SPARK.padX * 2);
      const y = TRENDS_MOBILE_SPARK.plotBottom - ((value - min) / range) * TRENDS_MOBILE_SPARK.plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TrendsMobileSpark({
  series,
  ariaLabel,
  startLabel,
  endLabel,
}: {
  series: TrendsMobileSparkSeries[];
  ariaLabel: string;
  startLabel?: string;
  endLabel?: string;
}) {
  const allValues = series.flatMap((item) => item.values);
  const min = allValues.length > 0 ? Math.min(...allValues) : 0;
  const max = allValues.length > 0 ? Math.max(...allValues) : 1;
  const range = Math.max(max - min, 1);

  return (
    <div className="rounded-3xl border border-card-border bg-card-surface px-3 pb-3 pt-2">
      <svg
        className="h-24 w-full"
        viewBox={`0 0 ${TRENDS_MOBILE_SPARK.width} ${TRENDS_MOBILE_SPARK.height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        {series.map((item) => (
          <polyline
            key={item.id}
            points={sparkCoords(item.values, min, range)}
            fill="none"
            stroke={item.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {startLabel || endLabel ? (
        <div className="mt-1 flex items-start justify-between gap-2 text-[11px] font-semibold leading-4 tracking-tight text-muted">
          <span className="min-w-0 flex-1 truncate">{startLabel}</span>
          <span className="min-w-0 flex-1 truncate text-right">{endLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export function numericTrendValue(
  point: Record<string, string | number>,
  key: string,
): number {
  const value = point[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}
