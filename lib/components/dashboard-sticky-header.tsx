"use client";

import { Suspense, type RefCallback } from "react";
import { usePathname } from "@/i18n/navigation";
import { DateRangeFilter } from "@/lib/components/date-range-filter";

type DashboardStickyHeaderProps = {
  filterRef: RefCallback<HTMLDivElement | null>;
};

function DashboardStickyHeaderInner({ filterRef }: DashboardStickyHeaderProps) {
  const pathname = usePathname();
  const isOnboarding = pathname.includes("/dashboard/onboarding");

  return (
    <div
      ref={filterRef}
      className="sticky top-0 z-30 shrink-0 border-b border-card-border bg-surface-glass shadow-[0_1px_0_0_rgb(152_80_208_/_0.1)] backdrop-blur-md"
    >
      {!isOnboarding ? <DateRangeFilter /> : null}
    </div>
  );
}

export function DashboardStickyHeader(props: DashboardStickyHeaderProps) {
  return (
    <Suspense
      fallback={
        <div className="sticky top-0 z-30 shrink-0 border-b border-card-border bg-surface-glass px-3 py-2 shadow-[0_1px_0_0_rgb(152_80_208_/_0.1)] backdrop-blur-md lg:px-8 lg:py-3">
          <div className="h-9 w-full animate-pulse rounded-xl bg-card-surface" />
        </div>
      }
    >
      <DashboardStickyHeaderInner {...props} />
    </Suspense>
  );
}
