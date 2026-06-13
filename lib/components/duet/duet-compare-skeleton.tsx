"use client";

import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_GRADIENT_LIME,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_HAIRLINE_LIME,
  DASHBOARD_SPOTLIGHT_HEADER_BOTTOM,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
} from "@/lib/constants/dashboard-spotlight";

const DUET_COMPARE_HERO_SHELL =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

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

function SharedArtistRowSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-[1.15rem] border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
      <ShimmerBar className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <ShimmerBar className="h-4 w-36" />
        <div className="grid grid-cols-2 gap-2">
          <ShimmerBar className="h-14 rounded-lg" />
          <ShimmerBar className="h-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function ArenaModeCardSkeleton() {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/50">
      <ShimmerBar className="h-10 w-10 rounded-xl" />
      <ShimmerBar className="mt-4 h-5 w-28" />
      <ShimmerBar className="mt-2 h-4 w-full" />
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
      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
        <SpotlightHeaderSkeleton />
        <div className="px-5 pb-6 sm:px-8">
          <div className="mb-4 flex justify-end">
            <ShimmerBar className="h-9 w-32 rounded-lg" />
          </div>
          <DuetTimelineChartSkeleton />
        </div>
      </section>

      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_LIME} />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_LIME} />
        <SpotlightHeaderSkeleton />
        <div className="space-y-3 px-5 pb-6 sm:px-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <SharedArtistRowSkeleton key={index} />
          ))}
        </div>
      </section>

      <section className={DASHBOARD_SPOTLIGHT_SHELL}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} />
        <SpotlightHeaderSkeleton />
        <div className="space-y-4 px-5 pb-6 sm:px-8">
          <ShimmerBar className="h-20 w-full rounded-[1.35rem]" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ArenaModeCardSkeleton key={index} />
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
      <DuetCompareHeroSkeleton />
      <DuetCompareBattleSkeleton />
    </div>
  );
}
