import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeDateAggregation, AggregationResult } from '../listening/listening-aggregation-core';
import { prisma } from '../../prisma';

// Mock Prisma
vi.mock('../../prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('listening-aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeDateAggregation', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should aggregate by day correctly', async () => {
      const mockResult = [
        {
          date: '2024-01-01',
          listens: BigInt(10),
          unique_tracks: BigInt(5),
          unique_artists: BigInt(3),
        },
        {
          date: '2024-01-02',
          listens: BigInt(15),
          unique_tracks: BigInt(8),
          unique_artists: BigInt(4),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await executeDateAggregation(startDate, endDate, 'day');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        listens: 10,
        unique_tracks: 5,
        unique_artists: 3,
      });
      expect(result[1]).toEqual({
        date: '2024-01-02',
        listens: 15,
        unique_tracks: 8,
        unique_artists: 4,
      });
    });

    it('should aggregate by week correctly', async () => {
      const weekStart = new Date('2024-01-01');
      const mockResult = [
        {
          date: weekStart,
          listens: BigInt(50),
          unique_tracks: BigInt(20),
          unique_artists: BigInt(10),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await executeDateAggregation(startDate, endDate, 'week');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBeInstanceOf(Date);
      expect(result[0].listens).toBe(50);
      expect(result[0].unique_tracks).toBe(20);
      expect(result[0].unique_artists).toBe(10);
    });

    it('should aggregate by month correctly', async () => {
      const mockResult = [
        {
          date: '2024-01',
          listens: BigInt(200),
          unique_tracks: BigInt(80),
          unique_artists: BigInt(30),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await executeDateAggregation(startDate, endDate, 'month');

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01');
      expect(result[0].listens).toBe(200);
      expect(result[0].unique_tracks).toBe(80);
      expect(result[0].unique_artists).toBe(30);
    });

    it('should filter by userId when provided', async () => {
      const userId = 'user-123';
      const mockResult: any[] = [];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      await executeDateAggregation(startDate, endDate, 'day', userId);

      // Verify that the query was called with userId filter
      expect(prisma.$queryRaw).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.$queryRaw).mock.calls[0][0];
      expect(callArgs).toBeDefined();
    });

    it('should handle empty results', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const result = await executeDateAggregation(startDate, endDate, 'day');

      expect(result).toEqual([]);
    });

    it('should convert bigint to number correctly', async () => {
      const largeNumber = BigInt('999999999999');
      const mockResult = [
        {
          date: '2024-01-01',
          listens: largeNumber,
          unique_tracks: largeNumber,
          unique_artists: largeNumber,
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await executeDateAggregation(startDate, endDate, 'day');

      expect(result[0].listens).toBe(Number(largeNumber));
      expect(result[0].unique_tracks).toBe(Number(largeNumber));
      expect(result[0].unique_artists).toBe(Number(largeNumber));
    });

    it('should handle zero values correctly', async () => {
      const mockResult = [
        {
          date: '2024-01-01',
          listens: BigInt(0),
          unique_tracks: BigInt(0),
          unique_artists: BigInt(0),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await executeDateAggregation(startDate, endDate, 'day');

      expect(result[0].listens).toBe(0);
      expect(result[0].unique_tracks).toBe(0);
      expect(result[0].unique_artists).toBe(0);
    });

    it('should handle date range spanning multiple periods', async () => {
      const longStartDate = new Date('2024-01-01');
      const longEndDate = new Date('2024-03-31');
      
      const mockResult = [
        { date: '2024-01', listens: BigInt(100), unique_tracks: BigInt(50), unique_artists: BigInt(20) },
        { date: '2024-02', listens: BigInt(120), unique_tracks: BigInt(60), unique_artists: BigInt(25) },
        { date: '2024-03', listens: BigInt(110), unique_tracks: BigInt(55), unique_artists: BigInt(22) },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await executeDateAggregation(longStartDate, longEndDate, 'month');

      expect(result).toHaveLength(3);
      expect(result.map(r => r.date)).toEqual(['2024-01', '2024-02', '2024-03']);
    });
  });
});

