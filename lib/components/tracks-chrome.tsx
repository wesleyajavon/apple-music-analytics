"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import type { TrackOverviewDto } from "@/lib/dto/track";

export function TracksMasthead({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("tracks");

  return <OverviewHeroFrame title={t("title")} description={t("subtitle")} compact={compact} />;
}

export function TracksMetricStrip({
  overview,
  locale,
  loading = false,
}: {
  overview?: TrackOverviewDto;
  locale: string;
  loading?: boolean;
}) {
  const t = useTranslations("tracks");
  const metrics = overview
    ? [
        { key: "tracks", label: t("tracks"), value: overview.totalTracks.toLocaleString(locale) },
        { key: "listens", label: t("listens"), value: overview.totalListens.toLocaleString(locale) },
        {
          key: "top",
          label: t("topTrack"),
          value: overview.topTrackListenCount.toLocaleString(locale),
        },
      ]
    : [
        { key: "tracks", label: t("tracks"), value: null },
        { key: "listens", label: t("listens"), value: null },
        { key: "top", label: t("topTrack"), value: null },
      ];

  return (
    <div
      className={`${DASHBOARD_METRIC_STRIP} w-full max-lg:flex-nowrap max-lg:overflow-x-auto`}
      aria-busy={loading || undefined}
    >
      {metrics.map((metric) => (
        <div key={metric.key} className={`${DASHBOARD_METRIC_CELL} max-lg:min-w-[10.5rem] max-lg:flex-none`}>
          <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
          {metric.value == null ? (
            <span className={`${DASHBOARD_METRIC_VALUE} inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`} />
          ) : (
            <span className={DASHBOARD_METRIC_VALUE}>{metric.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function TracksCanvasSection({
  eyebrow,
  title,
  description,
  titleId,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <section className="w-full min-w-0" aria-labelledby={titleId}>
      <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
      <h2 id={titleId} className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
      ) : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}
