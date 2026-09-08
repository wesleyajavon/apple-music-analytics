/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import type { ArtistStatsDto } from "@/lib/dto/artist";
import { TopThreeArtistsOverviewWidget } from "@/lib/components/top-three-artists-overview-widget";

vi.mock("@/lib/hooks/use-artist-spotify-image-resolution", () => ({
  useArtistSpotifyImageResolution: () => null,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en-US",
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, string | number>) => {
    if (namespace === "overview") {
      if (key === "artistSpotlight.badge") return "Artist spotlight";
      if (key === "artistSpotlight.title") return "The artists carrying your rotation.";
      if (key === "artistSpotlight.description") return "Up to ten artists from this period.";
      if (key === "artistSpotlight.pageRange") return `${values?.start}–${values?.end}`;
      if (key === "artistSpotlight.pagesNav") return "Artist pages";
      if (key === "artistSpotlight.previousPage") return "Previous artists";
      if (key === "artistSpotlight.nextPage") return "Next artists";
      if (key === "seeAll") return "See all";
    }
    if (namespace === "artists") {
      if (key === "mobile.emptyTitle") return "No artists yet";
      if (key === "errorLoading") return "Could not load artists";
      if (key === "listensCount") return "streams";
      if (key === "signatureSoundUnavailable") return "No signature track";
      if (key === "artistInsightsAriaOpen") return "Open insights";
    }
    return key;
  },
}));

vi.mock("@/lib/context/dashboard-viewer-context", () => ({
  useDashboardViewerUserId: () => "demo-user",
}));

const artists: ArtistStatsDto[] = [
  {
    artistId: "artist-1",
    artistName: "Artist 1",
    imageUrl: null,
    listenCount: 120,
    uniqueTracks: 4,
    firstListenDate: "2024-01-01T00:00:00.000Z",
    lastListenDate: "2024-06-01T00:00:00.000Z",
    totalPlayTime: 3600,
  },
  {
    artistId: "artist-2",
    artistName: "Artist 2",
    imageUrl: null,
    listenCount: 80,
    uniqueTracks: 3,
    firstListenDate: "2024-01-01T00:00:00.000Z",
    lastListenDate: "2024-06-01T00:00:00.000Z",
    totalPlayTime: 1800,
  },
];

vi.mock("@/lib/hooks/use-artists", () => ({
  useArtistStats: () => ({
    data: { topArtists: artists },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe("TopThreeArtistsOverviewWidget", () => {
  it("renders a canvas section without a card shell", () => {
    const { container } = render(
      <TopThreeArtistsOverviewWidget startDate="2024-01-01" endDate="2024-06-01" />
    );

    expect(container.innerHTML).not.toContain("rounded-[2rem]");
    expect(container.innerHTML).not.toContain("shadow-card");
    expect(screen.getByRole("heading", { name: "The artists carrying your rotation." })).toBeInTheDocument();
    expect(screen.getByText("Artist 1")).toBeInTheDocument();
    expect(screen.getByText("Artist 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      "/dashboard/artists?startDate=2024-01-01&endDate=2024-06-01&userId=demo-user"
    );
  });
});
