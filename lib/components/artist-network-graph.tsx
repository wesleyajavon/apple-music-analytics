"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { ArtistNetworkGraph } from "../dto/artist-network";
import * as d3 from "d3";

// Couleurs des arêtes par type (roadmap)
const EDGE_COLORS = {
  genre: "rgba(37, 99, 235, 0.85)",   // blue
  proximity: "rgba(234, 88, 12, 0.85)", // orange
  both: "rgba(124, 58, 237, 0.85)",    // violet
} as const;

// Dynamic import pour éviter les problèmes SSR avec react-force-graph
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default),
  { ssr: false }
);

export interface EdgeTypeFilter {
  genre: boolean;
  proximity: boolean;
  both: boolean;
}

const DEFAULT_EDGE_TYPE_FILTER: EdgeTypeFilter = {
  genre: true,
  proximity: true,
  both: true,
};

interface ArtistNetworkGraphProps {
  data: ArtistNetworkGraph;
  width?: number;
  height?: number;
  maxNodes?: number;
  edgeTypeFilter?: EdgeTypeFilter;
  proximityWindowMinutes?: number;
  /** Incrémenter pour déclencher zoom "Vue d'ensemble" (évite ref + dynamic) */
  fitViewTrigger?: number;
}

interface GraphNode extends Record<string, unknown> {
  id: string;
  name: string;
  genre: string;
  playCount: number;
  color: string;
  size: number;
  degree: number;
  edgeCountByGenre: number;
  edgeCountByProximity: number;
}

interface GraphLink extends Record<string, unknown> {
  source: string;
  target: string;
  weight: number;
  type: "genre" | "proximity" | "both";
  strokeWidth: number;
  sharedGenres?: string[];
  proximityScore?: number;
}

function formatLinkLabel(link: GraphLink, proximityWindowMinutes?: number): string {
  const parts: string[] = [];
  if (link.type === "genre" || link.type === "both") {
    const genres = (link.sharedGenres || []).join(", ") || "—";
    parts.push(`Genre : ${genres}`);
  }
  if (link.type === "proximity" || link.type === "both") {
    const n = link.proximityScore ?? link.weight;
    const window = proximityWindowMinutes ?? 30;
    parts.push(`Écoutés à moins de ${window} min d'intervalle : ${n} fois`);
  }
  return parts.join(" · ");
}

