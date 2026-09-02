/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import {
  SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT,
  TopThreeArtists,
} from "@/lib/components/top-three-artists-cards";

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
  const originalScrollBy = HTMLElement.prototype.scrollBy;
  const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollWidth");
  const originalScrollLeft = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollLeft");
  const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  const originalResizeObserver = globalThis.ResizeObserver;
  const scrollBy = vi.fn();

  beforeEach(() => {
    scrollBy.mockReset();
    HTMLElement.prototype.scrollBy = scrollBy;
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return 900;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return 3000;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
      configurable: true,
      get() {
        return 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 280;
      },
    });
    globalThis.ResizeObserver = class {
      callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe() {
        this.callback([] as unknown as ResizeObserverEntry[], this);
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    HTMLElement.prototype.scrollBy = originalScrollBy;
    if (originalClientWidth) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
    }
    if (originalScrollWidth) {
      Object.defineProperty(HTMLElement.prototype, "scrollWidth", originalScrollWidth);
    }
    if (originalScrollLeft) {
      Object.defineProperty(HTMLElement.prototype, "scrollLeft", originalScrollLeft);
    }
    if (originalOffsetWidth) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
    }
    globalThis.ResizeObserver = originalResizeObserver;
  });

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

  it("renders up to 10 artists in a left-right carousel", () => {
    render(
      <TopThreeArtists
        artists={Array.from({ length: 12 }, (_, index) => makeArtist(index + 1))}
        maxListens={200}
        t={t}
        locale="en-US"
        onArtistSelect={vi.fn()}
        layout="carousel"
        maxArtists={SPOTLIGHT_ARTISTS_CAROUSEL_LIMIT}
        previousLabel="Show previous artists"
        nextLabel="Show next artists"
        carouselLabel="Artist spotlight carousel"
      />
    );

    expect(screen.getByRole("region", { name: "Artist spotlight carousel" })).toBeInTheDocument();
    expect(screen.getByLabelText("Open insights for Artist 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Open insights for Artist 10")).toBeInTheDocument();
    expect(screen.queryByLabelText("Open insights for Artist 11")).toBeNull();

    expect(screen.getByRole("button", { name: "Show previous artists" })).toBeDisabled();
    const next = screen.getByRole("button", { name: "Show next artists" });
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(scrollBy).toHaveBeenCalledWith({ left: 304, behavior: "smooth" });
  });
});
