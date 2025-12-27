"use client";

import { memo, useCallback } from "react";
import { useOverviewStats } from "@/lib/hooks/use-listening";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";

/**
 * Formate les secondes en format lisible (heures, minutes)
 * Fonction pure, peut être utilisée sans mémorisation
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Composant de carte statistique mémorisé pour éviter les re-renders inutiles
 */
const StatCard = memo(({ 
  icon, 
  label, 
  value 
}: { 
  icon: string; 
  label: string; 
  value: string | number;
}) => (
  <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
    <div className="p-5">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="text-2xl">{icon}</div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {label}
            </dt>
            <dd className="text-lg font-medium text-gray-900 dark:text-white">
              {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
));

StatCard.displayName = "StatCard";

export default function OverviewPage() {
  const { data, isLoading, error, refetch } = useOverviewStats();

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Statistiques générales de votre écoute musicale
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Chargement des statistiques..." />
      ) : error ? (
        <ErrorState
          error={error}
          message="Impossible de charger les statistiques"
          onRetry={handleRetry}
        />
      ) : !data || data.totalListens === 0 ? (
        <EmptyState
          message="Aucune donnée d'écoute disponible. Importez vos données pour voir vos statistiques."
          icon="📊"
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="🎵"
            label="Total d'écoutes"
            value={data.totalListens}
          />
          <StatCard
            icon="🎤"
            label="Artistes uniques"
            value={data.uniqueArtists}
          />
          <StatCard
            icon="🎧"
            label="Titres uniques"
            value={data.uniqueTracks}
          />
          <StatCard
            icon="⏱️"
            label="Temps total"
            value={formatTime(data.totalPlayTime)}
          />
        </div>
      )}
    </div>
  );
}

