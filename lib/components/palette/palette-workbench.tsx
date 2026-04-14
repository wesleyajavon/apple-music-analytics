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
  useSkipPaletteArtist,
} from "@/lib/hooks/use-palette";

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
  const { data, isLoading, error, refetch } = usePaletteSession();
  const mapMutation = useMapPaletteArtist();
  const skipMutation = useSkipPaletteArtist();
  const [customGenre, setCustomGenre] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");

  const isBusy = mapMutation.isPending || skipMutation.isPending;
  const artist = data?.nextArtist ?? null;
  const genreValue = selectedGenre || customGenre.trim();
  const canSubmit = !!artist && genreValue.length >= 2 && !isBusy;

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
    if (!artist || !canSubmit) return;
    await mapMutation.mutateAsync({
      artistId: artist.artistId,
      genre: genreValue,
    });
    setCustomGenre("");
    setSelectedGenre("");
  }

  async function handleSkip() {
    if (!artist || isBusy) return;
    await skipMutation.mutateAsync({ artistId: artist.artistId });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
            {progressLabel}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{t("subtitle")}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, data.progress.completionRatio * 100))}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 lg:col-span-3">
          {!artist ? (
            <div className="py-10 text-center">
              <p className="text-base font-semibold text-gray-900 dark:text-white">{t("doneTitle")}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("doneHint")}</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-500">
                {t("nextCard")}
              </p>
              <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{artist.artistName}</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span>{t("listensImpacted", { count: artist.unknownListens.toLocaleString(locale) })}</span>
                <span>{t("tracksImpacted", { count: artist.impactedTracks.toLocaleString(locale) })}</span>
              </div>

              <div className="mt-6 space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("existingGenres")}
                </label>
                <input
                  list="palette-genre-suggestions"
                  value={selectedGenre}
                  onChange={(event) => setSelectedGenre(event.target.value)}
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
                  onChange={(event) => setCustomGenre(event.target.value)}
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
