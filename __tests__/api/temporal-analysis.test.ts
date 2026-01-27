import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/temporal-analysis/route';
import { NextRequest } from 'next/server';

// Mock des services
vi.mock('@/lib/services/listening/temporal-analysis', () => ({
  getTemporalAnalysis: vi.fn(),
}));

import { getTemporalAnalysis } from '@/lib/services/listening/temporal-analysis';

describe('GET /api/temporal-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return temporal analysis data with valid dates', async () => {
    const mockData = {
      byDayOfWeek: [
        {
          dayOfWeek: 1,
          dayName: 'Lundi',
          listens: 100,
          uniqueTracks: 50,
          uniqueArtists: 20,
        },
        {
          dayOfWeek: 2,
          dayName: 'Mardi',
          listens: 120,
          uniqueTracks: 60,
          uniqueArtists: 25,
        },
      ],
      byHourOfDay: [
        {
          hour: 8,
          listens: 50,
          uniqueTracks: 25,
          uniqueArtists: 10,
        },
        {
          hour: 12,
          listens: 80,
          uniqueTracks: 40,
          uniqueArtists: 15,
        },
      ],
      peakDay: {
        dayOfWeek: 2,
        dayName: 'Mardi',
        listens: 120,
        uniqueTracks: 60,
        uniqueArtists: 25,
      },
      peakHour: {
        hour: 12,
        listens: 80,
        uniqueTracks: 40,
        uniqueArtists: 15,
      },
    };

    vi.mocked(getTemporalAnalysis).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data).toHaveProperty('byDayOfWeek');
    expect(data).toHaveProperty('byHourOfDay');
    expect(data).toHaveProperty('peakDay');
    expect(data).toHaveProperty('peakHour');
    
    expect(Array.isArray(data.byDayOfWeek)).toBe(true);
    expect(Array.isArray(data.byHourOfDay)).toBe(true);
    
    expect(data.byDayOfWeek[0]).toMatchObject({
      dayOfWeek: 1,
      dayName: 'Lundi',
      listens: 100,
      uniqueTracks: 50,
      uniqueArtists: 20,
    });
    
    expect(data.peakDay).toMatchObject({
      dayOfWeek: 2,
      dayName: 'Mardi',
      listens: 120,
    });
    
    expect(data.peakHour).toMatchObject({
      hour: 12,
      listens: 80,
    });
    
    expect(getTemporalAnalysis).toHaveBeenCalledOnce();
  });

  it('should use full history (undefined dates) when no dates provided', async () => {
    const mockData = {
      byDayOfWeek: [],
      byHourOfDay: [],
      peakDay: null,
      peakHour: null,
    };

    vi.mocked(getTemporalAnalysis).mockResolvedValue(mockData);

    const request = new NextRequest('http://localhost/api/temporal-analysis');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getTemporalAnalysis).toHaveBeenCalledOnce();

    // Sans startDate/endDate, l'API passe undefined pour utiliser tout l'historique
    const callArgs = vi.mocked(getTemporalAnalysis).mock.calls[0];
    expect(callArgs[0]).toBeUndefined();
    expect(callArgs[1]).toBeUndefined();
  });

  it('should handle userId parameter', async () => {
    const mockData = {
      byDayOfWeek: [],
      byHourOfDay: [],
      peakDay: null,
      peakHour: null,
    };
    
    vi.mocked(getTemporalAnalysis).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=2024-01-01&endDate=2024-01-31&userId=user123'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const callArgs = vi.mocked(getTemporalAnalysis).mock.calls[0];
    expect(callArgs[2]).toBe('user123');
  });

  it('should return 400 for invalid date format', async () => {
    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=invalid-date'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 400 when endDate is before startDate', async () => {
    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=2024-01-31&endDate=2024-01-01'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('should return 500 when service throws an error', async () => {
    vi.mocked(getTemporalAnalysis).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  it('should correctly map null peakDay and peakHour', async () => {
    const mockData = {
      byDayOfWeek: [],
      byHourOfDay: [],
      peakDay: null,
      peakHour: null,
    };
    
    vi.mocked(getTemporalAnalysis).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.peakDay).toBeNull();
    expect(data.peakHour).toBeNull();
  });

  it('should correctly map all day of week data', async () => {
    const mockData = {
      byDayOfWeek: [
        {
          dayOfWeek: 1,
          dayName: 'Lundi',
          listens: 100,
          uniqueTracks: 50,
          uniqueArtists: 20,
        },
        {
          dayOfWeek: 2,
          dayName: 'Mardi',
          listens: 120,
          uniqueTracks: 60,
          uniqueArtists: 25,
        },
      ],
      byHourOfDay: [],
      peakDay: null,
      peakHour: null,
    };
    
    vi.mocked(getTemporalAnalysis).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.byDayOfWeek).toHaveLength(2);
    expect(data.byDayOfWeek[0]).toMatchObject({
      dayOfWeek: 1,
      dayName: 'Lundi',
      listens: 100,
      uniqueTracks: 50,
      uniqueArtists: 20,
    });
  });

  it('should correctly map all hour of day data', async () => {
    const mockData = {
      byDayOfWeek: [],
      byHourOfDay: [
        {
          hour: 8,
          listens: 50,
          uniqueTracks: 25,
          uniqueArtists: 10,
        },
        {
          hour: 12,
          listens: 80,
          uniqueTracks: 40,
          uniqueArtists: 15,
        },
      ],
      peakDay: null,
      peakHour: null,
    };
    
    vi.mocked(getTemporalAnalysis).mockResolvedValue(mockData);

    const request = new NextRequest(
      'http://localhost/api/temporal-analysis?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.byHourOfDay).toHaveLength(2);
    expect(data.byHourOfDay[0]).toMatchObject({
      hour: 8,
      listens: 50,
      uniqueTracks: 25,
      uniqueArtists: 10,
    });
  });
});
