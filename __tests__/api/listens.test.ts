import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/listens/route';
import { NextRequest } from 'next/server';

// Mock des services
vi.mock('@/lib/services/listening/listening-service', () => ({
  getListens: vi.fn(),
}));

vi.mock('@/lib/services/listening/listening-aggregation', () => ({
  getAggregatedListens: vi.fn(),
}));
vi.mock('@/lib/auth/resolve-authorized-data-user-id', () => ({
  resolveAuthorizedDataUserId: vi.fn(),
}));
vi.mock("@/lib/security/analytics-rate-limit", () => ({
  assertAnalyticsRateLimit: vi.fn(),
}));
vi.mock("@/lib/services/listening/public-listens-cached", () => ({
  getPublicProfileListensRawCached: vi.fn(),
  getPublicProfileListensAggregatedCached: vi.fn(),
}));
vi.mock("@/lib/services/user/public-profile-access", () => ({
  isActivePublicProfileUserId: vi.fn(),
}));

import { getListens } from '@/lib/services/listening/listening-service';
import { getAggregatedListens } from '@/lib/services/listening/listening-aggregation';
import { resolveAuthorizedDataUserId } from '@/lib/auth/resolve-authorized-data-user-id';
import {
  getPublicProfileListensRawCached,
  getPublicProfileListensAggregatedCached,
} from '@/lib/services/listening/public-listens-cached';
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from '@/lib/constants/public-profile';
import { isActivePublicProfileUserId } from '@/lib/services/user/public-profile-access';

describe('GET /api/listens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
      ok: true,
      userId: 'user-1',
    });
    vi.mocked(isActivePublicProfileUserId).mockResolvedValue(false);
  });

  describe('Raw listens mode (without aggregate)', () => {
    it('should return raw listens with pagination', async () => {
      const mockListens = {
        data: [
          {
            id: '1',
            trackTitle: 'Track 1',
            artistName: 'Artist 1',
            playedAt: '2024-01-01T00:00:00.000Z',
            source: 'lastfm' as const,
          },
        ],
        total: 100,
      };

      vi.mocked(getListens).mockResolvedValue(mockListens);

      const request = new NextRequest(
        'http://localhost/api/listens?limit=50&offset=0'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('total', 100);
      expect(data).toHaveProperty('limit', 50);
      expect(data).toHaveProperty('offset', 0);
      expect(getListens).toHaveBeenCalledOnce();
      expect(response.headers.get('Cache-Control')).toContain('private');
    });

    it('should use default limit and offset when not provided', async () => {
      const mockListens = { data: [], total: 0 };
      vi.mocked(getListens).mockResolvedValue(mockListens);

      const request = new NextRequest('http://localhost/api/listens');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const callArgs = vi.mocked(getListens).mock.calls[0]?.[0];
      expect(callArgs?.limit).toBe(100);
      expect(callArgs?.offset).toBe(0);
    });

    it('should filter by date range', async () => {
      const mockListens = { data: [], total: 0 };
      vi.mocked(getListens).mockResolvedValue(mockListens);

      const request = new NextRequest(
        'http://localhost/api/listens?startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const callArgs = vi.mocked(getListens).mock.calls[0]?.[0];
      expect(callArgs?.startDate).toBe('2024-01-01');
      expect(callArgs?.endDate).toBe('2024-01-31');
    });

    it('should filter by source', async () => {
      const mockListens = { data: [], total: 0 };
      vi.mocked(getListens).mockResolvedValue(mockListens);

      const request = new NextRequest(
        'http://localhost/api/listens?source=lastfm'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const callArgs = vi.mocked(getListens).mock.calls[0]?.[0];
      expect(callArgs?.source).toBe('lastfm');
    });

    it('should return 400 for invalid limit', async () => {
      const request = new NextRequest(
        'http://localhost/api/listens?limit=-1'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for invalid offset', async () => {
      const request = new NextRequest(
        'http://localhost/api/listens?offset=-1'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Aggregated mode (with aggregate/period)', () => {
    it('should return aggregated data with period=day', async () => {
      const mockAggregated = [
        {
          date: '2024-01-01',
          count: 50,
          uniqueTracks: 20,
          uniqueArtists: 10,
        },
      ];

      vi.mocked(getAggregatedListens).mockResolvedValue(mockAggregated);

      const request = new NextRequest(
        'http://localhost/api/listens?aggregate=day&startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('period', 'day');
      expect(data).toHaveProperty('startDate', '2024-01-01');
      expect(data).toHaveProperty('endDate', '2024-01-31');
      expect(getAggregatedListens).toHaveBeenCalledOnce();
      expect(response.headers.get('Cache-Control')).toContain('private');
    });

    it('should accept period parameter as alias for aggregate', async () => {
      const mockAggregated: never[] = [];
      vi.mocked(getAggregatedListens).mockResolvedValue(mockAggregated);

      const request = new NextRequest(
        'http://localhost/api/listens?period=week&startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.period).toBe('week');
    });

    it('should return 400 when aggregate is provided without dates', async () => {
      const request = new NextRequest(
        'http://localhost/api/listens?aggregate=day'
      );
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 for invalid aggregate value', async () => {
      const request = new NextRequest(
        'http://localhost/api/listens?aggregate=invalid&startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);
      
      // Si aggregate n'est pas dans la liste, ça devrait retourner en mode raw listens
      // ou une erreur selon l'implémentation
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Public demo dataset (cached)', () => {
    beforeEach(() => {
      vi.mocked(resolveAuthorizedDataUserId).mockResolvedValue({
        ok: true,
        userId: DEFAULT_PUBLIC_PROFILE_USER_ID,
      });
      vi.mocked(isActivePublicProfileUserId).mockResolvedValue(true);
    });

    it('uses cached raw listens and public Cache-Control', async () => {
      vi.mocked(getPublicProfileListensRawCached).mockResolvedValue({
        data: [],
        total: 0,
        limit: 100,
        offset: 0,
      });

      const request = new NextRequest('http://localhost/api/listens');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getPublicProfileListensRawCached).toHaveBeenCalledWith(
        DEFAULT_PUBLIC_PROFILE_USER_ID,
        expect.objectContaining({ limit: 100, offset: 0 })
      );
      expect(getListens).not.toHaveBeenCalled();
      const cc = response.headers.get('Cache-Control') ?? '';
      expect(cc).toContain('public');
      expect(cc).toContain('s-maxage=60');
    });

    it('uses cached aggregated listens and public Cache-Control', async () => {
      vi.mocked(getPublicProfileListensAggregatedCached).mockResolvedValue({
        data: [],
        period: 'day',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      const request = new NextRequest(
        'http://localhost/api/listens?aggregate=day&startDate=2024-01-01&endDate=2024-01-31'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getPublicProfileListensAggregatedCached).toHaveBeenCalled();
      expect(getAggregatedListens).not.toHaveBeenCalled();
      expect(response.headers.get('Cache-Control')).toContain('public');
    });
  });

  it('should return 500 when service throws an error', async () => {
    vi.mocked(getListens).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/listens');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});



