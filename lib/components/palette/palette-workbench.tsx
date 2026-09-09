"use client";

import { memo, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, LineChart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  PaletteMobileEmpty,
  PaletteMobileError,
  PaletteMobileExperience,
  PaletteMobileSkeleton,
} from "@/lib/components/palette/palette-mobile";
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
import { OverviewHeroFrame } from "@/lib/components/overview-hero";
import {
  useMapPaletteArtist,
  usePaletteSession,
  usePaletteSuggestions,
  useSkipPaletteArtist,
} from "@/lib/hooks/use-palette";
import type { PaletteMode, PaletteSessionDto } from "@/lib/dto/palette";
import { DASHBOARD_CHART_THEME } from "@/lib/constants/dashboard-spotlight";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_BTN_OUTLINE,
  DASHBOARD_METRIC_CELL,
  DASHBOARD_METRIC_LABEL,
  DASHBOARD_METRIC_STRIP,
  DASHBOARD_METRIC_VALUE,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import { useTheme } from "@/lib/providers/theme-provider";
import { ChartResponsiveContainer } from "@/lib/components/chart-responsive-container";

const PALETTE_INPUT_CLASS =
  "min-h-11 w-full rounded-2xl border border-glass-hairline bg-surface-raised px-4 text-base text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm";

type PaletteChartTranslationKey =
  | "stepLabel"
  | "unknownSeries"
  | "mappedSeries";

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

