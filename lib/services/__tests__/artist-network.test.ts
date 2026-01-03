import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildArtistNetworkGraph } from '../artist-network/network-builder';
import { prisma } from '../../prisma';
import { getGenreForArtist } from '../genre/genre-service';

// Mock Prisma
vi.mock('../../prisma', () => ({
  prisma: {
    listen: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    track: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../genre/genre-service', () => ({
  getGenreForArtist: vi.fn(),
}));

describe('artist-network', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGenreForArtist).mockReturnValue('Unknown');
  });

  describe('buildArtistNetworkGraph', () => {
    it('should build a network graph with nodes and edges', async () => {
      // Mock play counts
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 5 } },
      ] as any);

      // Mock tracks with artists
      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: 'Pop',
          artist: {
            id: 'artist-1',
            name: 'Artist 1',
            mbid: null,
            imageUrl: null,
          },
        },
        {
          id: 'track-2',
          artistId: 'artist-2',
          genre: 'Rock',
          artist: {
            id: 'artist-2',
            name: 'Artist 2',
            mbid: null,
            imageUrl: null,
          },
        },
      ] as any);

      // Mock listens for proximity calculation
      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph();

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].name).toBe('Artist 1');
      expect(result.nodes[0].playCount).toBe(10);
      expect(result.nodes[1].playCount).toBe(5);
      expect(result.metadata.totalArtists).toBe(2);
    });

    it('should filter artists by minPlayCount', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 2 } }, // Below minPlayCount
        { trackId: 'track-3', _count: { id: 1 } }, // Below minPlayCount
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: 'Pop',
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
        {
          id: 'track-2',
          artistId: 'artist-2',
          genre: 'Rock',
          artist: { id: 'artist-2', name: 'Artist 2', mbid: null, imageUrl: null },
        },
        {
          id: 'track-3',
          artistId: 'artist-3',
          genre: 'Jazz',
          artist: { id: 'artist-3', name: 'Artist 3', mbid: null, imageUrl: null },
        },
      ] as any);

      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph({ minPlayCount: 5 });

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].name).toBe('Artist 1');
    });

    it('should limit number of artists with maxArtists', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 8 } },
        { trackId: 'track-3', _count: { id: 5 } },
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: 'Pop',
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
        {
          id: 'track-2',
          artistId: 'artist-2',
          genre: 'Rock',
          artist: { id: 'artist-2', name: 'Artist 2', mbid: null, imageUrl: null },
        },
        {
          id: 'track-3',
          artistId: 'artist-3',
          genre: 'Jazz',
          artist: { id: 'artist-3', name: 'Artist 3', mbid: null, imageUrl: null },
        },
      ] as any);

      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph({ maxArtists: 2 });

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].playCount).toBe(10); // Highest
      expect(result.nodes[1].playCount).toBe(8); // Second highest
    });

    it('should create genre-based edges for artists with shared genres', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 8 } },
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: 'Pop', // Shared genre
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
        {
          id: 'track-2',
          artistId: 'artist-2',
          genre: 'Pop', // Shared genre
          artist: { id: 'artist-2', name: 'Artist 2', mbid: null, imageUrl: null },
        },
      ] as any);

      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph();

      expect(result.edges.length).toBeGreaterThan(0);
      const genreEdge = result.edges.find(
        (e) => e.type === 'genre' || e.type === 'both'
      );
      expect(genreEdge).toBeDefined();
      if (genreEdge) {
        expect(genreEdge.sharedGenres).toContain('Pop');
        expect(genreEdge.weight).toBeGreaterThanOrEqual(2); // Weight based on shared genres
      }
    });

    it('should create proximity-based edges for artists listened to close in time', async () => {
      const baseTime = new Date('2024-01-01T12:00:00Z');
      const proximityWindowMs = 30 * 60 * 1000; // 30 minutes

      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 8 } },
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: null,
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
        {
          id: 'track-2',
          artistId: 'artist-2',
          genre: null,
          artist: { id: 'artist-2', name: 'Artist 2', mbid: null, imageUrl: null },
        },
      ] as any);

      // Mock listens that are close in time (within proximity window)
      vi.mocked(prisma.listen.findMany).mockResolvedValue([
        {
          id: 'listen-1',
          playedAt: baseTime,
          track: {
            id: 'track-1',
            artistId: 'artist-1',
            artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
          },
        },
        {
          id: 'listen-2',
          playedAt: new Date(baseTime.getTime() + 10 * 60 * 1000), // 10 minutes later
          track: {
            id: 'track-2',
            artistId: 'artist-2',
            artist: { id: 'artist-2', name: 'Artist 2', mbid: null, imageUrl: null },
          },
        },
      ] as any);

      const result = await buildArtistNetworkGraph({
        proximityWindowMinutes: 30,
      });

      const proximityEdge = result.edges.find(
        (e) => e.type === 'proximity' || e.type === 'both'
      );
      expect(proximityEdge).toBeDefined();
      if (proximityEdge) {
        expect(proximityEdge.proximityScore).toBeGreaterThan(0);
      }
    });

    it('should filter edges by minEdgeWeight', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 8 } },
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: 'Pop',
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
        {
          id: 'track-2',
          artistId: 'artist-2',
          genre: 'Pop',
          artist: { id: 'artist-2', name: 'Artist 2', mbid: null, imageUrl: null },
        },
      ] as any);

      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph({ minEdgeWeight: 5 });

      // All edges should have weight >= 5
      result.edges.forEach((edge) => {
        expect(edge.weight).toBeGreaterThanOrEqual(5);
      });
    });

    it('should aggregate play counts for multiple tracks by the same artist', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 5 } }, // Same artist
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: 'Pop',
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
        {
          id: 'track-2',
          artistId: 'artist-1', // Same artist
          genre: 'Pop',
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
      ] as any);

      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph();

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].playCount).toBe(15); // 10 + 5
    });

    it('should use track genre when available, fallback to artist mapping', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
        { trackId: 'track-2', _count: { id: 8 } },
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: 'Pop', // Has genre
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
        {
          id: 'track-2',
          artistId: 'artist-2',
          genre: null, // No genre, should use fallback
          artist: { id: 'artist-2', name: 'Artist 2', mbid: null, imageUrl: null },
        },
      ] as any);

      vi.mocked(getGenreForArtist).mockImplementation((name) => {
        if (name === 'Artist 2') return 'Rock';
        return 'Unknown';
      });

      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph();

      expect(result.nodes[0].genre).toBe('Pop');
      expect(result.nodes[1].genre).toBe('Rock');
    });

    it('should handle empty results gracefully', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.track.findMany).mockResolvedValue([]);
      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const result = await buildArtistNetworkGraph();

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.metadata.totalArtists).toBe(0);
      expect(result.metadata.totalConnections).toBe(0);
    });

    it('should include date range in metadata when provided', async () => {
      vi.mocked(prisma.listen.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.track.findMany).mockResolvedValue([]);
      vi.mocked(prisma.listen.findMany).mockResolvedValue([]);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const result = await buildArtistNetworkGraph({ startDate, endDate });

      expect(result.metadata.dateRange).toEqual({
        start: startDate,
        end: endDate,
      });
    });

    it('should not create self-loops in proximity edges', async () => {
      const baseTime = new Date('2024-01-01T12:00:00Z');

      vi.mocked(prisma.listen.groupBy).mockResolvedValue([
        { trackId: 'track-1', _count: { id: 10 } },
      ] as any);

      vi.mocked(prisma.track.findMany).mockResolvedValue([
        {
          id: 'track-1',
          artistId: 'artist-1',
          genre: null,
          artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
        },
      ] as any);

      // Mock listens from the same artist close in time
      vi.mocked(prisma.listen.findMany).mockResolvedValue([
        {
          id: 'listen-1',
          playedAt: baseTime,
          track: {
            id: 'track-1',
            artistId: 'artist-1',
            artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
          },
        },
        {
          id: 'listen-2',
          playedAt: new Date(baseTime.getTime() + 10 * 60 * 1000),
          track: {
            id: 'track-1',
            artistId: 'artist-1', // Same artist
            artist: { id: 'artist-1', name: 'Artist 1', mbid: null, imageUrl: null },
          },
        },
      ] as any);

      const result = await buildArtistNetworkGraph();

      // Should not create edges for the same artist
      result.edges.forEach((edge) => {
        expect(edge.source).not.toBe(edge.target);
      });
    });
  });
});

