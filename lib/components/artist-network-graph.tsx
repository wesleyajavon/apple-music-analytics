"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import * as d3 from "d3";
import { ArtistNetworkGraph, ArtistNode, ArtistEdge } from "../dto/artist-network";

// Type pour les nœuds dans la simulation D3 (combine ArtistNode avec SimulationNodeDatum)
type SimulationNode = ArtistNode & d3.SimulationNodeDatum;

// Type pour les arêtes dans la simulation D3
type SimulationEdge = d3.SimulationLinkDatum<SimulationNode> & ArtistEdge;

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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationEdge> | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const focusedNodeRef = useRef<string | null>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Memoize color scale by genre
  const colorScale = useMemo(() => {
    const genres = Array.from(new Set(data.nodes.map((n) => n.genre))).filter(
      (g) => g !== "Unknown"
    );
    return d3
      .scaleOrdinal<string>()
      .domain(genres)
      .range(d3.schemeCategory10);
  }, [data.nodes]);

  // Memoize size scale by play count
  const sizeScale = useMemo(() => {
    const playCounts = data.nodes.map((n) => n.playCount);
    const min = Math.min(...playCounts);
    const max = Math.max(...playCounts);
    return d3.scaleSqrt().domain([min, max]).range([4, 20]);
  }, [data.nodes]);

  // Memoize edge width scale
  const edgeWidthScale = useMemo(() => {
    const weights = data.edges.map((e) => e.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    return d3.scaleLinear().domain([min, max]).range([1, 4]);
  }, [data.edges]);

  // Detect clusters using D3's force clusters
  const clusters = useMemo(() => {
    // Use a simple clustering algorithm based on connected components
    const visited = new Set<string>();
    const clusterMap = new Map<string, number>();
    let clusterId = 0;

    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();
    data.nodes.forEach((node) => adjacency.set(node.id, new Set()));
    data.edges.forEach((edge) => {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    });

    // DFS to find connected components
    const dfs = (nodeId: string, cluster: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      clusterMap.set(nodeId, cluster);
      adjacency.get(nodeId)?.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, cluster);
        }
      });
    };

    data.nodes.forEach((node) => {
      if (!visited.has(node.id)) {
        dfs(node.id, clusterId++);
      }
    });

    return clusterMap;
  }, [data.nodes, data.edges]);

  // Handle responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const calculatedWidth = Math.max(containerWidth - 32, 800); // Min 800px, padding 32px
        const calculatedHeight = Math.max((calculatedWidth * 2) / 3, 600); // 3:2 aspect ratio, min 600px
        setDimensions({ width: calculatedWidth, height: calculatedHeight });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize and update the visualization
  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create container for zoom/pan
    const container = svg
      .append("g")
      .attr("class", "network-container");

    // Set up zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform.toString());
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3
      .forceSimulation<SimulationNode>(data.nodes as SimulationNode[])
      .force(
        "link",
        d3
          .forceLink<SimulationNode, SimulationEdge>(data.edges as SimulationEdge[])
          .id((d) => d.id)
          .distance((d) => {
            // Distance based on edge weight (stronger connections = closer)
            return 100 - Math.min(d.weight * 10, 80);
          })
          .strength((d) => d.weight * 0.1)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide<SimulationNode>().radius((d: SimulationNode) => sizeScale(d.playCount) + 5));

    simulationRef.current = simulation;

    // Create edges
    const edges = container
      .append("g")
      .attr("class", "edges")
      .selectAll<SVGLineElement, SimulationEdge>("line")
      .data(data.edges as SimulationEdge[])
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => edgeWidthScale(d.weight))
      .attr("class", "edge");

    // Create nodes
    const nodes = container
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGCircleElement, SimulationNode>("circle")
      .data(data.nodes as SimulationNode[])
      .enter()
      .append("circle")
      .attr("r", (d) => sizeScale(d.playCount))
      .attr("fill", (d) => colorScale(d.genre) || "#ccc")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGCircleElement, SimulationNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Create labels
    const labels = container
      .append("g")
      .attr("class", "labels")
      .selectAll<SVGTextElement, SimulationNode>("text")
      .data(data.nodes as SimulationNode[])
      .enter()
      .append("text")
      .text((d) => d.name)
      .attr("font-size", "12px")
      .attr("dx", (d) => sizeScale(d.playCount) + 5)
      .attr("dy", 4)
      .attr("fill", "#333")
      .attr("class", "label")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "network-tooltip")
      .style("position", "absolute")
      .style("padding", "8px 12px")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", "1000");

    // Helper function to highlight connected nodes
    const highlightConnected = (nodeId: string | null) => {
      if (!nodeId) {
        // Reset all
        nodes.style("opacity", 1);
        edges.style("opacity", 0.6);
        labels.style("opacity", 0);
        return;
      }

      const connectedNodeIds = new Set<string>([nodeId]);
      data.edges.forEach((edge) => {
        const sourceId = typeof edge.source === "string" 
          ? edge.source 
          : (edge.source as SimulationNode).id;
        const targetId = typeof edge.target === "string" 
          ? edge.target 
          : (edge.target as SimulationNode).id;
        
        if (sourceId === nodeId || targetId === nodeId) {
          connectedNodeIds.add(sourceId);
          connectedNodeIds.add(targetId);
        }
      });

      nodes.style("opacity", (d) =>
        connectedNodeIds.has(d.id) ? 1 : 0.1
      );
      edges.style("opacity", (e) => {
        const sourceId = typeof e.source === "string" 
          ? e.source 
          : (e.source as SimulationNode).id;
        const targetId = typeof e.target === "string" 
          ? e.target 
          : (e.target as SimulationNode).id;
        return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId)
          ? 0.9
          : 0.05;
      });
      labels.style("opacity", (d) =>
        connectedNodeIds.has(d.id) ? 1 : 0
      );
    };

    // Helper function to highlight cluster
    const highlightCluster = (nodeId: string | null) => {
      if (!nodeId) {
        nodes.style("stroke-width", 2);
        return;
      }

      const clusterId = clusters.get(nodeId);
      if (clusterId === undefined) return;

      nodes.style("stroke-width", (d) =>
        clusters.get(d.id) === clusterId ? 4 : 2
      );
    };

    // Mouse events for nodes
    nodes
      .on("mouseover", function (event, d) {
        hoveredNodeRef.current = d.id;
        highlightConnected(d.id);
        highlightCluster(d.id);

        // Show tooltip
        tooltip
          .style("opacity", 1)
          .html(
            `<div><strong>${d.name}</strong></div>
             <div>Genre: ${d.genre}</div>
             <div>Plays: ${d.playCount}</div>
             <div>Cluster: ${clusters.get(d.id) ?? "N/A"}</div>`
          );

        // Highlight this node
        d3.select(this).attr("stroke-width", 4);
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 10}px`);
      })
      .on("mouseout", function (event, d) {
        if (focusedNodeRef.current !== d.id) {
          hoveredNodeRef.current = null;
          highlightConnected(null);
          highlightCluster(null);
          tooltip.style("opacity", 0);
          d3.select(this).attr("stroke-width", 2);
        }
      })
      .on("click", function (event, d) {
        event.stopPropagation();
        if (focusedNodeRef.current === d.id) {
          // Unfocus
          focusedNodeRef.current = null;
          highlightConnected(null);
          highlightCluster(null);
          d3.select(this).attr("stroke-width", 2);
        } else {
          // Focus on this node
          focusedNodeRef.current = d.id;
          highlightConnected(d.id);
          highlightCluster(d.id);
          d3.select(this).attr("stroke-width", 4);
        }
      });

    // Click on background to unfocus
    svg.on("click", () => {
      if (focusedNodeRef.current) {
        focusedNodeRef.current = null;
        highlightConnected(null);
        highlightCluster(null);
        nodes.attr("stroke-width", 2);
      }
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      edges
        .attr("x1", (d) => {
          const source = typeof d.source === "object" && d.source !== null
            ? d.source as SimulationNode
            : data.nodes.find((n) => n.id === (d.source as string)) as SimulationNode | undefined;
          return source?.x ?? 0;
        })
        .attr("y1", (d) => {
          const source = typeof d.source === "object" && d.source !== null
            ? d.source as SimulationNode
            : data.nodes.find((n) => n.id === (d.source as string)) as SimulationNode | undefined;
          return source?.y ?? 0;
        })
        .attr("x2", (d) => {
          const target = typeof d.target === "object" && d.target !== null
            ? d.target as SimulationNode
            : data.nodes.find((n) => n.id === (d.target as string)) as SimulationNode | undefined;
          return target?.x ?? 0;
        })
        .attr("y2", (d) => {
          const target = typeof d.target === "object" && d.target !== null
            ? d.target as SimulationNode
            : data.nodes.find((n) => n.id === (d.target as string)) as SimulationNode | undefined;
          return target?.y ?? 0;
        });

      nodes.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);

      labels
        .attr("x", (d) => d.x ?? 0)
        .attr("y", (d) => d.y ?? 0);
    });

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
      svg.on("click", null);
    };
  }, [data, dimensions.width, dimensions.height, colorScale, sizeScale, edgeWidthScale, clusters]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[600px]">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      <style jsx global>{`
        .network-tooltip {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
}