function PaletteMetricStrip({
  data,
  locale,
  t,
  loading = false,
}: {
  data?: PaletteSessionDto;
  locale: string;
  t: (key: string) => string;
  loading?: boolean;
}) {
  const pct = data ? Math.round(data.progress.completionRatio * 100) : null;
  const metrics = [
    {
      key: "progress",
      label: t("heroMetricProgress"),
      value: pct == null ? null : `${pct}%`,
    },
    {
      key: "unknown",
      label: t("heroMetricUnknown"),
      value: data ? data.unknownListensTotal.toLocaleString(locale) : null,
    },
    {
      key: "mapped",
      label: t("heroMetricMapped"),
      value: data ? data.mappedListensTotal.toLocaleString(locale) : null,
    },
  ];

  return (
    <div
      className={`${DASHBOARD_METRIC_STRIP} w-full`}
      aria-busy={loading || undefined}
      role="group"
      aria-label={t("heroStatBadge")}
    >
      {metrics.map((metric) => (
        <div key={metric.key} className={DASHBOARD_METRIC_CELL}>
          <span className={DASHBOARD_METRIC_LABEL}>{metric.label}</span>
          {metric.value == null ? (
            <span
              className={`${DASHBOARD_METRIC_VALUE} inline-block h-8 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10`}
            />
          ) : (
            <span className={DASHBOARD_METRIC_VALUE}>{metric.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function PaletteModeSwitcher({
  paletteMode,
  setPaletteMode,
}: {
  paletteMode: PaletteMode;
  setPaletteMode: (mode: PaletteMode) => void;
}) {
  const t = useTranslations("palette");
  return (
    <div
      className={DASHBOARD_SEGMENTED_TRACK}
      role="group"
      aria-label={t("modeAriaLabel")}
    >
      <button
        type="button"
        onClick={() => setPaletteMode("artists")}
        className={
          paletteMode === "artists"
            ? DASHBOARD_SEGMENTED_PILL_ACTIVE
            : DASHBOARD_SEGMENTED_PILL
        }
      >
        {t("modeArtists")}
      </button>
      <button
        type="button"
        onClick={() => setPaletteMode("tracks")}
        className={
          paletteMode === "tracks"
            ? DASHBOARD_SEGMENTED_PILL_ACTIVE
            : DASHBOARD_SEGMENTED_PILL
        }
      >
        {t("modeTracks")}
      </button>
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
      <div className="space-y-3 rounded-xl border border-glass-hairline bg-surface-raised/60 p-3">
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
    <div
      className="relative h-[160px] rounded-xl border border-glass-hairline bg-surface/60 p-4 lg:h-[180px]"
      aria-busy="true"
    >
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
      <>
        <PaletteMobileError onRetry={() => refetch()} />
        <div className="hidden lg:block">
          <OverviewHeroFrame title={t("title")} description={t("loadError")}>
            <div className="mt-6">
              <ErrorState
                error={error}
                onRetry={() => refetch()}
                message={t("loadError")}
              />
            </div>
          </OverviewHeroFrame>
        </div>
      </>
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

  const subtitle =
    paletteMode === "tracks" ? t("subtitleTracks") : t("subtitleArtists");

  return (
    <>
      {isLoading || !data ? (
        <PaletteMobileSkeleton />
      ) : !activeCard ? (
        <PaletteMobileEmpty />
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
        />
      )}

      <div className="hidden lg:block">
        <div className="space-y-8">
          <OverviewHeroFrame title={t("title")} description={subtitle}>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PaletteModeSwitcher
                paletteMode={paletteMode}
                setPaletteMode={setPaletteMode}
              />
              <span className="text-[13px] font-semibold tabular-nums text-muted">
                {isLoading || !data ? "…" : progressLabel}
              </span>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/dashboard/genres"
                className={`${DASHBOARD_BTN_OUTLINE} w-full sm:w-auto`}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                {t("backToGenres")}
              </Link>
              <Link
                href="/dashboard/genres/trends"
                className={`${DASHBOARD_BTN_GHOST} w-full sm:w-auto`}
              >
                <LineChart className="h-4 w-4" aria-hidden />
                {tGenres("viewTrends")}
              </Link>
            </div>
            <div className="mt-6 max-w-2xl space-y-2 text-sm leading-6 text-muted">
              <p className="font-semibold text-foreground">{t("whyImplementedTitle")}</p>
              <p>{t("whyImplementedBody")}</p>
              <p>{t("whyImplementedOutcome")}</p>
            </div>
            <div className="mt-5 h-1.5 max-w-md overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-foreground/80 transition-all duration-500 dark:bg-white/80"
                style={{
                  width: `${Math.max(0, Math.min(100, (data?.progress.completionRatio ?? 0) * 100))}%`,
                }}
              />
            </div>
          </OverviewHeroFrame>

          <PaletteMetricStrip
            data={data}
            locale={locale}
            t={t}
            loading={isLoading || !data}
          />

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
            <section className="min-w-0 lg:col-span-3" aria-labelledby="palette-mapping-title">
              <p className={DASHBOARD_SECTION_EYEBROW}>{t("heroEyebrow")}</p>
              <h2 id="palette-mapping-title" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
                {paletteMode === "tracks" ? t("nextTrackCard") : t("nextArtistCard")}
              </h2>
              <div className="mt-8">
                {isLoading ? (
                  <PaletteMappingSkeleton />
                ) : !activeCard ? (
                  <div className="max-w-xl space-y-4">
                    <p className="text-xl font-semibold tracking-tight text-foreground">
                      {t("doneTitle")}
                    </p>
                    <p className="text-sm leading-6 text-muted">
                      {paletteMode === "tracks"
                        ? t("doneHintTracks")
                        : t("doneHintArtists")}
                    </p>
                    <Link href="/dashboard/genres" className={DASHBOARD_BTN_GHOST}>
                      {t("backToGenres")}
                    </Link>
                  </div>
                ) : (
                  <>
                    {paletteMode === "tracks" && track ? (
                      <>
                        <h3 className="text-xl font-semibold tracking-tight text-foreground lg:text-3xl">
                          {track.trackTitle}
                        </h3>
                        <p className="mt-1 text-sm font-medium text-muted">
                          {track.artistName}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-glass-hairline bg-surface-raised px-3 py-1 text-sm text-muted">
                            {t("listensImpacted", {
                              count: track.unknownListens.toLocaleString(locale),
                            })}
                          </span>
                          <span className="rounded-full border border-glass-hairline bg-surface-raised px-3 py-1 text-sm text-muted">
                            {t("tracksImpacted", {
                              count: track.impactedTracks.toLocaleString(locale),
                            })}
                          </span>
                        </div>
                      </>
                    ) : artist ? (
                      <>
                        <h3 className="text-xl font-semibold tracking-tight text-foreground lg:text-3xl">
                          {artist.artistName}
                        </h3>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-glass-hairline bg-surface-raised px-3 py-1 text-sm text-muted">
                            {t("listensImpacted", {
                              count: artist.unknownListens.toLocaleString(locale),
                            })}
                          </span>
                          <span className="rounded-full border border-glass-hairline bg-surface-raised px-3 py-1 text-sm text-muted">
                            {t("tracksImpacted", {
                              count: artist.impactedTracks.toLocaleString(locale),
                            })}
                          </span>
                        </div>
                      </>
                    ) : null}

                    <div className="mt-6 space-y-3">
                      {suggestions.length > 0 ? (
                        <div className="space-y-2 border-t border-glass-hairline pt-4">
                          <p className="text-[13px] font-medium text-muted">
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
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-glass-hairline bg-surface-raised text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                                  }`}
                                  title={`${s.reason} • ${s.provider}`}
                                >
                                  {s.genre} ({Math.round(s.confidence * 100)}%)
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted">{t("suggestionsHint")}</p>
                        </div>
                      ) : null}
                      <label className="block text-sm font-semibold text-foreground">
                        {t("existingGenres")}
                      </label>
                      <input
                        list="palette-genre-suggestions"
                        value={selectedGenre}
                        onChange={(event) => {
                          setSelectedGenre(event.target.value);
                          setSelectedSuggestionId(null);
                        }}
                        className={PALETTE_INPUT_CLASS}
                        placeholder={t("existingGenresPlaceholder")}
                      />
                      <datalist id="palette-genre-suggestions">
                        {data?.existingGenres.map((genre) => (
                          <option key={genre} value={genre} />
                        ))}
                      </datalist>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label className="block text-sm font-semibold text-foreground">
                        {t("customGenre")}
                      </label>
                      <input
                        value={customGenre}
                        onChange={(event) => {
                          setCustomGenre(event.target.value);
                          setSelectedSuggestionId(null);
                        }}
                        className={PALETTE_INPUT_CLASS}
                        placeholder={t("customGenrePlaceholder")}
                      />
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={handleMap}
                        disabled={!canSubmit}
                        className={`${DASHBOARD_BTN_OUTLINE} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {isBusy ? t("saving") : t("apply")}
                      </button>
                      <button
                        type="button"
                        onClick={handleSkip}
                        disabled={isBusy}
                        className={`${DASHBOARD_BTN_GHOST} w-full sm:w-auto disabled:opacity-40`}
                      >
                        {t("skip")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>

            <aside
              className="min-w-0 border-t border-glass-hairline pt-8 lg:col-span-2 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0"
              aria-labelledby="palette-chart-title"
            >
              <p className={DASHBOARD_SECTION_EYEBROW}>{t("heroStatTag")}</p>
              <h2 id="palette-chart-title" className={`${DASHBOARD_SECTION_TITLE} mt-1`}>
                {t("miniChartTitle")}
              </h2>
              <div className="mt-8">
                {isLoading || !data ? (
                  <>
                    <PaletteMiniChartSkeleton />
                    <div className="mt-3 space-y-2">
                      <div className="h-9 rounded-xl bg-black/5 animate-shimmer dark:bg-white/10" />
                      <div className="h-9 rounded-xl bg-black/5 animate-shimmer dark:bg-white/10" />
                    </div>
                  </>
                ) : (
                  <>
                    <PaletteMiniChart
                      data={data.compactTrends}
                      t={t}
                      locale={locale}
                      chartPalette={chartPalette}
                    />
                    <div className="mt-4 space-y-2 text-sm text-muted">
                      <p>
                        {t("unknownTotal", {
                          count: data.unknownListensTotal.toLocaleString(locale),
                        })}
                      </p>
                      <p>
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
