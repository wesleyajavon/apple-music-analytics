import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/timeline/route';
import { NextRequest } from 'next/server';

// Mock des services
vi.mock('@/lib/services/listening/listening-aggregation', () => ({
  getDailyAggregatedListens: vi.fn(),
  getWeeklyAggregatedListens: vi.fn(),
  getMonthlyAggregatedListens: vi.fn(),
}));
vi.mock('@/lib/services/listening/listening-service', () => ({
  getListenDateRange: vi.fn(),
}));

import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from '@/lib/services/listening/listening-aggregation';
import { getListenDateRange } from '@/lib/services/listening/listening-service';

describe('GET /api/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return timeline data with valid dates and default period (day)', async () => {
    const mockData = [
      {
        date: '2024-01-01',
        listens: 10,
        uniqueTracks: 5,
        uniqueArtists: 3,
      },
      {
        date: '2024-01-02',
        listens: 15,
        uniqueTracks: 8,
        uniqueArtists: 4,
      },
    ];

    vi.mocked(getDailyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      date: '2024-01-01',
      listens: 10,
      uniqueTracks: 5,
      uniqueArtists: 3,
    });
    expect(getDailyAggregatedListens).toHaveBeenCalledOnce();
  });

  it('should return timeline data with period=week', async () => {
    const mockData = [
      {
        weekStart: '2024-01-01',
        weekEnd: '2024-01-07',
        listens: 50,
        uniqueTracks: 20,
        uniqueArtists: 10,
        dailyBreakdown: [],
      },
    ];

    vi.mocked(getWeeklyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31&period=week'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({
      date: '2024-01-01',
      listens: 50,
      uniqueTracks: 20,
      uniqueArtists: 10,
    });
    expect(getWeeklyAggregatedListens).toHaveBeenCalledOnce();
  });

  it('should return timeline data with period=month', async () => {
    const mockData = [
      {
        month: '2024-01',
        listens: 200,
        uniqueTracks: 80,
        uniqueArtists: 40,
        dailyBreakdown: [],
      },
    ];

    vi.mocked(getMonthlyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-03-31&period=month'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toMatchObject({
      date: '2024-01',
      listens: 200,
      uniqueTracks: 80,
      uniqueArtists: 40,
    });
    expect(getMonthlyAggregatedListens).toHaveBeenCalledOnce();
  });

  it('should use DB date range when no dates provided (All filter)', async () => {
    const minDate = new Date('2023-01-01');
    const maxDate = new Date('2024-12-31');
    vi.mocked(getListenDateRange).mockResolvedValue({ minDate, maxDate });

    const mockData: never[] = [];
    vi.mocked(getDailyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest('http://localhost/api/timeline');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    expect(getListenDateRange).toHaveBeenCalledWith(undefined);
    expect(getDailyAggregatedListens).toHaveBeenCalledWith(
      minDate,
      maxDate,
      undefined
    );
  });

  it('should return empty array when no dates provided and no listens in DB', async () => {
    vi.mocked(getListenDateRange).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/timeline');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
    expect(getListenDateRange).toHaveBeenCalledOnce();
    expect(getDailyAggregatedListens).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=invalid-date'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when endDate is before startDate', async () => {
    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-31&endDate=2024-01-01'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should handle userId parameter', async () => {
    const mockData: never[] = [];
    vi.mocked(getDailyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31&userId=user123'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(getDailyAggregatedListens).mock.calls[0];
    expect(callArgs[2]).toBe('user123');
  });

  it('should return 500 when service throws an error', async () => {
    vi.mocked(getDailyAggregatedListens).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});



