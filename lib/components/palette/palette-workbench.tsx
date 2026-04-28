"use client";

import { memo, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
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
import type { PaletteMode } from "@/lib/dto/palette";

const PALETTE_CARD_CLASS =
  "relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-card-surface shadow-card backdrop-blur-sm dark:border-cyan-300/15";
const PALETTE_RAIL_CLASS =
  "bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-emerald-400";
const PALETTE_HERO_CLASS =
  "relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.28),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.24),_transparent_32%),linear-gradient(135deg,_#020617_0%,_#0f172a_50%,_#11203a_100%)] shadow-2xl shadow-cyan-950/40";
const PALETTE_HERO_GRID_CLASS =
  "absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,_transparent_1px),linear-gradient(90deg,_rgba(217,70,239,0.08)_1px,_transparent_1px)] bg-[size:32px_32px] opacity-30";

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
}: {
  data: Array<{ step: number; unknownListens: number; mappedListens: number }>;
  t: (key: PaletteChartTranslationKey) => string;
  locale: string;
}) {
  const PaletteTooltip = useMemo(
    () => createPaletteTooltip(t, locale),
    [t, locale],
  );

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgb(var(--border-rgb) / 0.45)"
        />
        <XAxis
          dataKey="step"
          tick={{ fill: "rgb(var(--muted-rgb) / 0.95)", fontSize: 11 }}
          stroke="rgb(var(--border-rgb) / 0.85)"
        />
        <YAxis
          tick={{ fill: "rgb(var(--muted-rgb) / 0.95)", fontSize: 11 }}
          stroke="rgb(var(--border-rgb) / 0.85)"
        />
        <Tooltip content={<PaletteTooltip />} />
        <Legend
          wrapperStyle={{ color: "rgb(var(--muted-rgb))", fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="unknownListens"
          name={t("unknownSeries")}
          stroke="#e879f9"
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
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PaletteWorkbench() {
  const t = useTranslations("palette");
  const locale = useLocale();
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className={PALETTE_CARD_CLASS}>
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${PALETTE_RAIL_CLASS} opacity-80`} />
          <div className="p-6">
            <div className="mb-4 h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
            <div className="mt-5 h-2 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className={`${PALETTE_CARD_CLASS} p-6 lg:col-span-3`}>
            <div className="h-80 animate-pulse rounded-xl bg-surface/60" />
          </div>
          <div className={`${PALETTE_CARD_CLASS} p-6 lg:col-span-2`}>
            <div className="h-56 animate-pulse rounded-xl bg-surface/60" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={PALETTE_CARD_CLASS}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${PALETTE_RAIL_CLASS} opacity-80`} />
        <div className="p-6">
          <ErrorState
            error={error}
            onRetry={() => refetch()}
            message={t("loadError")}
          />
        </div>
      </div>
    );
  }

  if (!data) return null;

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
    <div className="space-y-6">
      <div className={PALETTE_HERO_CLASS}>
        <div className={PALETTE_HERO_GRID_CLASS} />
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-28 left-8 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${PALETTE_RAIL_CLASS} opacity-90`} />
        <div className="relative p-6">
          <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {t("title")}
              </h1>
              <p className="mt-2 text-sm text-cyan-100/85">
                {paletteMode === "tracks"
                  ? t("subtitleTracks")
                  : t("subtitleArtists")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="inline-flex rounded-lg border border-cyan-300/20 bg-slate-950/35 p-1 backdrop-blur-sm"
                role="group"
                aria-label={t("modeAriaLabel")}
              >
                <button
                  type="button"
                  onClick={() => setPaletteMode("artists")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    paletteMode === "artists"
                      ? "bg-cyan-300 text-slate-950 shadow-sm shadow-cyan-950/20"
                      : "text-cyan-100/75 hover:text-white"
                  }`}
                >
                  {t("modeArtists")}
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteMode("tracks")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    paletteMode === "tracks"
                      ? "bg-cyan-300 text-slate-950 shadow-sm shadow-cyan-950/20"
                      : "text-cyan-100/75 hover:text-white"
                  }`}
                >
                  {t("modeTracks")}
                </button>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-cyan-100 tabular-nums backdrop-blur-sm">
                {progressLabel}
              </span>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-cyan-300/15 bg-slate-950/35 px-4 py-3 text-sm text-cyan-50 shadow-lg shadow-cyan-950/10 backdrop-blur-sm">
            <p className="font-semibold">{t("whyImplementedTitle")}</p>
            <p className="mt-1 text-cyan-100/85">{t("whyImplementedBody")}</p>
            <p className="mt-1 text-cyan-100/85">{t("whyImplementedOutcome")}</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/45">
            <div
              className={`h-full rounded-full ${PALETTE_RAIL_CLASS} transition-all`}
              style={{
                width: `${Math.max(0, Math.min(100, data.progress.completionRatio * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${PALETTE_CARD_CLASS} lg:col-span-3`}>
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${PALETTE_RAIL_CLASS} opacity-80`} />
          <div className="relative p-6">
            {!activeCard ? (
              <div className="rounded-xl border border-card-border bg-surface/60 px-6 py-10 text-center">
                <p className="text-base font-semibold text-foreground">
                  {t("doneTitle")}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {paletteMode === "tracks"
                    ? t("doneHintTracks")
                    : t("doneHintArtists")}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
                  {paletteMode === "tracks"
                    ? t("nextTrackCard")
                    : t("nextArtistCard")}
                </p>
                {paletteMode === "tracks" && track ? (
                  <>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                      {track.trackTitle}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-muted">
                      {track.artistName}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
                      <span className="rounded-full border border-card-border bg-surface-glass px-3 py-1">
                        {t("listensImpacted", {
                          count: track.unknownListens.toLocaleString(locale),
                        })}
                      </span>
                      <span className="rounded-full border border-card-border bg-surface-glass px-3 py-1">
                        {t("tracksImpacted", {
                          count: track.impactedTracks.toLocaleString(locale),
                        })}
                      </span>
                    </div>
                  </>
                ) : artist ? (
                  <>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                      {artist.artistName}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted">
                      <span className="rounded-full border border-card-border bg-surface-glass px-3 py-1">
                        {t("listensImpacted", {
                          count: artist.unknownListens.toLocaleString(locale),
                        })}
                      </span>
                      <span className="rounded-full border border-card-border bg-surface-glass px-3 py-1">
                        {t("tracksImpacted", {
                          count: artist.impactedTracks.toLocaleString(locale),
                        })}
                      </span>
                    </div>
                  </>
                ) : null}

                <div className="mt-6 space-y-3">
                  {suggestions.length > 0 ? (
                    <div className="space-y-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
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
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                isActive
                                  ? "border-cyan-400 bg-cyan-400 text-slate-950 shadow-sm"
                                  : "border-cyan-400/25 bg-card-surface text-cyan-700 hover:bg-cyan-400/10 dark:text-cyan-300"
                              }`}
                              title={`${s.reason} • ${s.provider}`}
                            >
                              {s.genre} ({Math.round(s.confidence * 100)}%)
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted">
                        {t("suggestionsHint")}
                      </p>
                    </div>
                  ) : null}
                  <label className="block text-sm font-medium text-foreground">
                    {t("existingGenres")}
                  </label>
                  <input
                    list="palette-genre-suggestions"
                    value={selectedGenre}
                    onChange={(event) => {
                      setSelectedGenre(event.target.value);
                      setSelectedSuggestionId(null);
                    }}
                    className="w-full rounded-lg border border-card-border bg-surface-glass px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    placeholder={t("existingGenresPlaceholder")}
                  />
                  <datalist id="palette-genre-suggestions">
                    {data.existingGenres.map((genre) => (
                      <option key={genre} value={genre} />
                    ))}
                  </datalist>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-foreground">
                    {t("customGenre")}
                  </label>
                  <input
                    value={customGenre}
                    onChange={(event) => {
                      setCustomGenre(event.target.value);
                      setSelectedSuggestionId(null);
                    }}
                    className="w-full rounded-lg border border-card-border bg-surface-glass px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                    placeholder={t("customGenrePlaceholder")}
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleMap}
                    disabled={!canSubmit}
                    className={`rounded-lg ${PALETTE_RAIL_CLASS} px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-cyan-950/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {isBusy ? t("saving") : t("apply")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isBusy}
                    className="rounded-lg border border-card-border bg-surface-glass px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card-surface disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("skip")}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className={`${PALETTE_CARD_CLASS} lg:col-span-2`}>
          <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${PALETTE_RAIL_CLASS} opacity-80`} />
          <div className="relative p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
              {t("miniChartTitle")}
            </h3>
            <div className="mt-4 rounded-xl border border-card-border bg-surface/60 p-3">
              <PaletteMiniChart
                data={data.compactTrends}
                t={t}
                locale={locale}
              />
            </div>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <p className="rounded-lg border border-card-border bg-surface-glass px-3 py-2">
                {t("unknownTotal", {
                  count: data.unknownListensTotal.toLocaleString(locale),
                })}
              </p>
              <p className="rounded-lg border border-card-border bg-surface-glass px-3 py-2">
                {t("mappedTotal", {
                  count: data.mappedListensTotal.toLocaleString(locale),
                })}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
