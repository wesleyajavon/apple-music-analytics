"use client";

import { Suspense, type RefCallback } from "react";
import { usePathname } from "@/i18n/navigation";
import { DateRangeFilter } from "@/lib/components/date-range-filter";
import { DASHBOARD_GLASS_CHROME } from "@/lib/components/dashboard-ui";
import { SignedInPublicDemoExploreBanner } from "@/lib/components/waiting-for-import-demo";

const HEADER_SHELL =
  `${DASHBOARD_GLASS_CHROME} sticky top-0 z-30 shrink-0 border-b lg:border-0 lg:bg-transparent lg:[background-color:transparent] lg:[backdrop-filter:none] lg:[-webkit-backdrop-filter:none] lg:px-3 lg:pt-3`;

type DashboardStickyHeaderProps = {
  filterRef: RefCallback<HTMLDivElement | null>;
};

function DashboardStickyHeaderInner({ filterRef }: DashboardStickyHeaderProps) {
  const pathname = usePathname();
  const isOnboarding = pathname.includes("/dashboard/onboarding");

  return (
    <div ref={filterRef} className={HEADER_SHELL}>
      {!isOnboarding ? (
        <>
          <SignedInPublicDemoExploreBanner />
          <DateRangeFilter />
        </>
      ) : null}
    </div>
  );
}

export function DashboardStickyHeader(props: DashboardStickyHeaderProps) {
  return (
    <Suspense
      fallback={
        <div className={`${HEADER_SHELL} px-3 py-2`}>
          <div className="h-11 w-full animate-pulse rounded-full bg-white/10" />
        </div>
      }
    >
      <DashboardStickyHeaderInner {...props} />
    </Suspense>
  );
}
