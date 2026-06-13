"use client";

import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
} from "@/lib/constants/dashboard-spotlight";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";

const DUET_FRIENDS_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const DUET_SUB_NAV_SHELL =
  "flex w-full flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-black/30";

function ShimmerBar({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded bg-slate-200/90 dark:bg-white/10 ${className}`} />;
}

function HeroShimmerBar({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded bg-white/15 ${className}`} />;
}

export function DuetFriendsHeroSkeleton() {
  return (
    <div className={DUET_FRIENDS_HERO_SHELL} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_30%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(8,47,73,0.88))]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="space-y-5">
          <HeroShimmerBar className="h-7 w-36 rounded-full" />
          <HeroShimmerBar className="h-12 w-4/5 max-w-lg" />
          <HeroShimmerBar className="h-5 w-full max-w-2xl" />
          <div className="flex flex-wrap gap-3 pt-2">
            <HeroShimmerBar className="h-11 w-36 rounded-2xl" />
            <HeroShimmerBar className="h-11 w-40 rounded-2xl" />
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4">
          <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <HeroShimmerBar className="h-3 w-24" />
              <HeroShimmerBar className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <HeroShimmerBar key={index} className="h-16 rounded-2xl" />
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <HeroShimmerBar key={index} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DuetFriendsSectionNavSkeleton() {
  return (
    <div
      className={`flex w-full gap-1 overflow-x-auto p-1 ${DUET_SUB_NAV_SHELL}`}
      aria-hidden
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <ShimmerBar
          key={index}
          className={`h-10 shrink-0 rounded-xl ${index === 0 ? "w-24" : index === 3 ? "w-28" : "w-32"}`}
        />
      ))}
    </div>
  );
}

function FriendRowSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-[1.35rem] border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-slate-950/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <ShimmerBar className="h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0 space-y-2">
          <ShimmerBar className="h-4 w-36" />
          <ShimmerBar className="h-3 w-48" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ShimmerBar className="h-10 w-28 rounded-xl" />
        <ShimmerBar className="h-10 w-24 rounded-xl" />
        <ShimmerBar className="h-10 w-20 rounded-xl" />
      </div>
    </div>
  );
}

function SpotlightHeaderSkeleton() {
  return (
    <div className={`relative px-5 pb-5 pt-6 sm:px-8 ${DASHBOARD_SPOTLIGHT_HEADER_BOTTOM}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <ShimmerBar className="h-3 w-28" />
          <ShimmerBar className="h-8 w-56 max-w-full" />
        </div>
        <ShimmerBar className="h-7 w-24 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function FriendsListSectionSkeleton() {
  return (
    <section className={DASHBOARD_SPOTLIGHT_SHELL} aria-hidden>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} />
      <SpotlightHeaderSkeleton />
      <ul className="space-y-3 px-5 pb-6 sm:px-8">
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