export function ArtistNetworkGraphComponent({
  data,
  width = 1200,
  height = 800,
  maxNodes = 30,
  edgeTypeFilter = DEFAULT_EDGE_TYPE_FILTER,
  proximityWindowMinutes = 30,
  fitViewTrigger = 0,
}: ArtistNetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{ zoomToFit?: (durationMs?: number, padding?: number) => void } | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Vue d'ensemble au clic sur le bouton (trigger évite ref + dynamic)
  useEffect(() => {
    if (fitViewTrigger > 0) {
      (fgRef.current as any)?.zoomToFit?.(400, 40);
    }
  }, [fitViewTrigger]);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const calculatedWidth = Math.max(containerWidth - 32, 800);
        const calculatedHeight = Math.max(height, 600);
        setDimensions({ width: calculatedWidth, height: calculatedHeight });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  const limitedData = useMemo(() => {
    const limitedNodes = data.nodes.slice(0, maxNodes);
    const limitedNodeIds = new Set(limitedNodes.map((n) => n.id));
    let limitedEdges = data.edges.filter(
      (e) => limitedNodeIds.has(e.source) && limitedNodeIds.has(e.target)
    );
    limitedEdges = limitedEdges.filter((e) => edgeTypeFilter[e.type]);
    return { nodes: limitedNodes, edges: limitedEdges };
  }, [data.nodes, data.edges, maxNodes, edgeTypeFilter]);

  const graphData = useMemo(() => {
    const genres = Array.from(new Set(limitedData.nodes.map((n) => n.genre))).filter((g) => g !== "Unknown");
    const colorScale = d3.scaleOrdinal<string>().domain(genres).range(d3.schemeCategory10);
    const playCounts = limitedData.nodes.map((n) => n.playCount);
    const minP = Math.min(...playCounts);
    const maxP = Math.max(...playCounts);
    const sizeScale = d3.scaleSqrt().domain([minP, maxP]).range([3, 15]);
    const weights = limitedData.edges.map((e) => e.weight);
    const minW = weights.length ? Math.min(...weights) : 1;
    const maxW = weights.length ? Math.max(...weights) : 1;
    const edgeWidthScale = d3.scaleLinear().domain([minW, maxW]).range([1, 4]);

    const nodeIds = new Set(limitedData.nodes.map((n) => n.id));
    const degreeByNode = new Map<string, { total: number; genre: number; proximity: number }>();
    for (const n of limitedData.nodes) {
      degreeByNode.set(n.id, { total: 0, genre: 0, proximity: 0 });
    }
    for (const e of limitedData.edges) {
      const g = e.type === "genre" || e.type === "both" ? 1 : 0;
      const p = e.type === "proximity" || e.type === "both" ? 1 : 0;
      for (const id of [e.source, e.target]) {
        if (!nodeIds.has(id)) continue;
        const d = degreeByNode.get(id)!;
        d.total += 1;
        d.genre += g;
        d.proximity += p;
      }
    }

    const nodes: GraphNode[] = limitedData.nodes.map((node) => {
      const deg = degreeByNode.get(node.id) ?? { total: 0, genre: 0, proximity: 0 };
      return {
        id: node.id,
        name: node.name,
        genre: node.genre,
        playCount: node.playCount,
        color: colorScale(node.genre) || "#999",
        size: sizeScale(node.playCount),
        degree: deg.total,
        edgeCountByGenre: deg.genre,
        edgeCountByProximity: deg.proximity,
      };
    });

    const links: GraphLink[] = limitedData.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      type: edge.type,
      strokeWidth: edgeWidthScale(edge.weight),
      sharedGenres: edge.sharedGenres,
      proximityScore: edge.proximityScore,
    }));

    return { nodes, links };
  }, [limitedData]);

  const handleRef = useCallback((instance: unknown) => {
    fgRef.current = instance as { zoomToFit?: (d?: number, p?: number) => void } | null;
  }, []);

  if (!graphData.nodes.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] text-gray-500 dark:text-gray-400">
        Aucun nœud à afficher
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden"
    >
      <ForceGraph2D
        ref={handleRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel={(node: GraphNode) => {
          const hub = node.degree >= 5 ? " • Hub" : "";
          const conn =
            node.degree > 0
              ? ` • ${node.degree} connexion(s) (${node.edgeCountByGenre} genre, ${node.edgeCountByProximity} proximité)`
              : "";
          return `<div style="padding: 8px; background: rgba(0,0,0,0.88); color: white; border-radius: 4px; max-width: 220px;">
            <strong>${node.name}</strong>${hub}<br/>
            Genre : ${node.genre}<br/>
            Écoutes : ${node.playCount}${conn}
          </div>`;
        }}
        nodeColor={(node: GraphNode) => node.color}
        nodeVal={(node: GraphNode) => node.size}
        linkColor={(link: GraphLink) => EDGE_COLORS[link.type]}
        linkWidth={(link: GraphLink) => link.strokeWidth}
        linkLabel={(link: GraphLink) =>
          `<div style="padding: 6px 8px; background: rgba(0,0,0,0.88); color: white; border-radius: 4px; max-width: 260px;">
            ${formatLinkLabel(link, proximityWindowMinutes)}
          </div>`
        }
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.25}
        cooldownTicks={100}
      />
      {/* Légende fixe (roadmap §1 et §7) */}
      <div
        className="absolute bottom-3 left-3 z-10 rounded-md border border-gray-200 dark:border-gray-600 bg-white/95 dark:bg-gray-800/95 px-3 py-2 shadow text-xs text-gray-700 dark:text-gray-300"
        aria-label="Légende des types de connexion"
      >
        <div className="font-medium mb-1.5">Connexions</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ backgroundColor: EDGE_COLORS.genre }}
            />
            <span>Genre partagé</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ backgroundColor: EDGE_COLORS.proximity }}
            />
            <span>Proximité d&apos;écoute</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ backgroundColor: EDGE_COLORS.both }}
            />
            <span>Genre + proximité</span>
          </div>
        </div>
      </div>
    </div>
  );
}
