"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { CompareMetadataResponse } from "@/lib/dto/duet";
import { DASHBOARD_SPOTLIGHT_MUTED } from "@/lib/constants/dashboard-spotlight";

type Props = {
  friendName: string;
  metadata?: CompareMetadataResponse;
};

function formatDate(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DuetMetadataBanner({ friendName, metadata }: Props) {
  const t = useTranslations("duet.metadataBanner");
  const [dismissed, setDismissed] = useState(false);

  const reasons = useMemo(() => {
    if (!metadata) return [];
    const { self, friend } = metadata;
    const items: string[] = [];
    const locale = typeof navigator !== "undefined" ? navigator.language : "fr";

    if (self.minDate && friend.minDate && self.maxDate && friend.maxDate) {
      const selfSpan = new Date(self.maxDate).getTime() - new Date(self.minDate).getTime();
      const friendSpan = new Date(friend.maxDate).getTime() - new Date(friend.minDate).getTime();
      if (friendSpan < selfSpan * 0.85) {
        items.push(
          t("reasonShorterHistory", {
            friendFrom: formatDate(friend.minDate, locale),
            friendTo: formatDate(friend.maxDate, locale),
            selfFrom: formatDate(self.minDate, locale),
            selfTo: formatDate(self.maxDate, locale),
          })
        );
      }
    }

    if (friend.totalListens < self.totalListens * 0.5) {
      items.push(
        t("reasonFewerListens", {
          friendTotal: friend.totalListens,
          selfTotal: self.totalListens,
        })
      );
    }

    return items;
  }, [metadata, t]);

  if (dismissed || reasons.length === 0) return null;

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-50"
    >
      <p className="font-semibold">{t("title")}</p>
      <p className={`mt-1 leading-relaxed ${DASHBOARD_SPOTLIGHT_MUTED} text-amber-900/80 dark:text-amber-100/80`}>
        {t("body", { friendName, reasons: reasons.join(` ${t("reasonSeparator")} `) })}
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
      >
        {t("dismiss")}
      </button>
    </div>
  );
}
