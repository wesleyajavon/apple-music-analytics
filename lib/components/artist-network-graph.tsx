"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ArtistNetworkGraph } from "../dto/artist-network";
import * as d3 from "d3";

// Dynamic import pour éviter les problèmes SSR avec react-force-graph
const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default),
  { ssr: false }
);

interface ArtistNetworkGraphProps {
  data: ArtistNetworkGraph;
  width?: number;
  height?: number;
}

export function ArtistNetworkGraphComponent({
  data,
  width = 1200,
  height = 800,
}: ArtistNetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Gérer les dimensions responsive
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

    return () => {
      resizeObserver.disconnect();
    };
  }, [height]);

  // Limiter à 20 nœuds pour les performances
  const MAX_NODES = 20;
  const limitedData = useMemo(() => {
    const limitedNodes = data.nodes.slice(0, MAX_NODES);
    const limitedNodeIds = new Set(limitedNodes.map((n) => n.id));
    const limitedEdges = data.edges.filter(
      (edge) =>
        limitedNodeIds.has(edge.source) && limitedNodeIds.has(edge.target)
    );

    return {
      nodes: limitedNodes,
      edges: limitedEdges,
    };
  }, [data.nodes, data.edges]);

  // Préparer les données pour react-force-graph
  const graphData = useMemo(() => {
    // Créer une échelle de couleurs par genre
    const genres = Array.from(
      new Set(limitedData.nodes.map((n) => n.genre))
    ).filter((g) => g !== "Unknown");
    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(genres)
      .range(d3.schemeCategory10);

    // Créer une échelle de taille par play count
    const playCounts = limitedData.nodes.map((n) => n.playCount);
    const minPlayCount = Math.min(...playCounts);
    const maxPlayCount = Math.max(...playCounts);
    const sizeScale = d3
      .scaleSqrt()
      .domain([minPlayCount, maxPlayCount])
      .range([3, 15]);

    // Créer une échelle d'épaisseur pour les arêtes
    const weights = limitedData.edges.map((e) => e.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const edgeWidthScale = d3
      .scaleLinear()
      .domain([minWeight, maxWeight])
      .range([1, 4]);

    return {
      nodes: limitedData.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        genre: node.genre,
        playCount: node.playCount,
        color: colorScale(node.genre) || "#999",
        size: sizeScale(node.playCount),
      })),
      links: limitedData.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        type: edge.type,
        strokeWidth: edgeWidthScale(edge.weight),
      })),
    };
  }, [limitedData]);

  if (!graphData.nodes.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px] text-gray-500">
        Aucun nœud à afficher
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[600px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 overflow-hidden"
    >
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel={(node: any) =>
          `<div style="padding: 8px; background: rgba(0,0,0,0.8); color: white; border-radius: 4px;">
            <strong>${node.name}</strong><br/>
            Genre: ${node.genre}<br/>
            Plays: ${node.playCount}
          </div>`
        }
        nodeColor={(node: any) => node.color}
        nodeVal={(node: any) => node.size}
        linkColor={() => "rgba(150, 150, 150, 0.6)"}
        linkWidth={(link: any) => link.strokeWidth}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.25}
        onNodeHover={(node: any) => {
          // Highlight connected nodes on hover
          if (node) {
            // This will be handled by react-force-graph automatically
          }
        }}
        cooldownTicks={100}
        onEngineStop={() => {
          // Graph has stabilized
        }}
      />
    </div>
  );
}
