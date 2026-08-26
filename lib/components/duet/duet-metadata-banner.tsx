"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { CompareMetadataResponse } from "@/lib/dto/duet";
import { DUET_COVERAGE_SPAN_RATIO } from "@/lib/constants/duet-compare";
import { DASHBOARD_SPOTLIGHT_MUTED } from "@/lib/constants/dashboard-spotlight";

type Props = {
  friendName: string;
  metadata?: CompareMetadataResponse;
  compact?: boolean;
};

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function hasUnevenHistoryCoverage(metadata: CompareMetadataResponse): boolean {
  const { self, friend } = metadata;
  if (!self.minDate || !friend.minDate || !self.maxDate || !friend.maxDate) {
    return false;
  }

  const selfSpan = new Date(self.maxDate).getTime() - new Date(self.minDate).getTime();
  const friendSpan = new Date(friend.maxDate).getTime() - new Date(friend.minDate).getTime();
  if (selfSpan <= 0 || friendSpan <= 0) return false;

  const shorter = Math.min(selfSpan, friendSpan);
  const longer = Math.max(selfSpan, friendSpan);
  return shorter < longer * DUET_COVERAGE_SPAN_RATIO;
}

export function DuetMetadataBanner({ friendName, metadata, compact = false }: Props) {
  const t = useTranslations("duet.metadataBanner");
  const locale = useLocale();

  const note = useMemo(() => {
    if (!metadata || !hasUnevenHistoryCoverage(metadata)) return null;
    const { self, friend } = metadata;
    return t("coverageNote", {
      friendName,
      friendFrom: formatDate(friend.minDate, locale),
      friendTo: formatDate(friend.maxDate, locale),
      selfFrom: formatDate(self.minDate, locale),
      selfTo: formatDate(self.maxDate, locale),
    });
  }, [friendName, locale, metadata, t]);

  if (!note) return null;

  if (compact) {
    return <p className="text-sm leading-6 text-muted">{note}</p>;
  }

  return (
    <p
      role="status"
      className={`rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm leading-6 ${DASHBOARD_SPOTLIGHT_MUTED} dark:border-white/10 dark:bg-white/5`}
    >
      {note}
    </p>
  );
}
