"use client";

import { memo } from "react";

export type OverviewTrendsTooltipEntry = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
};

export type OverviewTrendsTooltipProps = {
  active?: boolean;
  payload?: OverviewTrendsTooltipEntry[];
  label?: string;
  formatValue: (value: number) => string;
};

function uniquePayload(payload: OverviewTrendsTooltipEntry[]) {
  const rows: OverviewTrendsTooltipEntry[] = [];
  const seen = new Set<string>();
  for (const entry of payload) {
    if (entry.value == null) continue;
    const key = String(entry.dataKey ?? entry.name ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(entry);
  }
  return rows;
}

function OverviewTrendsTooltipInner({
  active,
  payload,
  label,
  formatValue,
}: OverviewTrendsTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const rows = uniquePayload(payload);
  if (rows.length === 0) return null;

  return (
    <div className="crystal-chart-tooltip min-w-[160px] max-w-[min(100vw-2rem,280px)]">
      <p className="text-[13px] font-semibold tracking-tight text-foreground">{label}</p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((entry) => (
          <li
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center justify-between gap-4 text-[13px]"
          >
            <span className="flex min-w-0 items-center gap-2 text-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              <span className="truncate">{entry.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatValue(Number(entry.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const OverviewTrendsTooltip = memo(OverviewTrendsTooltipInner);
OverviewTrendsTooltip.displayName = "OverviewTrendsTooltip";
