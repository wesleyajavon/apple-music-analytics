import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDailyAggregatedListens,
  getWeeklyAggregatedListens,
  getMonthlyAggregatedListens,
  getGenreDistribution,
  getOverviewStats,
} from '../listening';
import { executeDateAggregation } from '../listening-aggregation';
import { prisma } from '../../prisma';

// Mock dependencies
vi.mock('../../prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock('../listening-aggregation', () => ({
  executeDateAggregation: vi.fn(),
}));

describe('listening service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDailyAggregatedListens', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should return daily aggregated listens correctly', async () => {
      const mockAggregation = [
        {
          date: '2024-01-01',
          listens: 10,
          unique_tracks: 5,
          unique_artists: 3,
        },
        {
          date: '2024-01-02',
          listens: 15,
          unique_tracks: 8,
          unique_artists: 4,
        },
      ];

      vi.mocked(executeDateAggregation).mockResolvedValue(mockAggregation);

      const result = await getDailyAggregatedListens(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        listens: 10,
        uniqueTracks: 5,
        uniqueArtists: 3,
      });
      expect(executeDateAggregation).toHaveBeenCalledWith(startDate, endDate, 'day', undefined);
    });

    it('should filter by userId when provided', async () => {
      const userId = 'user-123';
      vi.mocked(executeDateAggregation).mockResolvedValue([]);

      await getDailyAggregatedListens(startDate, endDate, userId);

      expect(executeDateAggregation).toHaveBeenCalledWith(startDate, endDate, 'day', userId);
    });

    it('should handle empty results', async () => {
      vi.mocked(executeDateAggregation).mockResolvedValue([]);

      const result = await getDailyAggregatedListens(startDate, endDate);

      expect(result).toEqual([]);
    });
  });

  describe('getWeeklyAggregatedListens', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should group daily data into weeks correctly', async () => {
      const dailyData = [
        { date: '2024-01-01', listens: 10, uniqueTracks: 5, uniqueArtists: 3 },
        { date: '2024-01-02', listens: 15, uniqueTracks: 8, uniqueArtists: 4 },
        { date: '2024-01-08', listens: 20, uniqueTracks: 10, uniqueArtists: 5 },
      ];

      const weeklyAggregations = [
        {
          date: new Date('2024-01-01'), // Monday
          listens: 25,
          unique_tracks: 13,
          unique_artists: 7,
        },
        {
          date: new Date('2024-01-08'), // Next Monday
          listens: 20,
          unique_tracks: 10,
          unique_artists: 5,
        },
      ];

      // Mock both calls: first for daily, then for weekly
      vi.mocked(executeDateAggregation)
        .mockResolvedValueOnce(dailyData.map(d => ({
          date: d.date,
          listens: d.listens,
          unique_tracks: d.uniqueTracks,
          unique_artists: d.uniqueArtists,
        })))
        .mockResolvedValueOnce(weeklyAggregations);

      const result = await getWeeklyAggregatedListens(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0].listens).toBe(25);
      expect(result[0].dailyBreakdown).toHaveLength(2); // Should include 2024-01-01 and 2024-01-02
      expect(result[1].dailyBreakdown).toHaveLength(1); // Should include 2024-01-08
    });

    it('should handle weeks with missing daily data', async () => {
      const dailyData: any[] = [];
      const weeklyAggregations = [
        {
          date: new Date('2024-01-01'),
          listens: 0,
          unique_tracks: 0,
          unique_artists: 0,
        },
      ];

      vi.mocked(executeDateAggregation)
        .mockResolvedValueOnce(dailyData)
        .mockResolvedValueOnce(weeklyAggregations);

      const result = await getWeeklyAggregatedListens(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].dailyBreakdown).toEqual([]);
    });
  });

  describe('getMonthlyAggregatedListens', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should group daily data into months correctly', async () => {
      const dailyData = [
        { date: '2024-01-01', listens: 10, uniqueTracks: 5, uniqueArtists: 3 },
        { date: '2024-01-15', listens: 20, uniqueTracks: 10, uniqueArtists: 5 },
        { date: '2024-01-31', listens: 15, uniqueTracks: 8, uniqueArtists: 4 },
      ];

      const monthlyAggregations = [
        {
          date: '2024-01',
          listens: 45,
          unique_tracks: 23,
          unique_artists: 12,
        },
      ];

      vi.mocked(executeDateAggregation)
        .mockResolvedValueOnce(dailyData.map(d => ({
          date: d.date,
          listens: d.listens,
          unique_tracks: d.uniqueTracks,
          unique_artists: d.uniqueArtists,
        })))
        .mockResolvedValueOnce(monthlyAggregations);

      const result = await getMonthlyAggregatedListens(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].month).toBe('2024-01');
      expect(result[0].listens).toBe(45);
      expect(result[0].dailyBreakdown.length).toBeGreaterThan(0);
    });

    it('should handle months with varying number of days (February leap year)', async () => {
      const febStartDate = new Date('2024-02-01');
      const febEndDate = new Date('2024-02-29'); // 2024 is a leap year

      const dailyData: any[] = [];
      const monthlyAggregations = [
        {
          date: '2024-02',
          listens: 0,
          unique_tracks: 0,
          unique_artists: 0,
        },
      ];

      vi.mocked(executeDateAggregation)
        .mockResolvedValueOnce(dailyData)
        .mockResolvedValueOnce(monthlyAggregations);

      const result = await getMonthlyAggregatedListens(febStartDate, febEndDate);

      expect(result).toHaveLength(1);
      // February 2024 has 29 days
      expect(result[0].dailyBreakdown.length).toBeLessThanOrEqual(29);
    });
  });

  describe('getGenreDistribution', () => {
    it('should return genre distribution correctly', async () => {
      const mockResult = [
        { genre: 'Pop', count: BigInt(100) },
        { genre: 'Rock', count: BigInt(50) },
        { genre: 'Unknown', count: BigInt(25) },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await getGenreDistribution();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ genre: 'Pop', count: 100 });
      expect(result[1]).toEqual({ genre: 'Rock', count: 50 });
      expect(result[2]).toEqual({ genre: 'Unknown', count: 25 });
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      await getGenreDistribution(startDate, endDate);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should filter by userId when provided', async () => {
      const userId = 'user-123';
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      await getGenreDistribution(undefined, undefined, userId);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);

      const result = await getGenreDistribution();

      expect(result).toEqual([]);
    });

    it('should convert bigint to number correctly', async () => {
      const largeNumber = BigInt('999999999');
      const mockResult = [{ genre: 'Pop', count: largeNumber }];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await getGenreDistribution();

      expect(result[0].count).toBe(Number(largeNumber));
    });
  });

  describe('getOverviewStats', () => {
    it('should return overview statistics correctly', async () => {
      const mockResult = [
        {
          total_listens: BigInt(1000),
          unique_tracks: BigInt(500),
          unique_artists: BigInt(100),
          total_play_time: BigInt(360000), // 100 hours in seconds
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await getOverviewStats();

      expect(result).toEqual({
        totalListens: 1000,
        uniqueTracks: 500,
        uniqueArtists: 100,
        totalPlayTime: 360000,
      });
    });

    it('should handle zero values correctly', async () => {
      const mockResult = [
        {
          total_listens: BigInt(0),
          unique_tracks: BigInt(0),
          unique_artists: BigInt(0),
          total_play_time: BigInt(0),
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await getOverviewStats();

      expect(result).toEqual({
        totalListens: 0,
        uniqueTracks: 0,
        uniqueArtists: 0,
        totalPlayTime: 0,
      });
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          total_listens: BigInt(100),
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
          total_play_time: BigInt(3600),
        },
      ]);

      await getOverviewStats(startDate, endDate);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should filter by userId when provided', async () => {
      const userId = 'user-123';
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          total_listens: BigInt(100),
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
          total_play_time: BigInt(3600),
        },
      ]);

      await getOverviewStats(undefined, undefined, userId);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should handle null total_play_time (COALESCE to 0)', async () => {
      // When all durations are NULL, SUM returns NULL, but COALESCE converts it to 0
      const mockResult = [
        {
          total_listens: BigInt(100),
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
          total_play_time: BigInt(0), // COALESCE converts NULL to 0
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await getOverviewStats();

      expect(result.totalPlayTime).toBe(0);
    });

    it('should handle very large numbers correctly', async () => {
      const largeNumber = BigInt('999999999999');
      const mockResult = [
        {
          total_listens: largeNumber,
          unique_tracks: largeNumber,
          unique_artists: largeNumber,
          total_play_time: largeNumber,
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockResult);

      const result = await getOverviewStats();

      expect(result.totalListens).toBe(Number(largeNumber));
      expect(result.uniqueTracks).toBe(Number(largeNumber));
      expect(result.uniqueArtists).toBe(Number(largeNumber));
      expect(result.totalPlayTime).toBe(Number(largeNumber));
    });
  });
});

