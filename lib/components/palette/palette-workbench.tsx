"use client";

import { memo, useMemo, useState, type ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, ChevronDown, LineChart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorState } from "@/lib/components/error-state";
import {
  useMapPaletteArtist,
  usePaletteSession,
  usePaletteSuggestions,
  useSkipPaletteArtist,
} from "@/lib/hooks/use-palette";
import type { PaletteMode, PaletteSessionDto } from "@/lib/dto/palette";
import {
  DASHBOARD_SPOTLIGHT_SHELL,
  DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY,
  DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET,
  DASHBOARD_SPOTLIGHT_INNER_WELL,
  DASHBOARD_SPOTLIGHT_MUTED,
  DASHBOARD_SPOTLIGHT_BTN_SECONDARY,
  DASHBOARD_SPOTLIGHT_TITLE,
  DASHBOARD_SPOTLIGHT_SELECT,
  DASHBOARD_CHART_THEME,
} from "@/lib/constants/dashboard-spotlight";
import { useTheme } from "@/lib/providers/theme-provider";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";

/** Aligné sur le hero `/dashboard/genres` — shell startup / Vercel-friendly. */
const PALETTE_HERO_SHELL_CLASS =
  "relative overflow-hidden rounded-[2rem] border border-white/10 bg-gray-950 px-5 py-6 text-white shadow-2xl shadow-violet-500/15 sm:px-8 sm:py-9 lg:px-10 lg:py-10";

const PALETTE_MODE_ACTIVE_TAB_CLASS =
  "bg-white text-violet-950 shadow-sm shadow-black/25 dark:bg-white dark:text-violet-950";

const PALETTE_INPUT_CLASS = `${DASHBOARD_SPOTLIGHT_SELECT} text-base focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/25 sm:text-sm`;

const PALETTE_SPOTLIGHT_CARD_CLASS = `relative ${DASHBOARD_SPOTLIGHT_SHELL}`;

type PaletteChartTranslationKey =
  | "stepLabel"
  | "unknownSeries"
  | "mappedSeries";

type PaletteTranslation = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function createPaletteTooltip(
  t: (key: PaletteChartTranslationKey) => string,
  locale: string,
) {
  const PaletteTooltipInner = memo(
    ({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ name: string; value: number; color: string }>;
      label?: string | number;
    }) => {
      if (!active || !payload?.length) return null;
      return (
        <div className="chart-tooltip-accessible min-w-[180px] p-4">
          <p className="mb-2 font-semibold">
            {t("stepLabel")} {label}
          </p>
          <ul className="space-y-1.5 text-sm">
            {payload.map((entry) => (
              <li key={entry.name} className="flex justify-between gap-4">
                <span style={{ color: entry.color }}>{entry.name}</span>
                <span className="chart-tooltip-secondary font-medium tabular-nums">
                  {Number(entry.value).toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    },
  );
  PaletteTooltipInner.displayName = "PaletteTooltip";
  return PaletteTooltipInner;
}

function PaletteMiniChart({
  data,
  t,
  locale,
  chartPalette,
}: {
  data: Array<{ step: number; unknownListens: number; mappedListens: number }>;
  t: (key: PaletteChartTranslationKey) => string;
  locale: string;
  chartPalette: (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
}) {
  const PaletteTooltip = useMemo(
    () => createPaletteTooltip(t, locale),
    [t, locale],
  );

  return (
    <ChartResponsiveContainer token="paletteMini">
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
        <XAxis
          dataKey="step"
          tick={{ fill: chartPalette.tick, fontSize: 11 }}
          stroke={chartPalette.axisStroke}
        />
        <YAxis
          tick={{ fill: chartPalette.tick, fontSize: 11 }}
          stroke={chartPalette.axisStroke}
        />
        <Tooltip content={<PaletteTooltip />} />
        <Legend
          wrapperStyle={{ color: chartPalette.legend, fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="unknownListens"
          name={t("unknownSeries")}
          stroke="#a78bfa"
          strokeWidth={2}
          dot={false}
          animationDuration={300}
        />
        <Line
          type="monotone"
          dataKey="mappedListens"
          name={t("mappedSeries")}
          stroke="#22d3ee"
          strokeWidth={2}
          dot={false}
          animationDuration={300}
        />
      </RechartsLineChart>
    </ChartResponsiveContainer>
  );
}

function PaletteHeroStats({
  data,
  locale,
  t,
}: {
  data: PaletteSessionDto;
  locale: string;
  t: (key: string) => string;
}) {
  const pct = Math.round(data.progress.completionRatio * 100);
  return (
    <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{pct}%</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroMetricProgress")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{data.unknownListensTotal.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroMetricUnknown")}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <p className="text-xl font-semibold tracking-tight text-white tabular-nums">{data.mappedListensTotal.toLocaleString(locale)}</p>
        <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{t("heroMetricMapped")}</p>
      </div>
    </div>
  );
}

function PaletteHeroStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 pt-4 sm:grid-cols-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="mb-2 h-7 w-16 rounded bg-white/20" />
          <div className="h-3 w-24 rounded bg-white/15" />
        </div>
      ))}
    </div>
  );
}

function PaletteMappingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div>
        <div className="h-3 w-28 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
        <div className="mt-3 h-8 w-64 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="h-8 w-32 rounded-full bg-gray-100 animate-shimmer dark:bg-gray-800" />
          <div className="h-8 w-36 rounded-full bg-gray-100 animate-shimmer dark:bg-gray-800" />
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-violet-200/40 bg-violet-50/80 p-3 dark:border-violet-300/15 dark:bg-violet-400/10">
        <div className="h-3 w-36 rounded bg-violet-200 animate-shimmer dark:bg-violet-900/70" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-7 rounded-full bg-violet-100 animate-shimmer dark:bg-violet-900/60"
              style={{ width: `${92 + ((index * 17) % 72)}px` }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
        <div className="h-10 rounded-lg bg-gray-100 animate-shimmer dark:bg-gray-800" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-gray-200 animate-shimmer dark:bg-gray-700" />
        <div className="h-10 rounded-lg bg-gray-100 animate-shimmer dark:bg-gray-800" />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-28 rounded-lg bg-violet-200 animate-shimmer dark:bg-violet-900/70" />
        <div className="h-10 w-20 rounded-lg bg-gray-100 animate-shimmer dark:bg-gray-800" />
      </div>
    </div>
  );
}

function PaletteMiniChartSkeleton() {
  return (
    <div className="relative h-[160px] rounded-xl border border-card-border bg-surface/60 p-4 lg:h-[180px]" aria-busy="true">
      <div className="flex h-full flex-col justify-between">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-px bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="absolute inset-x-6 bottom-8 top-8">
        <svg className="h-full w-full" viewBox="0 0 360 120" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 35 C70 45 100 75 160 70 S250 35 360 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-fuchsia-200 dark:text-fuchsia-900"
            opacity="0.85"
          />
          <path
            d="M0 95 C80 85 115 65 180 55 S280 45 360 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-cyan-200 dark:text-cyan-900"
            opacity="0.85"
          />
        </svg>
      </div>
    </div>
  );
}

function PaletteMobileSignalCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "violet" | "cyan" | "emerald";
}) {
  const toneClass =
    tone === "violet"
      ? "border-violet-200/80 bg-violet-50/80 text-violet-950 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-100"
      : tone === "cyan"
        ? "border-cyan-200/80 bg-cyan-50/80 text-cyan-950 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100"
        : tone === "emerald"
          ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-950 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
          : "border-slate-200/85 bg-white/85 text-slate-950 dark:border-white/10 dark:bg-white/[0.06] dark:text-white";

  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-sm shadow-slate-900/[0.04] ${toneClass}`}>
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.03em] tabular-nums">
        {value}
      </p>
    </div>
  );
}

function PaletteMobileDetails({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-[1.35rem] border border-slate-200/85 bg-white/80 shadow-sm shadow-slate-900/[0.04] dark:border-white/10 dark:bg-white/[0.04] [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
        {title}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400"
          aria-hidden
        />
      </summary>
      <div className="border-t border-slate-200/80 px-4 py-4 dark:border-white/10">
        {children}
      </div>
    </details>
  );
}

function PaletteMobileSkeleton({ t }: { t: PaletteTranslation }) {
  return (
    <div className="space-y-4 lg:hidden" aria-busy="true">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="h-6 w-32 rounded-full bg-white/15 animate-shimmer" />
        <div className="mt-5 h-9 w-4/5 rounded bg-white/15 animate-shimmer" />
        <div className="mt-3 h-4 w-full rounded bg-white/10 animate-shimmer" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
              <div className="h-3 w-16 rounded bg-white/15 animate-shimmer" />
              <div className="mt-3 h-6 w-14 rounded bg-white/20 animate-shimmer" />
            </div>
          ))}
        </div>
      </section>
      <section className={PALETTE_SPOTLIGHT_CARD_CLASS}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
        <div className="relative p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-200">
            {t("mobile.decisionEyebrow")}
          </p>
          <div className="mt-4">
            <PaletteMappingSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}

function PaletteMobileExperience({
  data,
  paletteMode,
  setPaletteMode,
  activeCard,
  track,
  artist,
  suggestions,
  selectedGenre,
  setSelectedGenre,
  customGenre,
  setCustomGenre,
  selectedSuggestionId,
  setSelectedSuggestionId,
  canSubmit,
  isBusy,
  onMap,
  onSkip,
  locale,
  t,
  tGenres,
  chartPalette,
}: {
  data: PaletteSessionDto;
  paletteMode: PaletteMode;
  setPaletteMode: (mode: PaletteMode) => void;
  activeCard: PaletteSessionDto["nextArtist"] | PaletteSessionDto["nextTrack"];
  track: PaletteSessionDto["nextTrack"];
  artist: PaletteSessionDto["nextArtist"];
  suggestions: Array<{ id: string; genre: string; confidence: number; reason: string; provider: string }>;
  selectedGenre: string;
  setSelectedGenre: (value: string) => void;
  customGenre: string;
  setCustomGenre: (value: string) => void;
  selectedSuggestionId: string | null;
  setSelectedSuggestionId: (value: string | null) => void;
  canSubmit: boolean;
  isBusy: boolean;
  onMap: () => void;
  onSkip: () => void;
  locale: string;
  t: PaletteTranslation;
  tGenres: PaletteTranslation;
  chartPalette: (typeof DASHBOARD_CHART_THEME)[keyof typeof DASHBOARD_CHART_THEME];
}) {
  const progressPct = Math.round(data.progress.completionRatio * 100);
  const activeTitle =
    paletteMode === "tracks" && track
      ? track.trackTitle
      : artist?.artistName ?? t("doneTitle");
  const activeSubtitle =
    paletteMode === "tracks" && track ? track.artistName : t("mobile.nextBestMatch");
  const impactedListens = activeCard?.unknownListens ?? 0;
  const impactedTracks = activeCard?.impactedTracks ?? 0;

  return (
    <div className="space-y-4 lg:hidden">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gray-950 p-5 text-white shadow-2xl shadow-violet-500/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.3),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(6,182,212,0.22),transparent_30%),linear-gradient(145deg,rgba(3,7,18,0.98),rgba(30,27,75,0.9)_52%,rgba(8,47,73,0.72))]" />
        <div className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-violet-100">
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_16px_rgb(22_199_132_/0.75)]" />
              {t("mobile.eyebrow")}
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tabular-nums text-white">
              {progressPct}%
            </span>
          </div>

          <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.055em]">
            {t("mobile.heroTitle")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/72">
            {paletteMode === "tracks"
              ? t("mobile.heroSubtitleTracks")
              : t("mobile.heroSubtitleArtists")}
          </p>

          <div
            className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-white/10 p-1"
            role="group"
            aria-label={t("modeAriaLabel")}
          >
            <button
              type="button"
              onClick={() => setPaletteMode("artists")}
              className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                paletteMode === "artists"
                  ? PALETTE_MODE_ACTIVE_TAB_CLASS
                  : "text-white/75 hover:text-white"
              }`}
            >
              {t("modeArtists")}
            </button>
            <button
              type="button"
              onClick={() => setPaletteMode("tracks")}
              className={`min-h-11 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                paletteMode === "tracks"
                  ? PALETTE_MODE_ACTIVE_TAB_CLASS
                  : "text-white/75 hover:text-white"
              }`}
            >
              {t("modeTracks")}
            </button>
          </div>

          <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {activeCard ? t("mobile.nowFixing") : t("doneTitle")}
            </p>
            <p className="mt-2 line-clamp-2 text-2xl font-semibold tracking-[-0.045em]">
              {activeTitle}
            </p>
            <p className="mt-1 text-sm text-white/68">{activeSubtitle}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <PaletteMobileSignalCard
              label={t("mobile.impactSignal")}
              value={impactedListens.toLocaleString(locale)}
              tone="violet"
            />
            <PaletteMobileSignalCard
              label={t("mobile.remainingSignal")}
              value={data.progress.remaining.toLocaleString(locale)}
              tone="cyan"
            />
            <PaletteMobileSignalCard
              label={t("mobile.mappedSignal")}
              value={data.mappedListensTotal.toLocaleString(locale)}
              tone="emerald"
            />
            <PaletteMobileSignalCard
              label={t("mobile.suggestionsSignal")}
              value={suggestions.length.toLocaleString(locale)}
            />
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link
              href="/dashboard/genres"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-gray-950 shadow-xl shadow-black/20"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("backToGenres")}
            </Link>
            <Link
              href="/dashboard/genres/trends"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white"
            >
              <LineChart className="h-4 w-4" aria-hidden />
              {tGenres("viewTrends")}
            </Link>
          </div>
        </div>
      </section>

      <section className={PALETTE_SPOTLIGHT_CARD_CLASS}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
        <div className="relative p-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-200">
            {t("mobile.decisionEyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-slate-950 dark:text-white">
            {activeCard ? t("mobile.decisionTitle") : t("doneTitle")}
          </h2>
          <p className={`mt-2 ${DASHBOARD_SPOTLIGHT_MUTED}`}>
            {activeCard
              ? t("mobile.decisionSubtitle")
              : paletteMode === "tracks"
                ? t("doneHintTracks")
                : t("doneHintArtists")}
          </p>

          {activeCard ? (
            <div className="mt-5 space-y-5">
              <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {paletteMode === "tracks" ? t("nextTrackCard") : t("nextArtistCard")}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-white">
                      {activeTitle}
                    </p>
                    {paletteMode === "tracks" ? (
                      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {activeSubtitle}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-900 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-100">
                    {t("mobile.highImpact")}
                  </span>
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="shrink-0 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    {t("listensImpacted", { count: impactedListens.toLocaleString(locale) })}
                  </span>
                  <span className="shrink-0 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    {t("tracksImpacted", { count: impactedTracks.toLocaleString(locale) })}
                  </span>
                </div>
              </div>

              {suggestions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-800 dark:text-violet-200">
                    {t("suggestionsTitle")}
                  </p>
                  <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {suggestions.map((s) => {
                      const isActive = selectedSuggestionId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedSuggestionId(s.id);
                            setSelectedGenre(s.genre);
                            setCustomGenre("");
                          }}
                          className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                            isActive
                              ? "border-violet-600 bg-violet-600 text-white shadow-sm dark:border-violet-400 dark:bg-violet-400 dark:text-slate-950"
                              : "border-violet-300/60 bg-violet-50 text-violet-950 hover:bg-violet-100 dark:border-white/15 dark:bg-white/[0.06] dark:text-violet-100 dark:hover:bg-white/10"
                          }`}
                          title={`${s.reason} • ${s.provider}`}
                        >
                          {s.genre} ({Math.round(s.confidence * 100)}%)
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                  {t("mobile.pickGenre")}
                </label>
                <input
                  list="palette-mobile-genre-suggestions"
                  value={selectedGenre}
                  onChange={(event) => {
                    setSelectedGenre(event.target.value);
                    setSelectedSuggestionId(null);
                  }}
                  className={`min-h-11 w-full ${PALETTE_INPUT_CLASS}`}
                  placeholder={t("existingGenresPlaceholder")}
                />
                <datalist id="palette-mobile-genre-suggestions">
                  {data.existingGenres.map((genre) => (
                    <option key={genre} value={genre} />
                  ))}
                </datalist>
              </div>

              <PaletteMobileDetails title={t("mobile.customGenreTitle")}>
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                    {t("customGenre")}
                  </label>
                  <input
                    value={customGenre}
                    onChange={(event) => {
                      setCustomGenre(event.target.value);
                      setSelectedSuggestionId(null);
                    }}
                    className={`min-h-11 w-full ${PALETTE_INPUT_CLASS}`}
                    placeholder={t("customGenrePlaceholder")}
                  />
                </div>
              </PaletteMobileDetails>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <button
                  type="button"
                  onClick={onMap}
                  disabled={!canSubmit}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-slate-900/15 transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100"
                >
                  {isBusy ? t("saving") : t("apply")}
                </button>
                <button
                  type="button"
                  onClick={onSkip}
                  disabled={isBusy}
                  className={`inline-flex min-h-12 items-center justify-center px-4 py-3 ${DASHBOARD_SPOTLIGHT_BTN_SECONDARY}`}
                >
                  {t("skip")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <PaletteMobileDetails title={t("mobile.progressDetailsTitle")}>
        <div className={DASHBOARD_SPOTLIGHT_INNER_WELL}>
          <PaletteMiniChart
            data={data.compactTrends}
            t={t}
            locale={locale}
            chartPalette={chartPalette}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400">
          <p className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} !p-3`}>
            {t("unknownTotal", {
              count: data.unknownListensTotal.toLocaleString(locale),
            })}
          </p>
          <p className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} !p-3`}>
            {t("mappedTotal", {
              count: data.mappedListensTotal.toLocaleString(locale),
            })}
          </p>
        </div>
      </PaletteMobileDetails>

      <PaletteMobileDetails title={t("mobile.whyDetailsTitle")}>
        <div className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-950 dark:text-white">
            {t("whyImplementedTitle")}
          </p>
          <p className="mt-2">{t("whyImplementedBody")}</p>
          <p className="mt-2">{t("whyImplementedOutcome")}</p>
        </div>
      </PaletteMobileDetails>
    </div>
  );
}

export function PaletteWorkbench() {
  const t = useTranslations("palette");
  const tGenres = useTranslations("genres");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const chartPalette =
    DASHBOARD_CHART_THEME[resolvedTheme === "dark" ? "dark" : "light"];
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("artists");
  const { data, isLoading, error, refetch } = usePaletteSession(paletteMode);
  const mapMutation = useMapPaletteArtist();
  const skipMutation = useSkipPaletteArtist();
  const [customGenre, setCustomGenre] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<
    string | null
  >(null);

  const isBusy = mapMutation.isPending || skipMutation.isPending;
  const artist = data?.nextArtist ?? null;
  const track = data?.nextTrack ?? null;
  const activeCard = paletteMode === "tracks" ? track : artist;
  const genreValue = selectedGenre || customGenre.trim();
  const canSubmit = !!activeCard && genreValue.length >= 2 && !isBusy;
  const { data: suggestions = [] } = usePaletteSuggestions({
    mode: paletteMode,
    artistId: paletteMode === "artists" ? artist?.artistId : undefined,
    trackId: paletteMode === "tracks" ? track?.trackId : undefined,
    enabled: !!activeCard,
  });

  const progressLabel = useMemo(() => {
    if (!data) return "";
    return `${Math.round(data.progress.completionRatio * 100)}%`;
  }, [data]);

  if (error) {
    return (
      <div className={PALETTE_SPOTLIGHT_CARD_CLASS}>
        <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
        <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
        <div className="relative p-6 sm:p-8">
          <ErrorState
            error={error}
            onRetry={() => refetch()}
            message={t("loadError")}
          />
        </div>
      </div>
    );
  }

  if (!isLoading && !data) return null;

  async function handleMap() {
    if (!activeCard || !canSubmit) return;
    if (paletteMode === "tracks" && track) {
      await mapMutation.mutateAsync({
        mode: "tracks",
        trackId: track.trackId,
        genre: genreValue,
        suggestionId: selectedSuggestionId ?? undefined,
      });
    } else if (paletteMode === "artists" && artist) {
      await mapMutation.mutateAsync({
        mode: "artists",
        artistId: artist.artistId,
        genre: genreValue,
        suggestionId: selectedSuggestionId ?? undefined,
      });
    }
    setCustomGenre("");
    setSelectedGenre("");
    setSelectedSuggestionId(null);
  }

  async function handleSkip() {
    if (!activeCard || isBusy) return;
    if (paletteMode === "tracks" && track) {
      await skipMutation.mutateAsync({
        mode: "tracks",
        trackId: track.trackId,
        suggestionId: selectedSuggestionId ?? undefined,
      });
    } else if (paletteMode === "artists" && artist) {
      await skipMutation.mutateAsync({
        mode: "artists",
        artistId: artist.artistId,
        suggestionId: selectedSuggestionId ?? undefined,
      });
    }
    setSelectedSuggestionId(null);
  }

  return (
    <>
      {isLoading || !data ? (
        <PaletteMobileSkeleton t={t} />
      ) : (
        <PaletteMobileExperience
          data={data}
          paletteMode={paletteMode}
          setPaletteMode={setPaletteMode}
          activeCard={activeCard}
          track={track}
          artist={artist}
          suggestions={suggestions}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          customGenre={customGenre}
          setCustomGenre={setCustomGenre}
          selectedSuggestionId={selectedSuggestionId}
          setSelectedSuggestionId={setSelectedSuggestionId}
          canSubmit={canSubmit}
          isBusy={isBusy}
          onMap={handleMap}
          onSkip={handleSkip}
          locale={locale}
          t={t}
          tGenres={tGenres}
          chartPalette={chartPalette}
        />
      )}

    <div className="hidden lg:block">
    <div className="space-y-6 lg:space-y-8">
      <div className={PALETTE_HERO_SHELL_CLASS}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.26),transparent_30%),radial-gradient(circle_at_80%_12%,rgba(6,182,212,0.2),transparent_32%),linear-gradient(135deg,rgba(3,7,18,0.98),rgba(30,27,75,0.88)_48%,rgba(8,47,73,0.72))]" />
        <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-accent-violet/22 blur-3xl" />
        <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-accent-cyan/18 blur-3xl" />
        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_18px_rgb(22_199_132_/0.75)]" />
              {t("heroEyebrow")}
            </div>
            <h1 className="max-w-4xl text-balance text-3xl font-semibold tracking-[-0.06em] text-white lg:text-6xl">{t("title")}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              {paletteMode === "tracks" ? t("subtitleTracks") : t("subtitleArtists")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div
                className="inline-flex rounded-2xl border border-white/15 bg-white/10 p-1 backdrop-blur"
                role="group"
                aria-label={t("modeAriaLabel")}
              >
                <button
                  type="button"
                  onClick={() => setPaletteMode("artists")}
                  className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    paletteMode === "artists"
                      ? PALETTE_MODE_ACTIVE_TAB_CLASS
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  {t("modeArtists")}
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteMode("tracks")}
                  className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    paletteMode === "tracks"
                      ? PALETTE_MODE_ACTIVE_TAB_CLASS
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  {t("modeTracks")}
                </button>
              </div>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white tabular-nums backdrop-blur">
                {isLoading || !data ? "…" : progressLabel}
              </span>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/dashboard/genres"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-gray-950 shadow-2xl shadow-black/25 transition-all hover:-translate-y-0.5 hover:bg-gray-100 sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("backToGenres")}
              </Link>
              <Link
                href="/dashboard/genres/trends"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/15 sm:w-auto"
              >
                <LineChart className="h-4 w-4" aria-hidden />
                {tGenres("viewTrends")}
              </Link>
            </div>
            <div className="mt-6 rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-4 py-4 text-sm leading-6 text-white/85 shadow-inner backdrop-blur-sm">
              <p className="font-semibold text-white">{t("whyImplementedTitle")}</p>
              <p className="mt-2 text-white/75">{t("whyImplementedBody")}</p>
              <p className="mt-2 text-white/75">{t("whyImplementedOutcome")}</p>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 transition-all duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, (data?.progress.completionRatio ?? 0) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-brand-gradient-soft blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <p className="font-mono text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-slate-400">{t("heroStatBadge")}</p>
                  <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.66rem] font-semibold text-violet-100">{t("heroStatTag")}</span>
                </div>
                {isLoading || !data ? <PaletteHeroStatsSkeleton /> : <PaletteHeroStats data={data} locale={locale} t={t} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className={`${PALETTE_SPOTLIGHT_CARD_CLASS} lg:col-span-3`}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative p-6 sm:p-8">
            {isLoading ? (
              <PaletteMappingSkeleton />
            ) : !activeCard ? (
              <div className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} px-6 py-10 text-center`}>
                <p className={`${DASHBOARD_SPOTLIGHT_TITLE}`}>{t("doneTitle")}</p>
                <p className={`mt-2 ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                  {paletteMode === "tracks"
                    ? t("doneHintTracks")
                    : t("doneHintArtists")}
                </p>
              </div>
            ) : (
              <>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">
                  {paletteMode === "tracks"
                    ? t("nextTrackCard")
                    : t("nextArtistCard")}
                </p>
                {paletteMode === "tracks" && track ? (
                  <>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground lg:text-3xl">
                      {track.trackTitle}
                    </h2>
                    <p className={`mt-1 text-sm font-medium ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                      {track.artistName}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                        {t("listensImpacted", {
                          count: track.unknownListens.toLocaleString(locale),
                        })}
                      </span>
                      <span className="rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                        {t("tracksImpacted", {
                          count: track.impactedTracks.toLocaleString(locale),
                        })}
                      </span>
                    </div>
                  </>
                ) : artist ? (
                  <>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground lg:text-3xl">
                      {artist.artistName}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                        {t("listensImpacted", {
                          count: artist.unknownListens.toLocaleString(locale),
                        })}
                      </span>
                      <span className="rounded-full border border-slate-200/90 bg-slate-50/90 px-3 py-1 text-sm text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                        {t("tracksImpacted", {
                          count: artist.impactedTracks.toLocaleString(locale),
                        })}
                      </span>
                    </div>
                  </>
                ) : null}

                <div className="mt-6 space-y-3">
                  {suggestions.length > 0 ? (
                    <div className="space-y-2 rounded-[1.35rem] border border-violet-200/70 bg-violet-50/70 p-3 dark:border-white/10 dark:bg-white/[0.06]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-800 dark:text-violet-200">
                        {t("suggestionsTitle")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.map((s) => {
                          const isActive = selectedSuggestionId === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSuggestionId(s.id);
                                setSelectedGenre(s.genre);
                                setCustomGenre("");
                              }}
                              className={`min-h-11 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
                                isActive
                                  ? "border-violet-600 bg-violet-600 text-white shadow-sm dark:border-violet-400 dark:bg-violet-400 dark:text-slate-950"
                                  : "border-violet-300/50 bg-white/80 text-violet-900 hover:bg-violet-100 dark:border-white/15 dark:bg-black/30 dark:text-violet-100 dark:hover:bg-white/10"
                              }`}
                              title={`${s.reason} • ${s.provider}`}
                            >
                              {s.genre} ({Math.round(s.confidence * 100)}%)
                            </button>
                          );
                        })}
                      </div>
                      <p className={`text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                        {t("suggestionsHint")}
                      </p>
                    </div>
                  ) : null}
                  <label className={`block text-sm font-semibold text-slate-900 dark:text-white`}>
                    {t("existingGenres")}
                  </label>
                  <input
                    list="palette-genre-suggestions"
                    value={selectedGenre}
                    onChange={(event) => {
                      setSelectedGenre(event.target.value);
                      setSelectedSuggestionId(null);
                    }}
                    className={`w-full ${PALETTE_INPUT_CLASS}`}
                    placeholder={t("existingGenresPlaceholder")}
                  />
                  <datalist id="palette-genre-suggestions">
                    {data?.existingGenres.map((genre) => (
                      <option key={genre} value={genre} />
                    ))}
                  </datalist>
                </div>

                <div className="mt-4 space-y-3">
                  <label className={`block text-sm font-semibold text-slate-900 dark:text-white`}>
                    {t("customGenre")}
                  </label>
                  <input
                    value={customGenre}
                    onChange={(event) => {
                      setCustomGenre(event.target.value);
                      setSelectedSuggestionId(null);
                    }}
                    className={`w-full ${PALETTE_INPUT_CLASS}`}
                    placeholder={t("customGenrePlaceholder")}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={handleMap}
                    disabled={!canSubmit}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-xl shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-slate-950 dark:hover:bg-gray-100 sm:w-auto"
                  >
                    {isBusy ? t("saving") : t("apply")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isBusy}
                    className={`inline-flex min-h-11 w-full items-center justify-center px-5 py-2.5 sm:w-auto ${DASHBOARD_SPOTLIGHT_BTN_SECONDARY}`}
                  >
                    {t("skip")}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className={`${PALETTE_SPOTLIGHT_CARD_CLASS} lg:col-span-2`}>
          <div className={DASHBOARD_SPOTLIGHT_GRADIENT_PRIMARY} aria-hidden />
          <div className={DASHBOARD_SPOTLIGHT_HAIRLINE_VIOLET} aria-hidden />
          <div className="relative p-6 sm:p-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {t("miniChartTitle")}
            </p>
            {isLoading || !data ? (
              <>
                <div className="mt-4">
                  <PaletteMiniChartSkeleton />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-9 rounded-xl bg-slate-100 animate-shimmer dark:bg-white/10" />
                  <div className="h-9 rounded-xl bg-slate-100 animate-shimmer dark:bg-white/10" />
                </div>
              </>
            ) : (
              <>
                <div className={`mt-4 ${DASHBOARD_SPOTLIGHT_INNER_WELL}`}>
                  <PaletteMiniChart
                    data={data.compactTrends}
                    t={t}
                    locale={locale}
                    chartPalette={chartPalette}
                  />
                </div>
                <div className={`mt-3 space-y-2 text-xs ${DASHBOARD_SPOTLIGHT_MUTED}`}>
                  <p className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} !p-3 text-sm`}>
                    {t("unknownTotal", {
                      count: data.unknownListensTotal.toLocaleString(locale),
                    })}
                  </p>
                  <p className={`${DASHBOARD_SPOTLIGHT_INNER_WELL} !p-3 text-sm`}>
                    {t("mappedTotal", {
                      count: data.mappedListensTotal.toLocaleString(locale),
                    })}
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
    </div>
    </>
  );
}
