import { describe, expect, it } from "vitest";
import {
  formatHubDuration,
  getHomeHubArtistDeepDive,
  getHomeHubSnapshot,
  isHomeHubOverviewTab,
  isHomeHubPage,
  isHomeHubPeriod,
} from "@/lib/utils/home-music-hub";

describe("getHomeHubSnapshot", () => {
  it("scales artists and albums with the selected period", () => {
    const week = getHomeHubSnapshot("7d");
    const month = getHomeHubSnapshot("30d");

    expect(week.listens).toBeLessThan(month.listens);
    expect(week.artists[0]?.listens).toBeLessThan(month.artists[0]?.listens ?? 0);
    expect(week.albums).toHaveLength(5);
    expect(month.artists[0]?.share).toBe(100);
  });

  it("keeps the same artist and album names across periods", () => {
    const week = getHomeHubSnapshot("7d");
    const all = getHomeHubSnapshot("all");

    expect(week.artists.map((artist) => artist.name)).toEqual(
      all.artists.map((artist) => artist.name),
    );
    expect(week.albums.map((album) => album.name)).toEqual(
      all.albums.map((album) => album.name),
    );
  });
});

describe("home music hub guards", () => {
  it("recognizes hub periods, pages, and overview tabs", () => {
    expect(isHomeHubPeriod("30d")).toBe(true);
    expect(isHomeHubPeriod("custom")).toBe(false);
    expect(isHomeHubPage("overview")).toBe(true);
    expect(isHomeHubPage("settings")).toBe(false);
    expect(isHomeHubOverviewTab("spotlight")).toBe(true);
    expect(isHomeHubOverviewTab("friends")).toBe(false);
  });

  it("formats hub duration", () => {
    expect(formatHubDuration(68, 12)).toBe("68h 12min");
  });
});

describe("getHomeHubArtistDeepDive", () => {
  it("returns scaled top tracks and relationship stats for preview artists", () => {
    const dive = getHomeHubArtistDeepDive("The Weeknd", "30d");

    expect(dive?.name).toBe("The Weeknd");
    expect(dive?.rank).toBe(1);
    expect(dive?.topTracks[0]?.title).toBe("Blinding Lights");
    expect(dive?.topTracks.length).toBe(5);
    expect(dive?.uniqueTracks).toBeGreaterThan(0);
  });

  it("returns null for unknown artists", () => {
    expect(getHomeHubArtistDeepDive("Unknown", "30d")).toBeNull();
  });
});
