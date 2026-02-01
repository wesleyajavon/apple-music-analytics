"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useArtistNetwork } from "@/lib/hooks/use-network";
import {
  ArtistNetworkGraphComponent,
  type EdgeTypeFilter,
} from "@/lib/components/artist-network-graph";
import { ErrorState } from "@/lib/components/error-state";
import { EmptyState, emptyStatePresets } from "@/lib/components/empty-state";
import { NetworkGraphSkeleton } from "@/lib/components/skeleton-loaders";
import type { ArtistNetworkGraph } from "@/lib/dto/artist-network";

const MAX_ARTISTS_OPTIONS = [15, 30, 50, 100] as const;
const PROXIMITY_OPTIONS = [15, 30, 60] as const;

const DEFAULT_EDGE_TYPE_FILTER: EdgeTypeFilter = {
  genre: true,
  proximity: true,
  both: true,
};

function useNetworkSearchParams() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get("startDate") ?? undefined;
  const endDate = searchParams.get("endDate") ?? undefined;
  const minPlayCount = searchParams.get("minPlayCount")
    ? Math.max(1, parseInt(searchParams.get("minPlayCount")!, 10) || 1)
    : 1;
  const rawMax = searchParams.get("maxArtists");
  const maxArtists = rawMax
    ? (MAX_ARTISTS_OPTIONS as readonly number[]).includes(parseInt(rawMax, 10))
      ? parseInt(rawMax, 10) as (typeof MAX_ARTISTS_OPTIONS)[number]
      : 30
    : 30;
  const rawProx = searchParams.get("proximityWindowMinutes");
  const proximityWindowMinutes = rawProx
    ? (PROXIMITY_OPTIONS as readonly number[]).includes(parseInt(rawProx, 10))
      ? parseInt(rawProx, 10) as (typeof PROXIMITY_OPTIONS)[number]
      : 30
    : 30;
  const minEdgeWeight = searchParams.get("minEdgeWeight")
    ? Math.max(0, parseInt(searchParams.get("minEdgeWeight")!, 10) || 0)
    : 1;
  return {
    startDate,
    endDate,
    minPlayCount,
    maxArtists,
    proximityWindowMinutes,
    minEdgeWeight,
  };
}

function egoSubgraph(graph: ArtistNetworkGraph, focusId: string): ArtistNetworkGraph {
  const neighborIds = new Set<string>([focusId]);
  for (const e of graph.edges) {
    if (e.source === focusId || e.target === focusId) {
      neighborIds.add(e.source);
      neighborIds.add(e.target);
    }
  }
  const nodes = graph.nodes.filter((n) => neighborIds.has(n.id));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = graph.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );
  return {
    nodes,
    edges,
    metadata: {
      totalArtists: nodes.length,
      totalConnections: edges.length,
      dateRange: graph.metadata.dateRange,
    },
  };
}

function NetworkContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useNetworkSearchParams();

  const [edgeTypeFilter, setEdgeTypeFilter] = useState<EdgeTypeFilter>(DEFAULT_EDGE_TYPE_FILTER);
  const [fitViewTrigger, setFitViewTrigger] = useState(0);
  const [focusArtistId, setFocusArtistId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useArtistNetwork({
    startDate: params.startDate,
    endDate: params.endDate,
    minPlayCount: params.minPlayCount,
    maxArtists: params.maxArtists,
    proximityWindowMinutes: params.proximityWindowMinutes,
    minEdgeWeight: params.minEdgeWeight,
  });

  const updateParam = useCallback(
    (key: string, value: string | number) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set(key, String(value));
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const toggleEdgeType = useCallback((k: keyof EdgeTypeFilter) => {
    setEdgeTypeFilter((prev) => ({ ...prev, [k]: !prev[k] }));
  }, []);

  const displayData = useMemo(() => {
    if (!data) return data;
    if (!focusArtistId || !data.nodes.some((n) => n.id === focusArtistId)) {
      return data;
    }
    return egoSubgraph(data, focusArtistId);
  }, [data, focusArtistId]);

  const statsMeta = displayData?.metadata ?? data?.metadata;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Réseau d&apos;artistes
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Visualisation des connexions entre vos artistes écoutés (genres partagés
          et proximité d&apos;écoute). Utilisez la barre de période en haut pour
          filtrer par dates.
        </p>
        {statsMeta && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>
              <strong>{statsMeta.totalArtists}</strong> artistes
              {focusArtistId && " (vue ego)"}
            </span>
            <span>
              <strong>{statsMeta.totalConnections}</strong> connexions
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <NetworkGraphSkeleton />
      ) : error ? (
        <ErrorState
          error={error}
          message="Impossible de charger le réseau d'artistes"
          onRetry={() => refetch()}
        />
      ) : !data || data.nodes.length === 0 ? (
        <EmptyState {...emptyStatePresets.noNetwork} />
      ) : (
        <>
          {/* Contrôles (roadmap §2, §7) */}
          <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="maxArtists" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Top N artistes
                </label>
                <select
                  id="maxArtists"
                  value={params.maxArtists}
                  onChange={(e) => updateParam("maxArtists", e.target.value)}
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  {MAX_ARTISTS_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="minPlayCount" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Min. écoutes
                </label>
                <input
                  id="minPlayCount"
                  type="number"
                  min={1}
                  max={200}
                  value={params.minPlayCount}
                  onChange={(e) => updateParam("minPlayCount", e.target.value || "1")}
                  className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="proximityWindow" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Fenêtre proximité (min)
                </label>
                <select
                  id="proximityWindow"
                  value={params.proximityWindowMinutes}
                  onChange={(e) => updateParam("proximityWindowMinutes", e.target.value)}
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                >
                  {PROXIMITY_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="minEdgeWeight" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Min. poids arête
                </label>
                <input
                  id="minEdgeWeight"
                  type="number"
                  min={0}
                  max={20}
                  value={params.minEdgeWeight}
                  onChange={(e) => updateParam("minEdgeWeight", e.target.value || "0")}
                  className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label htmlFor="focusArtist" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Focus artiste
                  </label>
                  <select
                    id="focusArtist"
                    value={focusArtistId ?? ""}
                    onChange={(e) => setFocusArtistId(e.target.value || null)}
                    className="min-w-[180px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Tout le réseau</option>
                    {data.nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
                {focusArtistId && (
                  <button
                    type="button"
                    onClick={() => setFocusArtistId(null)}
                    className="rounded-md border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    Voir tout le réseau
                  </button>
                )}
              </div>
              <div className="ml-auto flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Connexions :</span>
                  <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={edgeTypeFilter.genre}
                      onChange={() => toggleEdgeType("genre")}
                      className="rounded border-gray-400"
                    />
                    Genre
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={edgeTypeFilter.proximity}
                      onChange={() => toggleEdgeType("proximity")}
                      className="rounded border-gray-400"
                    />
                    Proximité
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={edgeTypeFilter.both}
                      onChange={() => toggleEdgeType("both")}
                      className="rounded border-gray-400"
                    />
                    Les deux
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setFitViewTrigger((t) => t + 1)}
                  className="rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Vue d&apos;ensemble
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-2">
                <strong>Instructions :</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Survolez un nœud pour voir ses connexions et métriques</li>
                <li>Survolez une arête pour voir le type de lien (genre / proximité)</li>
                <li>Molette pour zoomer, glisser pour déplacer, déplacer un nœud pour le repositionner</li>
                <li>Utilisez « Vue d&apos;ensemble » pour recentrer le graphe</li>
              </ul>
            </div>
            <div className="w-full" style={{ height: "800px", minHeight: "600px" }}>
              <ArtistNetworkGraphComponent
                data={displayData!}
                width={1200}
                height={800}
                maxNodes={focusArtistId ? displayData!.nodes.length : params.maxArtists}
                edgeTypeFilter={edgeTypeFilter}
                proximityWindowMinutes={params.proximityWindowMinutes}
                fitViewTrigger={fitViewTrigger}
              />
            </div>
          </div>
        </>
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
          <NetworkGraphSkeleton />
        </div>
      }
    >
      <NetworkContent />
    </Suspense>
  );
}
