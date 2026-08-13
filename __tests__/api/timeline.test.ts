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
vi.mock('@/lib/auth/resolve-authorized-data-user-id', () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));
vi.mock("@/lib/security/analytics-rate-limit", () => ({
  assertAnalyticsRateLimit: vi.fn(),
}));
vi.mock("@/lib/services/listening/public-timeline-cached", () => ({
  getPublicProfileTimelineAllTimeCached: vi.fn(),
  getPublicProfileTimelineRangeCached: vi.fn(),
}));
vi.mock("@/lib/services/user/public-profile-access", () => ({
  isActivePublicProfileUserId: vi.fn(),
}));

import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
} from '@/lib/services/listening/listening-aggregation';
import { getListenDateRange } from '@/lib/services/listening/listening-service';
import { resolveAuthorizedDataUserId } from '@/lib/auth/resolve-authorized-data-user-id';
import {
  getPublicProfileTimelineAllTimeCached,
  getPublicProfileTimelineRangeCached,
} from '@/lib/services/listening/public-timeline-cached';
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from '@/lib/constants/public-profile';
import { isActivePublicProfileUserId } from '@/lib/services/user/public-profile-access';

describe('GET /api/timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: 'user-1',
    });
    vi.mocked(isActivePublicProfileUserId).mockResolvedValue(false);
  });

  it('should return timeline data with valid dates and default period (month)', async () => {
    const mockData = [
      {
        month: '2024-01',
        listens: 100,
        uniqueTracks: 50,
        uniqueArtists: 30,
      },
    ];

    vi.mocked(getMonthlyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      date: '2024-01',
      listens: 100,
      uniqueTracks: 50,
      uniqueArtists: 30,
    });
    expect(getMonthlyAggregatedListens).toHaveBeenCalledOnce();
    expect(response.headers.get('Cache-Control')).toContain('private');
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
    expect(response.headers.get('Cache-Control')).toContain('private');
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
    expect(response.headers.get('Cache-Control')).toContain('private');
  });

  it('should use DB date range when no dates provided (All filter)', async () => {
    const minDate = new Date('2023-01-01');
    const maxDate = new Date('2024-12-31');
    vi.mocked(getListenDateRange).mockResolvedValue({ minDate, maxDate });

    const mockData: never[] = [];
    vi.mocked(getMonthlyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest('http://localhost/api/timeline');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    expect(getListenDateRange).toHaveBeenCalledWith('user-1');
    expect(getMonthlyAggregatedListens).toHaveBeenCalledWith(
      minDate,
      maxDate,
      'user-1'
    );
    expect(response.headers.get('Cache-Control')).toContain('private');
  });

  it('should return empty array when no dates provided and no listens in DB', async () => {
    vi.mocked(getListenDateRange).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/timeline');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
    expect(getListenDateRange).toHaveBeenCalledOnce();
    expect(getMonthlyAggregatedListens).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toContain('private');
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

  it('should ignore query userId and use authenticated user', async () => {
    const mockData: never[] = [];
    vi.mocked(getMonthlyAggregatedListens).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31&userId=user123'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(getMonthlyAggregatedListens).mock.calls[0];
    expect(callArgs[2]).toBe('user-1');
    expect(response.headers.get('Cache-Control')).toContain('private');
  });

  describe('Public demo dataset (cached)', () => {
    beforeEach(() => {
      vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
        ok: true,
        userId: DEFAULT_PUBLIC_PROFILE_USER_ID,
      });
      vi.mocked(isActivePublicProfileUserId).mockResolvedValue(true);
    });

    it('uses all-time cached timeline and public Cache-Control', async () => {
      vi.mocked(getPublicProfileTimelineAllTimeCached).mockResolvedValue([
        {
          date: '2024-01-01',
          listens: 1,
          uniqueTracks: 1,
          uniqueArtists: 1,
        },
      ]);

      const request = new NextRequest('http://localhost/api/timeline');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getPublicProfileTimelineAllTimeCached).toHaveBeenCalledWith(
        DEFAULT_PUBLIC_PROFILE_USER_ID,
        'month'
      );
      expect(getListenDateRange).not.toHaveBeenCalled();
      expect(getMonthlyAggregatedListens).not.toHaveBeenCalled();
      const cc = response.headers.get('Cache-Control') ?? '';
      expect(cc).toContain('public');
      expect(cc).toContain('s-maxage=60');
    });

    it('uses range cached timeline and public Cache-Control', async () => {
      vi.mocked(getPublicProfileTimelineRangeCached).mockResolvedValue([]);

      const request = new NextRequest(
        'http://localhost/api/timeline?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getPublicProfileTimelineRangeCached).toHaveBeenCalled();
      expect(getMonthlyAggregatedListens).not.toHaveBeenCalled();
      expect(response.headers.get('Cache-Control')).toContain('public');
    });
  });

  it('should return 500 when service throws an error', async () => {
    vi.mocked(getMonthlyAggregatedListens).mockRejectedValue(
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



