import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/genres/route';
import { NextRequest } from 'next/server';

// Mock des services
vi.mock('@/lib/services/listening/listening-stats', () => ({
  getGenreDistribution: vi.fn(),
  getTopArtistsForGenres: vi.fn(),
}));
vi.mock('@/lib/auth/require-auth-user-id', () => ({
  requireAuthenticatedUserId: vi.fn().mockResolvedValue('user-1'),
  unauthorizedResponse: vi.fn(),
}));

import {
  getGenreDistribution,
  getTopArtistsForGenres,
} from '@/lib/services/listening/listening-stats';

describe('GET /api/genres', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTopArtistsForGenres).mockResolvedValue([]);
  });

  it('should return genre distribution without date range', async () => {
    const mockGenreCounts = [
      { genre: 'Rock', count: 300 },
      { genre: 'Pop', count: 200 },
      { genre: 'Jazz', count: 100 },
    ];

    vi.mocked(getGenreDistribution).mockResolvedValue(mockGenreCounts);

    const request = new NextRequest('http://localhost/api/genres');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('totalListens', 600);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data).toHaveLength(3);
    expect(data.data[0]).toMatchObject({
      genre: 'Rock',
      count: 300,
      percentage: 50,
    });
    expect(data.data[1].genre).toBe('Pop');
    expect(data.data[1].count).toBe(200);
    expect(data.data[1].percentage).toBeCloseTo(33.333333333333336, 10); // 200/600 * 100
    expect(data.topArtistsForTopGenres).toEqual([]);
  });

  it('should return genre distribution with date range', async () => {
    const mockGenreCounts = [
      { genre: 'Rock', count: 150 },
      { genre: 'Pop', count: 100 },
    ];

    vi.mocked(getGenreDistribution).mockResolvedValue(mockGenreCounts);

    const request = new NextRequest(
      'http://localhost/api/genres?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('totalListens', 250);
    expect(getGenreDistribution).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(getGenreDistribution).mock.calls[0];
    expect(callArgs[0]).toBeInstanceOf(Date);
    expect(callArgs[1]).toBeInstanceOf(Date);
  });

  it('should calculate percentage correctly (0% when totalListens is 0)', async () => {
    const mockGenreCounts: Array<{ genre: string; count: number }> = [];

    vi.mocked(getGenreDistribution).mockResolvedValue(mockGenreCounts);

    const request = new NextRequest('http://localhost/api/genres');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.totalListens).toBe(0);
    expect(data.data).toHaveLength(0);
  });

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      'http://localhost/api/genres?startDate=invalid-date'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when endDate is before startDate', async () => {
    const request = new NextRequest(
      'http://localhost/api/genres?startDate=2024-01-31&endDate=2024-01-01'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should use authenticated user id', async () => {
    const mockGenreCounts = [{ genre: 'Rock', count: 100 }];
    vi.mocked(getGenreDistribution).mockResolvedValue(mockGenreCounts);

    const request = new NextRequest('http://localhost/api/genres');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(getGenreDistribution).mock.calls[0];
    expect(callArgs[2]).toBe('user-1');
  });

  it('should return 500 when service throws an error', async () => {
    vi.mocked(getGenreDistribution).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost/api/genres');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});



