"use client";

import { useMemo } from "react";

export const TIMELINE_MOBILE_SPARK = {
  width: 260,
  plotHeight: 68,
  plotBottom: 78,
  height: 88,
  padX: 12,
} as const;

export type TimelineMobileSparkPoint = {
  listens: number;
};

export function createTimelineMobileSparkGeometry(data: TimelineMobileSparkPoint[]) {
  if (data.length === 0) {
    return {
      points: "",
      peakX: TIMELINE_MOBILE_SPARK.width / 2,
      peakY: TIMELINE_MOBILE_SPARK.plotBottom,
    };
  }

  const values = data.map((point) => point.listens);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  let peakIndex = 0;
  values.forEach((value, index) => {
    if (value > values[peakIndex]) peakIndex = index;
  });

  const coords = data.map((point, index) => {
    const x =
      data.length === 1
        ? TIMELINE_MOBILE_SPARK.width / 2
        : TIMELINE_MOBILE_SPARK.padX +
          (index / (data.length - 1)) * (TIMELINE_MOBILE_SPARK.width - TIMELINE_MOBILE_SPARK.padX * 2);
    const y =
      TIMELINE_MOBILE_SPARK.plotBottom -
      ((point.listens - min) / range) * TIMELINE_MOBILE_SPARK.plotHeight;
    return { x, y };
  });

  return {
    points: coords.map((coord) => `${coord.x.toFixed(1)},${coord.y.toFixed(1)}`).join(" "),
    peakX: coords[peakIndex].x,
    peakY: coords[peakIndex].y,
  };
}

function Caption({
  label,
  dateTime,
  className,
}: {
  label: string;
  dateTime?: string;
  className: string;
}) {
  if (dateTime) {
    return (
      <time dateTime={dateTime} className={className}>
        {label}
      </time>
    );
  }

  return <span className={className}>{label}</span>;
}

export function TimelineMobileSpark({
  data,
  ariaLabel,
  startLabel,
  peakCaption,
  endLabel,
  startDateTime,
  endDateTime,
  gradientId = "timelineMobileSparkline",
}: {
  data: TimelineMobileSparkPoint[];
  ariaLabel: string;
  startLabel: string;
  peakCaption: string;
  endLabel: string;
  startDateTime?: string;
  endDateTime?: string;
  gradientId?: string;
}) {
  const spark = useMemo(() => createTimelineMobileSparkGeometry(data), [data]);

  return (
    <div className="rounded-3xl border border-card-border bg-card-surface px-3 pb-3 pt-2">
      <svg
        className="h-24 w-full"
        viewBox={`0 0 ${TIMELINE_MOBILE_SPARK.width} ${TIMELINE_MOBILE_SPARK.height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <polyline
          points={spark.points}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={spark.peakX}
          cy={spark.peakY}
          r="5"
          fill="#22d3ee"
          stroke="#f8fafc"
          strokeWidth="2"
        />
      </svg>
      <div className="mt-1 flex items-start justify-between gap-2 text-[11px] font-semibold leading-4 tracking-tight">
        <Caption
          label={startLabel}
          dateTime={startDateTime}
          className="min-w-0 flex-1 text-muted"
        />
        <span className="min-w-0 flex-[1.4] text-center text-cyan-700 dark:text-cyan-300">
          {peakCaption}
        </span>
        <Caption
          label={endLabel}
          dateTime={endDateTime}
          className="min-w-0 flex-1 text-right text-muted"
        />
      </div>
    </div>
  );
}
