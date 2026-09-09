"use client";

import {
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
import { OverviewHeroFrame } from "@/lib/components/overview-hero";

function ShimmerBar({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded bg-slate-200/90 dark:bg-white/10 ${className}`} />;
}

export function DuetFriendsHeroSkeleton() {
  return (
    <OverviewHeroFrame title=" " description=" ">
      <div className="space-y-4" aria-hidden>
        <ShimmerBar className="h-9 w-72 max-w-full" />
        <ShimmerBar className="h-4 w-full max-w-xl" />
        <div className={`mt-2 ${DASHBOARD_METRIC_STRIP}`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={DASHBOARD_METRIC_CELL}>
              <ShimmerBar className="h-8 w-12" />
              <ShimmerBar className="h-3 w-16" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <ShimmerBar className="h-11 w-32 rounded-2xl" />
          <ShimmerBar className="h-11 w-36 rounded-2xl" />
        </div>
      </div>
    </OverviewHeroFrame>
  );
}

function DuetFriendsSectionNavSkeleton() {
  return (
    <div className={DASHBOARD_SEGMENTED_TRACK} aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <ShimmerBar
          key={index}
          className={`h-9 shrink-0 rounded-full ${index === 0 ? "w-20" : index === 3 ? "w-24" : "w-28"}`}
        />
      ))}
    </div>
  );
}

function FriendRowSkeleton() {
  return (
    <div className={`flex items-center gap-3 py-3 ${DASHBOARD_LIST_SEPARATOR}`}>
      <ShimmerBar className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <ShimmerBar className="h-4 w-36" />
        <ShimmerBar className="h-3 w-48" />
      </div>
      <ShimmerBar className="h-10 w-24 rounded-2xl" />
    </div>
  );
}

function FriendsListSectionSkeleton() {
  return (
    <section className="space-y-3" aria-hidden>
      <ShimmerBar className="h-3 w-28" />
      <ShimmerBar className="h-8 w-56 max-w-full" />
      <ul>
        {Array.from({ length: 4 }).map((_, index) => (
          <li key={index}>
            <FriendRowSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DuetFriendsContentSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-hidden>
      <DuetFriendsSectionNavSkeleton />
      <FriendsListSectionSkeleton />
    </div>
  );
}

export function DuetFriendsPageFallback() {
  return (
    <div className="space-y-8" aria-busy="true">
      <DuetSubNav />
      <DuetFriendsHeroSkeleton />
      <DuetFriendsContentSkeleton />
    </div>
  );
}
