import { describe, expect, it } from "vitest";
import { buildPublicDemoSoundprintSnapshot } from "../public-demo-soundprint-snapshot";

describe("buildPublicDemoSoundprintSnapshot", () => {
  it("builds snapshot from overview, genres, and temporal data", () => {
    const snapshot = buildPublicDemoSoundprintSnapshot({
      locale: "en",
      overview: {
        totalListens: 1200,
        uniqueArtists: 80,
        uniqueTracks: 240,
        totalPlayTime: 0,
        topArtists: [
          { artistId: "a1", artistName: "Drake", listenCount: 42 },
          { artistId: "a2", artistName: "Beyoncé", listenCount: 30 },
        ],
      },
      genres: {
        data: [
          { genre: "Pop", count: 400, percentage: 38 },
          { genre: "Hip-Hop", count: 250, percentage: 24 },
          { genre: "Unknown", count: 50, percentage: 5 },
        ],
        totalListens: 1200,
      },
      temporal: {
        byDayOfWeek: [],
        byHourOfDay: [],
        peakDay: { dayOfWeek: 5, listens: 200, uniqueTracks: 10, uniqueArtists: 8 },
        peakHour: { hour: 22, listens: 90, uniqueTracks: 5, uniqueArtists: 4 },
      },
    });

    expect(snapshot.topGenre?.name).toBe("Pop");
    expect(snapshot.secondGenre?.name).toBe("Hip-Hop");
    expect(snapshot.topArtist).toEqual({ name: "Drake", count: 42 });
    expect(snapshot.peakDay?.dayName).toBeTruthy();
    expect(snapshot.peakHour?.hourLabel).toBeTruthy();
    expect(snapshot.totalListens).toBe(1200);
  });
});
