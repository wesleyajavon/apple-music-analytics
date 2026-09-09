"use client";

import {
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";

function ShimmerBar({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded bg-slate-200/90 dark:bg-white/10 ${className}`} />;
}

export function DuetCompareHeroSkeleton() {
  return (
    <OverviewHeroFrame title=" " description=" ">
      <div className="space-y-4" aria-hidden>
        <ShimmerBar className="h-9 w-72 max-w-full" />
        <ShimmerBar className="h-4 w-full max-w-xl" />
        <div className={`mt-2 ${DASHBOARD_METRIC_STRIP}`}>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className={DASHBOARD_METRIC_CELL}>
              <ShimmerBar className="h-8 w-16" />
              <ShimmerBar className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </OverviewHeroFrame>
  );
}

function SectionTabsSkeleton() {
  return (
    <div className={DASHBOARD_SEGMENTED_TRACK} aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <ShimmerBar key={index} className="h-9 w-24 rounded-full" />
      ))}
    </div>
  );
}

export function DuetComparePickerSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-hidden>
      <ShimmerBar className="h-3 w-28" />
      <ShimmerBar className="h-8 w-56" />
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-glass-hairline py-4">
            <ShimmerBar className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <ShimmerBar className="h-4 w-28" />
              <ShimmerBar className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DuetCompareBattleSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-hidden>
      <SectionTabsSkeleton />
      <section className="space-y-4">
        <ShimmerBar className="h-3 w-28" />
        <ShimmerBar className="h-8 w-64 max-w-full" />
        <ShimmerBar className="h-4 w-96 max-w-full" />
        <div className="relative min-h-[280px]">
          <div className="flex h-[240px] flex-col justify-between">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-px bg-slate-200/80 dark:bg-white/10" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function DuetComparePageFallback() {
  return (
    <div className="space-y-8" aria-busy="true">
      <DuetSubNav />
      <DuetCompareHeroSkeleton />
      <DuetComparePickerSkeleton />
    </div>
  );
}
