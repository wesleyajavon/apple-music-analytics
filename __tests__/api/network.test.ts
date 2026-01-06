import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/network/route';
import { NextRequest } from 'next/server';

// Mock des services
vi.mock('@/lib/services/artist-network/network-builder', () => ({
  buildArtistNetworkGraph: vi.fn(),
}));

import { buildArtistNetworkGraph } from '@/lib/services/artist-network/network-builder';

describe('GET /api/network', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return network graph without parameters', async () => {
    const mockGraph = {
      nodes: [
        { id: 'Artist 1', name: 'Artist 1', genre: 'Rock', playCount: 50 },
        { id: 'Artist 2', name: 'Artist 2', genre: 'Pop', playCount: 30 },
      ],
      edges: [
        { source: 'Artist 1', target: 'Artist 2', weight: 10, type: 'proximity' as const },
      ],
      metadata: {
        totalArtists: 2,
        totalConnections: 1,
      },
    };

    vi.mocked(buildArtistNetworkGraph).mockResolvedValue(mockGraph);

    const request = new NextRequest('http://localhost/api/network');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('nodes');
    expect(data).toHaveProperty('edges');
    expect(data).toHaveProperty('metadata');
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Array.isArray(data.edges)).toBe(true);
    expect(buildArtistNetworkGraph).toHaveBeenCalledWith({});
  });

  it('should return network graph with date range', async () => {
    const mockGraph = {
      nodes: [],
      edges: [],
      metadata: {
        totalArtists: 0,
        totalConnections: 0,
      },
    };
    vi.mocked(buildArtistNetworkGraph).mockResolvedValue(mockGraph);

    const request = new NextRequest(
      'http://localhost/api/network?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(buildArtistNetworkGraph).mock.calls[0]?.[0];
    expect(callArgs?.startDate).toBe('2024-01-01');
    expect(callArgs?.endDate).toBe('2024-01-31');
  });

  it('should handle minPlayCount parameter', async () => {
    const mockGraph = {
      nodes: [],
      edges: [],
      metadata: {
        totalArtists: 0,
        totalConnections: 0,
      },
    };
    vi.mocked(buildArtistNetworkGraph).mockResolvedValue(mockGraph);

    const request = new NextRequest(
      'http://localhost/api/network?minPlayCount=10'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(buildArtistNetworkGraph).mock.calls[0]?.[0];
    expect(callArgs?.minPlayCount).toBe(10);
  });

  it('should handle maxArtists parameter', async () => {
    const mockGraph = {
      nodes: [],
      edges: [],
      metadata: {
        totalArtists: 0,
        totalConnections: 0,
      },
    };
    vi.mocked(buildArtistNetworkGraph).mockResolvedValue(mockGraph);

    const request = new NextRequest(
      'http://localhost/api/network?maxArtists=50'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(buildArtistNetworkGraph).mock.calls[0]?.[0];
    expect(callArgs?.maxArtists).toBe(50);
  });

  it('should handle proximityWindowMinutes parameter', async () => {
    const mockGraph = {
      nodes: [],
      edges: [],
      metadata: {
        totalArtists: 0,
        totalConnections: 0,
      },
    };
    vi.mocked(buildArtistNetworkGraph).mockResolvedValue(mockGraph);

    const request = new NextRequest(
      'http://localhost/api/network?proximityWindowMinutes=60'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(buildArtistNetworkGraph).mock.calls[0]?.[0];
    expect(callArgs?.proximityWindowMinutes).toBe(60);
  });

  it('should handle minEdgeWeight parameter', async () => {
    const mockGraph = {
      nodes: [],
      edges: [],
      metadata: {
        totalArtists: 0,
        totalConnections: 0,
      },
    };
    vi.mocked(buildArtistNetworkGraph).mockResolvedValue(mockGraph);

    const request = new NextRequest(
      'http://localhost/api/network?minEdgeWeight=0.5'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(buildArtistNetworkGraph).mock.calls[0]?.[0];
    expect(callArgs?.minEdgeWeight).toBe(0.5);
  });

  it('should return 400 for invalid minPlayCount', async () => {
    const request = new NextRequest(
      'http://localhost/api/network?minPlayCount=-1'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 for invalid maxArtists', async () => {
    const request = new NextRequest(
      'http://localhost/api/network?maxArtists=0'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      'http://localhost/api/network?startDate=invalid-date'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 500 when service throws an error', async () => {
    vi.mocked(buildArtistNetworkGraph).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost/api/network');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});



