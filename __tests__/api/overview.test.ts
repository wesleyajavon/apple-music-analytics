import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/overview/route';
import { NextRequest } from 'next/server';

// Mock des services (getOverviewStats + getTopArtists car la route appelle les deux)
vi.mock('@/lib/services/listening/listening-stats', () => ({
  getOverviewStats: vi.fn(),
  getTopArtists: vi.fn(),
}));

import { getOverviewStats, getTopArtists } from '@/lib/services/listening/listening-stats';

describe('GET /api/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTopArtists).mockResolvedValue([]);
  });

  it('should return overview stats without date range', async () => {
    const mockStats = {
      totalListens: 1000,
      uniqueArtists: 150,
      uniqueTracks: 500,
      totalDuration: 3600000, // 1 hour in milliseconds
      totalPlayTime: 3600, // 1 hour in seconds
    };

    vi.mocked(getOverviewStats).mockResolvedValue(mockStats);

    const request = new NextRequest('http://localhost/api/overview');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject(mockStats);
    expect(getOverviewStats).toHaveBeenCalledWith(undefined, undefined, undefined);
  });

  it('should return overview stats with date range', async () => {
    const mockStats = {
      totalListens: 500,
      uniqueArtists: 75,
      uniqueTracks: 250,
      totalDuration: 1800000,
      totalPlayTime: 1800, // 30 minutes in seconds
    };

    vi.mocked(getOverviewStats).mockResolvedValue(mockStats);

    const request = new NextRequest(
      'http://localhost/api/overview?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject(mockStats);
    expect(getOverviewStats).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(getOverviewStats).mock.calls[0];
    expect(callArgs[0]).toBeInstanceOf(Date);
    expect(callArgs[1]).toBeInstanceOf(Date);
  });

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      'http://localhost/api/overview?startDate=invalid-date'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when endDate is before startDate', async () => {
    const request = new NextRequest(
      'http://localhost/api/overview?startDate=2024-01-31&endDate=2024-01-01'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should handle userId parameter', async () => {
    const mockStats = {
      totalListens: 200,
      uniqueArtists: 30,
      uniqueTracks: 100,
      totalDuration: 720000,
      totalPlayTime: 720, // 12 minutes in seconds
    };

    vi.mocked(getOverviewStats).mockResolvedValue(mockStats);

    const request = new NextRequest(
      'http://localhost/api/overview?userId=user123'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(getOverviewStats).mock.calls[0];
    expect(callArgs[2]).toBe('user123');
  });

  it('should return 500 when service throws an error', async () => {
    vi.mocked(getOverviewStats).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost/api/overview');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});



