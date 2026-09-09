"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import { WaitingForImportMobileCtas } from "@/lib/components/waiting-for-import-demo";

/**
 * Bleed the empty canvas from the sticky filter bar down to the bottom nav
 * so short import CTAs do not leave a vacant dashboard surface underneath.
 */
export const DASHBOARD_MOBILE_EMPTY_BLEED =
  "-mx-4 -mt-4 -mb-4 flex min-h-[calc(100dvh-var(--dashboard-filter-height,0px)-var(--dashboard-bottom-nav-offset,0px))] flex-col px-4 pb-5 pt-4 lg:hidden";

export function DashboardMobileImportEmpty({
  eyebrow,
  title,
  lead,
  demoPath,
  importLabel,
  demoLabel,
  header,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  demoPath: string;
  importLabel: string;
  demoLabel?: string;
  header?: ReactNode;
  /** @deprecated Crystal empty no longer uses cinematic atmosphere. */
  atmosphere?: ReactNode;
}) {
  const t = useTranslations("components.emptyState");

  return (
    <div className={DASHBOARD_MOBILE_EMPTY_BLEED}>
      <section className="flex min-h-0 flex-1 flex-col gap-4" aria-label={title}>
        {header}
        <p className="text-[13px] font-medium text-muted">{eyebrow}</p>
        <OverviewHeroFrame compact title={title} description={lead}>
          <div className="mt-6">
            <WaitingForImportMobileCtas
              demoPath={demoPath}
              importLabel={importLabel}
              demoLabel={demoLabel ?? t("emptyDemoCta")}
            />
          </div>
        </OverviewHeroFrame>
      </section>
    </div>
  );
}
