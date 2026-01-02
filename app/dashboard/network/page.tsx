"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useArtistNetwork } from "@/lib/hooks/use-network";
import { ArtistNetworkGraphComponent } from "@/lib/components/artist-network-graph";
import { LoadingState } from "@/lib/components/loading-state";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState } from "@/lib/components/empty-state";

function NetworkContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const minPlayCount = searchParams.get("minPlayCount")
    ? parseInt(searchParams.get("minPlayCount")!, 10)
    : undefined;
  // Default to 15 artists max for better visualization and debugging
  const maxArtists = searchParams.get("maxArtists")
    ? parseInt(searchParams.get("maxArtists")!, 10)
    : 15;

  const { data, isLoading, error, refetch } = useArtistNetwork({
    startDate,
    endDate,
    minPlayCount,
    maxArtists,
  });

  // Debug logging
  if (data) {
    console.log("[NetworkPage] Data received:", {
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length,
      metadata: data.metadata,
    });
  }
  if (error) {
    console.error("[NetworkPage] Error:", error);
  }
  console.log("[NetworkPage] State:", { isLoading, hasData: !!data, hasError: !!error });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Réseau d&apos;artistes
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Visualisation des connexions entre vos artistes écoutés basée sur les
          genres partagés et la proximité d&apos;écoute
        </p>
        {data && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>
              <strong>{data.metadata.totalArtists}</strong> artistes
            </span>
            <span>
              <strong>{data.metadata.totalConnections}</strong> connexions
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Chargement du réseau d'artistes..." />
      ) : error ? (
        <ErrorState
          error={error}
          message="Impossible de charger le réseau d'artistes"
          onRetry={() => refetch()}
        />
      ) : !data || data.nodes.length === 0 ? (
        <EmptyState
          message="Aucune donnée disponible pour visualiser le réseau d'artistes. Assurez-vous d'avoir des écoutes avec des connexions entre artistes."
          icon="🕸️"
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              <strong>Instructions :</strong>
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Survolez un nœud pour voir ses connexions</li>
              <li>Cliquez sur un nœud pour le mettre en focus</li>
              <li>Utilisez la molette de la souris pour zoomer</li>
              <li>Cliquez et glissez pour déplacer le graphique</li>
              <li>Glissez un nœud pour le repositionner</li>
            </ul>
          </div>
          <div className="w-full" style={{ height: "800px", minHeight: "600px" }}>
            <ArtistNetworkGraphComponent
              data={data}
              width={1200}
              height={800}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function NetworkPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Réseau d&apos;artistes
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Visualisation des connexions entre vos artistes écoutés
            </p>
          </div>
          <LoadingState message="Chargement du réseau d'artistes..." />
        </div>
      }
    >
      <NetworkContent />
    </Suspense>
  );
}

