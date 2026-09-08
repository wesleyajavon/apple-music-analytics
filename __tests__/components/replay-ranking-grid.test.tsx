/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReplayRankingGrid, type ReplayRankingItem } from "@/lib/components/replay-ranking-grid";

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

vi.mock("@/lib/components/artist-avatar-hydrated", () => ({
  ArtistAvatarHydrated: ({ artistName }: { artistName: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" data-testid={`avatar-${artistName}`} />
  ),
}));

const items: ReplayRankingItem[] = [
  {
    id: "a1",
    title: "Daft Punk",
    metric: "42 streams",
    media: { kind: "artist", artistId: "a1", artistName: "Daft Punk" },
    ariaLabel: "Open streaming insights for Daft Punk",
  },
  {
    id: "a2",
    title: "Justice",
    metric: "21 streams",
    media: { kind: "artist", artistId: "a2", artistName: "Justice" },
    ariaLabel: "Open streaming insights for Justice",
  },
];

describe("ReplayRankingGrid", () => {
  it("calls onSelect when a ranking tile is clicked", () => {
    const onSelect = vi.fn();
    render(
      <ReplayRankingGrid
        items={items}
        onSelect={onSelect}
        pageRangeLabel={(start, end) => `${start}–${end}`}
        pagesNavLabel="Pages"
        previousPageLabel="Previous"
        nextPageLabel="Next"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Open streaming insights for Justice" }));
    expect(onSelect).toHaveBeenCalledWith(items[1], 1);
  });
});
