"use client";

import { useState, useMemo, useEffect } from "react";
import { useReplaySummaries } from "@/lib/hooks/use-replay";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";
import { ReplayYearlySummaryDto } from "@/lib/dto/replay";

/**
 * Formate les secondes en minutes lisibles
 */
function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return minutes.toLocaleString("fr-FR");
}

/**
 * Composant pour afficher une carte d'année individuelle
 */
function YearCard({ summary }: { summary: ReplayYearlySummaryDto }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* En-tête avec l'année */}
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {summary.year}
        </h2>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Minutes écoutées
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatMinutes(summary.totalPlayTime)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total d&apos;écoutes
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {summary.totalPlays.toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      {/* Top Artists */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Top Artistes
        </h3>
        <div className="space-y-2">
          {summary.topArtists.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {item.rank}. {item.artist.name}
              </span>
              <span className="text-gray-500 dark:text-gray-500">
                {item.playCount} écoutes
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Tracks */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Top Titres
        </h3>
        <div className="space-y-2">
          {summary.topTracks.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="text-gray-600 dark:text-gray-400 font-medium truncate">
                  {item.rank}. {item.track.title}
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-xs truncate">
                  {item.track.artist.name}
                </p>
              </div>
              <span className="text-gray-500 dark:text-gray-500 ml-2 flex-shrink-0">
                {item.playCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Composant principal de comparaison
 */
function ReplayComparisonContent() {
  const { data: summaries, isLoading, error, refetch } = useReplaySummaries();
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Initialiser avec les 2 dernières années si disponibles
  const availableYears = useMemo(
    () => summaries?.map((s) => s.year).sort((a, b) => b - a) || [],
    [summaries]
  );

  // Auto-sélectionner les 2 dernières années au chargement
  useEffect(() => {
    if (availableYears.length > 0 && selectedYears.length === 0) {
      setSelectedYears(availableYears.slice(0, 2));
    }
  }, [availableYears, selectedYears.length]);

  // Filtrer les résumés selon les années sélectionnées
  const selectedSummaries = useMemo(
    () =>
      summaries?.filter((s) => selectedYears.includes(s.year)) || [],
    [summaries, selectedYears]
  );

  if (isLoading) {
    return <LoadingState message="Chargement des données Replay..." />;
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        message="Impossible de charger les données Replay"
        onRetry={refetch}
      />
    );
  }

  if (!summaries || summaries.length === 0) {
    return (
      <EmptyState
        message="Aucune donnée Replay disponible. Importez vos données Apple Music Replay pour commencer la comparaison entre les années."
        icon="📊"
      />
    );
  }

  const handleYearToggle = (year: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      } else {
        return [...prev, year].sort((a, b) => b - a);
      }
    });
  };

  return (
    <div>
      {/* Sélecteur d'années */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sélectionner les années à comparer
        </h2>
        <div className="flex flex-wrap gap-3">
          {availableYears.map((year) => {
            const isSelected = selectedYears.includes(year);
            return (
              <button
                key={year}
                onClick={() => handleYearToggle(year)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSelected
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
        {selectedYears.length === 0 && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sélectionnez au moins une année pour voir les statistiques
          </p>
        )}
      </div>

      {/* Comparaison des années sélectionnées */}
      {selectedYears.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Comparaison {selectedYears.join(" vs ")}
          </h2>

          {/* Grille de comparaison */}
          <div
            className={`grid gap-6 ${
              selectedYears.length === 1
                ? "grid-cols-1 lg:grid-cols-1"
                : selectedYears.length === 2
                ? "grid-cols-1 lg:grid-cols-2"
                : "grid-cols-1 lg:grid-cols-3"
            }`}
          >
            {selectedSummaries.map((summary) => (
              <YearCard key={summary.id} summary={summary} />
            ))}
          </div>

          {/* Statistiques comparatives */}
          {selectedYears.length > 1 && (
            <div className="mt-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Statistiques comparatives
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Comparaison des minutes */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                        Minutes écoutées
                      </h3>
                      <div className="space-y-3">
                        {selectedSummaries
                          .sort((a, b) => b.totalPlayTime - a.totalPlayTime)
                          .map((summary) => {
                            const maxTime = Math.max(
                              ...selectedSummaries.map((s) => s.totalPlayTime)
                            );
                            const percentage =
                              (summary.totalPlayTime / maxTime) * 100;
                            return (
                              <div key={summary.id}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {summary.year}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {formatMinutes(summary.totalPlayTime)}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Comparaison des écoutes */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                        Total d&apos;écoutes
                      </h3>
                      <div className="space-y-3">
                        {selectedSummaries
                          .sort((a, b) => b.totalPlays - a.totalPlays)
                          .map((summary) => {
                            const maxPlays = Math.max(
                              ...selectedSummaries.map((s) => s.totalPlays)
                            );
                            const percentage =
                              (summary.totalPlays / maxPlays) * 100;
                            return (
                              <div key={summary.id}>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {summary.year}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {summary.totalPlays.toLocaleString("fr-FR")}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Artistes partagés */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Artistes présents dans toutes les années
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  {(() => {
                    // Trouver les artistes qui apparaissent dans toutes les années sélectionnées
                    const artistMap = new Map<
                      string,
                      { name: string; years: Map<number, number> }
                    >();

                    selectedSummaries.forEach((summary) => {
                      summary.topArtists.forEach((item) => {
                        const artistName = item.artist.name;
                        if (!artistMap.has(artistName)) {
                          artistMap.set(artistName, {
                            name: artistName,
                            years: new Map(),
                          });
                        }
                        artistMap
                          .get(artistName)!
                          .years.set(summary.year, item.playCount);
                      });
                    });

                    const commonArtists = Array.from(artistMap.values()).filter(
                      (artist) =>
                        artist.years.size === selectedSummaries.length
                    );

                    if (commonArtists.length === 0) {
                      return (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Aucun artiste commun entre toutes les années
                          sélectionnées
                        </p>
                      );
                    }

                    // Trier par le total des écoutes
                    commonArtists.sort((a, b) => {
                      const aTotal = Array.from(a.years.values()).reduce(
                        (sum, count) => sum + count,
                        0
                      );
                      const bTotal = Array.from(b.years.values()).reduce(
                        (sum, count) => sum + count,
                        0
                      );
                      return bTotal - aTotal;
                    });

                    return (
                      <div className="space-y-4">
                        {commonArtists.slice(0, 10).map((artist) => (
                          <div key={artist.name} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                              {artist.name}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {selectedSummaries
                                .sort((a, b) => a.year - b.year)
                                .map((summary) => {
                                  const playCount =
                                    artist.years.get(summary.year) || 0;
                                  return (
                                    <div
                                      key={summary.year}
                                      className="text-sm"
                                    >
                                      <span className="text-gray-500 dark:text-gray-400">
                                        {summary.year}:
                                      </span>{" "}
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {playCount} écoutes
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReplayPage() {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Comparaison Replay
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Comparez vos statistiques Apple Music Replay année par année
        </p>
      </div>

      <ReplayComparisonContent />
    </div>
  );
}
