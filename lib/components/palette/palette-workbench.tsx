"use client";

import { useMemo, useState } from "react";
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

function PaletteMiniChart({
  data,
}: {
  data: Array<{ step: number; unknownListens: number; mappedListens: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="step" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="unknownListens"
          name="Unknown"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          animationDuration={300}
        />
        <Line
          type="monotone"
          dataKey="mappedListens"
          name="Mapped"
          stroke="#10b981"
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
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

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
    return <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} message={t("loadError")} />;
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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-600"
              role="group"
              aria-label={t("modeAriaLabel")}
            >
              <button
                type="button"
                onClick={() => setPaletteMode("artists")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  paletteMode === "artists"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {t("modeArtists")}
              </button>
              <button
                type="button"
                onClick={() => setPaletteMode("tracks")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  paletteMode === "tracks"
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {t("modeTracks")}
              </button>
            </div>
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
              {progressLabel}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {paletteMode === "tracks" ? t("subtitleTracks") : t("subtitleArtists")}
        </p>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">{t("whyImplementedTitle")}</p>
          <p className="mt-1">{t("whyImplementedBody")}</p>
          <p className="mt-1">{t("whyImplementedOutcome")}</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, data.progress.completionRatio * 100))}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 lg:col-span-3">
          {!activeCard ? (
            <div className="py-10 text-center">
              <p className="text-base font-semibold text-gray-900 dark:text-white">{t("doneTitle")}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {paletteMode === "tracks" ? t("doneHintTracks") : t("doneHintArtists")}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-500">
                {paletteMode === "tracks" ? t("nextTrackCard") : t("nextArtistCard")}
              </p>
              {paletteMode === "tracks" && track ? (
                <>
                  <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{track.trackTitle}</h2>
                  <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{track.artistName}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span>{t("listensImpacted", { count: track.unknownListens.toLocaleString(locale) })}</span>
                    <span>{t("tracksImpacted", { count: track.impactedTracks.toLocaleString(locale) })}</span>
                  </div>
                </>
              ) : artist ? (
                <>
                  <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{artist.artistName}</h2>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <span>{t("listensImpacted", { count: artist.unknownListens.toLocaleString(locale) })}</span>
                    <span>{t("tracksImpacted", { count: artist.impactedTracks.toLocaleString(locale) })}</span>
                  </div>
                </>
              ) : null}

              <div className="mt-6 space-y-3">
                {suggestions.length > 0 ? (
                  <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-200">
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
                                ? "border-violet-600 bg-violet-600 text-white"
                                : "border-violet-200 bg-white text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-gray-900 dark:text-violet-200 dark:hover:bg-violet-900/40"
                            }`}
                            title={`${s.reason} • ${s.provider}`}
                          >
                            {s.genre} ({Math.round(s.confidence * 100)}%)
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-violet-700/80 dark:text-violet-200/80">
                      {t("suggestionsHint")}
                    </p>
                  </div>
                ) : null}
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("existingGenres")}
                </label>
                <input
                  list="palette-genre-suggestions"
                  value={selectedGenre}
                  onChange={(event) => {
                    setSelectedGenre(event.target.value);
                    setSelectedSuggestionId(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  placeholder={t("existingGenresPlaceholder")}
                />
                <datalist id="palette-genre-suggestions">
                  {data.existingGenres.map((genre) => (
                    <option key={genre} value={genre} />
                  ))}
                </datalist>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("customGenre")}
                </label>
                <input
                  value={customGenre}
                  onChange={(event) => {
                    setCustomGenre(event.target.value);
                    setSelectedSuggestionId(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  placeholder={t("customGenrePlaceholder")}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleMap}
                  disabled={!canSubmit}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? t("saving") : t("apply")}
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isBusy}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  {t("skip")}
                </button>
              </div>
            </>
          )}
        </section>

        <aside className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{t("miniChartTitle")}</h3>
          <div className="mt-4">
            <PaletteMiniChart data={data.compactTrends} />
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <p>{t("unknownTotal", { count: data.unknownListensTotal.toLocaleString(locale) })}</p>
            <p>{t("mappedTotal", { count: data.mappedListensTotal.toLocaleString(locale) })}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
