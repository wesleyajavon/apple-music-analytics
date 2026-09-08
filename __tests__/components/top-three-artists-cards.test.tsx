/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { TopThreeArtists } from "@/lib/components/top-three-artists-cards";
import {
  SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT,
  SpotlightArtistsFeaturedList,
} from "@/lib/components/spotlight-artists-featured-list";

vi.mock("@/lib/hooks/use-artist-spotify-image-resolution", () => ({
  useArtistSpotifyImageResolution: () => null,
}));

function makeArtist(index: number): ArtistStatsDto {
  return {
    artistId: `artist-${index}`,
    artistName: `Artist ${index}`,
    imageUrl: null,
    listenCount: 200 - index,
    uniqueTracks: 4,
    firstListenDate: "2024-01-01T00:00:00.000Z",
    lastListenDate: "2024-06-01T00:00:00.000Z",
    totalPlayTime: 3600,
  };
}

const t = (key: string, values?: Record<string, string | number>) => {
  if (key === "artistInsightsAriaOpen") return `Open insights for ${values?.name ?? ""}`;
  if (key === "listensCount") return "streams";
  if (key === "signatureSoundUnavailable") return "No signature track";
  return key;
};

describe("TopThreeArtists", () => {
  it("keeps the artists page grid to the top 3", () => {
    render(
      <TopThreeArtists
        artists={Array.from({ length: 8 }, (_, index) => makeArtist(index + 1))}
        maxListens={200}
        t={t}
        locale="en-US"
      />
    );

    expect(screen.getByText("Artist 1")).toBeInTheDocument();
    expect(screen.getByText("Artist 3")).toBeInTheDocument();
    expect(screen.queryByText("Artist 4")).toBeNull();
    expect(screen.queryByRole("region")).toBeNull();
  });
});

describe("SpotlightArtistsFeaturedList", () => {
  it("shows four tiles per page with visible names and pages through 1–10", () => {
    const onArtistSelect = vi.fn();
    render(
      <SpotlightArtistsFeaturedList
        artists={Array.from({ length: 12 }, (_, index) => makeArtist(index + 1))}
        t={t}
        locale="en-US"
        onArtistSelect={onArtistSelect}
        maxArtists={SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT}
        pageRangeLabel={(start, end) => `${start}–${end}`}
        pagesNavLabel="Artist pages"
        previousPageLabel="Previous artists"
        nextPageLabel="Next artists"
      />
    );

    expect(screen.getByText("Artist 1")).toBeInTheDocument();
    expect(screen.getByText("Artist 4")).toBeInTheDocument();
    expect(screen.queryByText("Artist 5")).toBeNull();
    expect(screen.queryByText("Artist 11")).toBeNull();
    expect(document.querySelectorAll("[data-spotlight-artist-tile]")).toHaveLength(4);
    expect(document.querySelector("[data-spotlight-artist-card]")).toBeNull();
    expect(document.querySelector("[data-spotlight-featured]")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "5–8" }));
    expect(screen.getByText("Artist 5")).toBeInTheDocument();
    expect(screen.getByText("Artist 8")).toBeInTheDocument();
    expect(screen.queryByText("Artist 1")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "9–10" }));
    expect(screen.getByText("Artist 9")).toBeInTheDocument();
    expect(screen.getByText("Artist 10")).toBeInTheDocument();
    expect(screen.queryByText("Artist 11")).toBeNull();
    expect(document.querySelectorAll("[data-spotlight-artist-tile]")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Open insights for Artist 9" }));
    expect(onArtistSelect).toHaveBeenCalledWith(expect.objectContaining({ artistId: "artist-9" }), 8);
  });
});
