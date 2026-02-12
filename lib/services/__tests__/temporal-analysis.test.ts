import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTemporalAnalysis } from '../listening/temporal-analysis';
import { prisma } from '../../prisma';

// Mock Prisma
vi.mock('../../prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('temporal-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTemporalAnalysis', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should return temporal analysis with day of week and hour of day aggregations', async () => {
      // Mock pour les jours de la semaine (DOW: 0 = dimanche, 1 = lundi, etc.)
      const mockDayOfWeekResult = [
        {
          day_of_week: 1, // Lundi
          listens: BigInt(100),
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
        },
        {
          day_of_week: 2, // Mardi
          listens: BigInt(120),
          unique_tracks: BigInt(60),
          unique_artists: BigInt(25),
        },
        {
          day_of_week: 5, // Vendredi
          listens: BigInt(150),
          unique_tracks: BigInt(70),
          unique_artists: BigInt(30),
        },
      ];

      // Mock pour les heures de la journée
      const mockHourOfDayResult = [
        {
          hour: 8,
          listens: BigInt(50),
          unique_tracks: BigInt(25),
          unique_artists: BigInt(10),
        },
        {
          hour: 12,
          listens: BigInt(80),
          unique_tracks: BigInt(40),
          unique_artists: BigInt(15),
        },
        {
          hour: 18,
          listens: BigInt(100),
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
        },
      ];

      // Mock les deux appels $queryRaw (un pour day of week, un pour hour of day)
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockDayOfWeekResult as any)
        .mockResolvedValueOnce(mockHourOfDayResult as any);

      const result = await getTemporalAnalysis(startDate, endDate);

      // Vérifier la structure du résultat
      expect(result).toHaveProperty('byDayOfWeek');
      expect(result).toHaveProperty('byHourOfDay');
      expect(result).toHaveProperty('peakDay');
      expect(result).toHaveProperty('peakHour');

      // Vérifier que tous les jours de la semaine sont présents (même avec 0 écoutes)
      expect(result.byDayOfWeek).toHaveLength(7);
      
      // Vérifier que les jours avec des écoutes sont correctement formatés
      const monday = result.byDayOfWeek.find(d => d.dayOfWeek === 1);
      expect(monday).toBeDefined();
      expect(monday?.listens).toBe(100);
      expect(monday?.uniqueTracks).toBe(50);
      expect(monday?.uniqueArtists).toBe(20);

      // Vérifier que tous les jours sont présents et commencent par lundi (dayOfWeek 1)
      expect(result.byDayOfWeek[0].dayOfWeek).toBe(1);
      expect(result.byDayOfWeek[6].dayOfWeek).toBe(0);

      // Vérifier que toutes les heures sont présentes (0-23)
      expect(result.byHourOfDay).toHaveLength(24);
      
      // Vérifier que les heures avec des écoutes sont correctement formatées
      const hour8 = result.byHourOfDay.find(h => h.hour === 8);
      expect(hour8).toBeDefined();
      expect(hour8?.listens).toBe(50);
      expect(hour8?.uniqueTracks).toBe(25);
      expect(hour8?.uniqueArtists).toBe(10);

      // Vérifier que le jour de pic est identifié (Vendredi dayOfWeek 5 avec 150 écoutes)
      expect(result.peakDay).toBeDefined();
      expect(result.peakDay?.dayOfWeek).toBe(5);
      expect(result.peakDay?.listens).toBe(150);

      // Vérifier que l'heure de pic est identifiée (18h avec 100 écoutes)
      expect(result.peakHour).toBeDefined();
      expect(result.peakHour?.hour).toBe(18);
      expect(result.peakHour?.listens).toBe(100);
    });

    it('should handle empty results correctly', async () => {
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getTemporalAnalysis(startDate, endDate);

      // Vérifier que tous les jours sont présents avec 0 écoutes
      expect(result.byDayOfWeek).toHaveLength(7);
      expect(result.byDayOfWeek.every(d => d.listens === 0)).toBe(true);

      // Vérifier que toutes les heures sont présentes avec 0 écoutes
      expect(result.byHourOfDay).toHaveLength(24);
      expect(result.byHourOfDay.every(h => h.listens === 0)).toBe(true);

      // Vérifier que peakDay et peakHour sont null
      expect(result.peakDay).toBeNull();
      expect(result.peakHour).toBeNull();
    });

    it('should filter by userId when provided', async () => {
      const userId = 'user-123';
      
      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await getTemporalAnalysis(startDate, endDate, userId);

      // Vérifier que les deux requêtes ont été appelées
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
      
      // Vérifier que les requêtes contiennent le filtre userId
      const calls = vi.mocked(prisma.$queryRaw).mock.calls;
      expect(calls.length).toBe(2);
    });

    it('should correctly identify peak day when multiple days have same max listens', async () => {
      const mockDayOfWeekResult = [
        {
          day_of_week: 1, // Lundi
          listens: BigInt(100),
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
        },
        {
          day_of_week: 2, // Mardi
          listens: BigInt(100), // Même nombre d'écoutes
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
        },
      ];

      const mockHourOfDayResult: any[] = [];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockDayOfWeekResult as any)
        .mockResolvedValueOnce(mockHourOfDayResult);

      const result = await getTemporalAnalysis(startDate, endDate);

      // Le premier jour avec le max devrait être sélectionné (Lundi)
      expect(result.peakDay).toBeDefined();
      expect(result.peakDay?.listens).toBe(100);
    });

    it('should correctly identify peak hour when multiple hours have same max listens', async () => {
      const mockDayOfWeekResult: any[] = [];

      const mockHourOfDayResult = [
        {
          hour: 12,
          listens: BigInt(100),
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
        },
        {
          hour: 18,
          listens: BigInt(100), // Même nombre d'écoutes
          unique_tracks: BigInt(50),
          unique_artists: BigInt(20),
        },
      ];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockDayOfWeekResult)
        .mockResolvedValueOnce(mockHourOfDayResult as any);

      const result = await getTemporalAnalysis(startDate, endDate);

      // La première heure avec le max devrait être sélectionnée (12h)
      expect(result.peakHour).toBeDefined();
      expect(result.peakHour?.hour).toBe(12);
      expect(result.peakHour?.listens).toBe(100);
    });

    it('should convert bigint to number correctly', async () => {
      const largeNumber = BigInt('999999999999');
      const mockDayOfWeekResult = [
        {
          day_of_week: 1,
          listens: largeNumber,
          unique_tracks: largeNumber,
          unique_artists: largeNumber,
        },
      ];

      const mockHourOfDayResult: any[] = [];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockDayOfWeekResult as any)
        .mockResolvedValueOnce(mockHourOfDayResult);

      const result = await getTemporalAnalysis(startDate, endDate);

      const monday = result.byDayOfWeek.find(d => d.dayOfWeek === 1);
      expect(monday?.listens).toBe(Number(largeNumber));
      expect(monday?.uniqueTracks).toBe(Number(largeNumber));
      expect(monday?.uniqueArtists).toBe(Number(largeNumber));
    });

    it('should order days of week starting with Monday', async () => {
      const mockDayOfWeekResult = [
        {
          day_of_week: 0, // Dimanche
          listens: BigInt(10),
          unique_tracks: BigInt(5),
          unique_artists: BigInt(2),
        },
        {
          day_of_week: 1, // Lundi
          listens: BigInt(20),
          unique_tracks: BigInt(10),
          unique_artists: BigInt(5),
        },
      ];

      const mockHourOfDayResult: any[] = [];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockDayOfWeekResult as any)
        .mockResolvedValueOnce(mockHourOfDayResult);

      const result = await getTemporalAnalysis(startDate, endDate);

      // Vérifier que l'ordre commence par lundi (dayOfWeek 1)
      expect(result.byDayOfWeek[0].dayOfWeek).toBe(1);
      expect(result.byDayOfWeek[1].dayOfWeek).toBe(2);
      expect(result.byDayOfWeek[6].dayOfWeek).toBe(0);
    });

    it('should include all hours from 0 to 23', async () => {
      const mockDayOfWeekResult: any[] = [];
      const mockHourOfDayResult = [
        {
          hour: 5,
          listens: BigInt(30),
          unique_tracks: BigInt(15),
          unique_artists: BigInt(8),
        },
        {
          hour: 15,
          listens: BigInt(40),
          unique_tracks: BigInt(20),
          unique_artists: BigInt(10),
        },
      ];

      vi.mocked(prisma.$queryRaw)
        .mockResolvedValueOnce(mockDayOfWeekResult)
        .mockResolvedValueOnce(mockHourOfDayResult as any);

      const result = await getTemporalAnalysis(startDate, endDate);

      // Vérifier que toutes les heures sont présentes
      expect(result.byHourOfDay).toHaveLength(24);
      
      // Vérifier que les heures sont dans l'ordre (0-23)
      for (let i = 0; i < 24; i++) {
        expect(result.byHourOfDay[i].hour).toBe(i);
      }

      // Vérifier que les heures avec des écoutes ont les bonnes valeurs
      expect(result.byHourOfDay[5].listens).toBe(30);
      expect(result.byHourOfDay[15].listens).toBe(40);
      
      // Vérifier que les heures sans écoutes ont 0
      expect(result.byHourOfDay[0].listens).toBe(0);
      expect(result.byHourOfDay[23].listens).toBe(0);
    });
  });
});
