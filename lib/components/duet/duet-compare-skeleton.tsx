"use client";

import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
} from "@/lib/constants/dashboard-spotlight";

const DUET_COMPARE_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const DUET_SUB_NAV_SHELL =
  "flex w-full flex-wrap gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-black/30";

function ShimmerBar({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded bg-slate-200/90 dark:bg-white/10 ${className}`} />;
}

function HeroShimmerBar({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded bg-white/15 ${className}`} />;
}

export function DuetCompareHeroSkeleton() {
  return (
    <div className={DUET_COMPARE_HERO_SHELL} aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.28),transparent_30%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88))]" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
        <div className="space-y-5">
          <HeroShimmerBar className="h-7 w-36 rounded-full" />
          <HeroShimmerBar className="h-12 w-4/5 max-w-lg" />
          <HeroShimmerBar className="h-5 w-full max-w-2xl" />
          <HeroShimmerBar className="h-5 w-3/4 max-w-xl" />
        </div>
        <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4">
          <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-2">
                <HeroShimmerBar className="h-14 w-14 rounded-full" />
                <HeroShimmerBar className="h-4 w-20" />
                <HeroShimmerBar className="h-8 w-16" />
              </div>
              <HeroShimmerBar className="h-7 w-12 rounded-full" />
              <div className="flex flex-col items-center gap-2">
                <HeroShimmerBar className="h-14 w-14 rounded-full" />
                <HeroShimmerBar className="h-4 w-20" />
                <HeroShimmerBar className="h-8 w-16" />
              </div>
            </div>
            <HeroShimmerBar className="mt-5 h-3 w-full rounded-full" />
          </div>
        </div>
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
          <ShimmerBar className="h-8 w-64 max-w-full" />
          <ShimmerBar className="h-4 w-96 max-w-full" />
        </div>
        <ShimmerBar className="h-7 w-24 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function DuetTimelineChartSkeleton() {
  return (
    <div className={`relative min-h-[360px] ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
      <div className="flex h-[320px] flex-col justify-between">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-px bg-slate-200/80 dark:bg-white/10" />
        ))}
      </div>
      <div className="absolute inset-x-8 bottom-16 top-12">
        <svg className="h-full w-full" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 250 C110 175 190 225 300 175 S500 115 610 165 720 215 800 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-violet-300 dark:text-violet-700"
            opacity="0.85"
          />
          <path
            d="M0 285 C140 240 235 245 340 205 S530 250 650 165 735 130 800 155"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-cyan-300 dark:text-cyan-800"
            opacity="0.75"
          />
        </svg>
      </div>
    </div>
  );
}

function ContextBarSkeleton() {
  return (
    <div
      className="-mx-4 border-b border-slate-200/80 bg-white/85 px-4 py-3 dark:border-white/10 dark:bg-slate-950/80 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      aria-hidden
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <ShimmerBar className="h-8 w-8 rounded-full" />
          <ShimmerBar className="h-4 w-16" />
          <ShimmerBar className="h-6 w-10 rounded-full" />
          <ShimmerBar className="h-8 w-8 rounded-full" />
          <ShimmerBar className="h-4 w-16" />
        </div>
        <div className="flex gap-3">
          <ShimmerBar className="h-9 w-32 rounded-xl" />
          <ShimmerBar className="h-9 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function SectionTabsSkeleton() {
  return (
    <div className="flex flex-col gap-2 sm:flex-row" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <ShimmerBar key={index} className="h-[4.25rem] flex-1 rounded-2xl" />
      ))}
    </div>
  );
}

function FriendPickerCardSkeleton() {
  return (
    <div className="flex min-h-[9.5rem] flex-col items-center justify-center gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-slate-950/60">
      <ShimmerBar className="h-14 w-14 rounded-full" />
      <ShimmerBar className="h-4 w-28" />
      <ShimmerBar className="h-3 w-20" />
    </div>
  );
}

export function DuetComparePickerSkeleton() {
  return (
    <section className={DASHBOARD_SPOTLIGHT_SHELL} aria-busy="true" aria-hidden>
      <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
      <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
      <SpotlightHeaderSkeleton />
      <div className="grid gap-3 px-5 pb-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <FriendPickerCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

export function DuetCompareBattleSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-hidden>
      <ContextBarSkeleton />
      <SectionTabsSkeleton />
      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
        <SpotlightHeaderSkeleton />
        <div className="px-5 pb-6 sm:px-8">
          <DuetTimelineChartSkeleton />
        </div>
      </section>
    </div>
  );
}

export function DuetComparePageFallback() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className={DUET_SUB_NAV_SHELL} aria-hidden>
        <ShimmerBar className="h-10 flex-1 rounded-xl" />
        <ShimmerBar className="h-10 flex-1 rounded-xl" />
      </div>
      <DuetCompareHeroSkeleton />
      <DuetCompareBattleSkeleton />
    </div>
  );
}

export function DuetCompareSubNavSkeleton() {
  return (
    <div className={DUET_SUB_NAV_SHELL} aria-hidden>
      <ShimmerBar className="h-10 flex-1 rounded-xl" />
      <ShimmerBar className="h-10 flex-1 rounded-xl" />
    </div>
  );
}
