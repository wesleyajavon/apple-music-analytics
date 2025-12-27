/**
 * Data Transfer Objects (DTOs) for artist network graph data
 */

/**
 * Represents a node (artist) in the network graph
 */
export interface ArtistNode {
  id: string; // Artist ID
  name: string; // Artist name
  genre: string; // Primary genre (or "Unknown")
  genres?: string[]; // Multiple genres if available
  playCount: number; // Total number of plays
  imageUrl?: string; // Artist image URL
  mbid?: string; // MusicBrainz ID
}

/**
 * Represents an edge (connection) between two artists in the network graph
 */
export interface ArtistEdge {
  source: string; // Source artist ID
  target: string; // Target artist ID
  weight: number; // Edge weight (strength of connection)
  type: "genre" | "proximity" | "both"; // Type of connection
  sharedGenres?: string[]; // Genres shared between artists (if type includes "genre")
  proximityScore?: number; // Proximity score (if type includes "proximity")
}

/**
 * Complete graph structure for artist network visualization
 */
export interface ArtistNetworkGraph {
  nodes: ArtistNode[];
  edges: ArtistEdge[];
  metadata: {
    totalArtists: number;
    totalConnections: number;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

/**
 * Query parameters for fetching artist network graph
 */
export interface ArtistNetworkQueryParams {
  userId?: string;
  startDate?: string; // ISO 8601 date string
  endDate?: string; // ISO 8601 date string
  minPlayCount?: number; // Minimum play count to include an artist
  maxArtists?: number; // Maximum number of artists to include
  proximityWindowMinutes?: number; // Time window for proximity-based edges (default: 30)
  minEdgeWeight?: number; // Minimum edge weight to include (default: 1)
}

