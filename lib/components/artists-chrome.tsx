"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
} from "@/lib/components/dashboard-ui";
import type { ArtistOverviewDto } from "@/lib/dto/artist";

export function ArtistsMasthead({
  trendsHref,
  compact = false,
}: {
  trendsHref: string;
  compact?: boolean;
}) {
  const t = useTranslations("artists");

  return (
    <OverviewHeroFrame title={t("title")} description={t("subtitle")} compact={compact}>
      <div className={compact ? "mt-4" : "mt-6"}>
        <Link href={trendsHref} className={`${DASHBOARD_BTN_GHOST} px-0`}>
          {t("viewTrends")}
        </Link>
      </div>
    </OverviewHeroFrame>
  );
}

export function ArtistsMetricStrip({
  overview,
  locale,
  loading = false,
}: {
  overview?: ArtistOverviewDto;
  locale: string;
  loading?: boolean;
}) {
  const t = useTranslations("artists");
  const metrics = overview
    ? [
        { key: "artists", label: t("artists"), value: overview.totalArtists.toLocaleString(locale) },
        { key: "listens", label: t("listens"), value: overview.totalListens.toLocaleString(locale) },
        {
          key: "top",
          label: t("topArtist"),
          value: overview.topArtistListenCount.toLocaleString(locale),
        },
      ]
    : [
        { key: "artists", label: t("artists"), value: null },
        { key: "listens", label: t("listens"), value: null },
        { key: "top", label: t("topArtist"), value: null },
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

export function ArtistsCanvasSection({
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
