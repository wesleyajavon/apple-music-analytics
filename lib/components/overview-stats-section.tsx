"use client";

import { memo } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import { formatListeningTime } from "@/lib/utils/overview-page";

type ChangeInfo = {
  value: number;
  displayValue: string;
  isPositive: boolean;
} | null;

const ChangeLine = memo(function ChangeLine({
  change,
  vsLabel,
}: {
  change: ChangeInfo;
  vsLabel: string;
}) {
  if (!change) return null;
  return (
    <p className="text-[13px] tabular-nums text-muted">
      {change.isPositive ? "+" : "−"}
      {change.displayValue}% · {vsLabel}
    </p>
  );
});

export type OverviewStatsChanges = {
  totalListens: ChangeInfo;
  uniqueArtists: ChangeInfo;
  uniqueTracks: ChangeInfo;
  totalPlayTime: ChangeInfo;
} | null;

type OverviewStatsSectionProps = {
  totalListens: number;
  uniqueArtists: number;
  uniqueTracks: number;
  totalPlayTime: number;
  changes: OverviewStatsChanges;
  showComparison: boolean;
};

export function OverviewStatsSection({
  totalListens,
  uniqueArtists,
  uniqueTracks,
  totalPlayTime,
  changes,
  showComparison,
}: OverviewStatsSectionProps) {
  const t = useTranslations("overview");
  const locale = useLocale();
  const vsLabel = t("vsPreviousPeriod");

  const metrics = [
    {
      key: "listens",
      label: t("stats.totalListens"),
      value: totalListens.toLocaleString(locale),
      change: changes?.totalListens ?? null,
    },
    {
      key: "artists",
      label: t("stats.uniqueArtists"),
      value: uniqueArtists.toLocaleString(locale),
      change: changes?.uniqueArtists ?? null,
    },
    {
      key: "tracks",
      label: t("stats.uniqueTracks"),
      value: uniqueTracks.toLocaleString(locale),
      change: changes?.uniqueTracks ?? null,
    },
    {
      key: "time",
      label: t("statsSectionTimeLabel"),
      value: formatListeningTime(totalPlayTime, t("notAvailable")),
      change: changes?.totalPlayTime ?? null,
    },
  ] as const;

  return (
    <section className="w-full min-w-0" aria-labelledby="overview-stats-heading">
      <p className={DASHBOARD_SECTION_EYEBROW}>{t("statsSectionBadge")}</p>
      <h2 id="overview-stats-heading" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
        {t("statsSectionTitle")}
      </h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{t("statsSectionDescription")}</p>
      {showComparison ? (
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{t("statsSectionComparisonNote")}</p>
      ) : null}

      <div className={`${DASHBOARD_METRIC_STRIP} mt-8 w-full`}>
        {metrics.map((metric) => (
          <div key={metric.key} className={DASHBOARD_METRIC_CELL}>
            <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
            <span className={DASHBOARD_METRIC_VALUE}>{metric.value}</span>
            {showComparison ? <ChangeLine change={metric.change} vsLabel={vsLabel} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
