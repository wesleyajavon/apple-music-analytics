/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("slides to the next page of tiles with the arrow", () => {
    const manyItems: ReplayRankingItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `a${i + 1}`,
      title: `Artist ${i + 1}`,
      metric: `${i + 1} streams`,
      media: { kind: "artist" as const, artistId: `a${i + 1}`, artistName: `Artist ${i + 1}` },
    }));

    render(
      <ReplayRankingGrid
        items={manyItems}
        pageRangeLabel={(start, end) => `${start}–${end}`}
        pagesNavLabel="Pages"
        previousPageLabel="Previous"
        nextPageLabel="Next"
      />
    );

    expect(screen.getByRole("tab", { name: "1–4" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("tab", { name: "5–8" })).toHaveAttribute("aria-selected", "true");
  });

  it("slides to the next page with a horizontal swipe", () => {
    const manyItems: ReplayRankingItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `a${i + 1}`,
      title: `Artist ${i + 1}`,
      metric: `${i + 1} streams`,
      media: { kind: "artist" as const, artistId: `a${i + 1}`, artistName: `Artist ${i + 1}` },
    }));

    render(
      <ReplayRankingGrid
        items={manyItems}
        pageRangeLabel={(start, end) => `${start}–${end}`}
        pagesNavLabel="Pages"
        previousPageLabel="Previous"
        nextPageLabel="Next"
      />
    );

    const viewport = screen.getByTestId("replay-ranking-viewport");
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 400 });

    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 220, clientY: 40, button: 0 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 200, clientY: 40 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 40, clientY: 42 });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 40, clientY: 42 });

    expect(screen.getByRole("tab", { name: "5–8" })).toHaveAttribute("aria-selected", "true");
  });

  it("does not fire onSelect after a drag that changes page", () => {
    const onSelect = vi.fn();
    const manyItems: ReplayRankingItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `a${i + 1}`,
      title: `Artist ${i + 1}`,
      metric: `${i + 1} streams`,
      media: { kind: "artist" as const, artistId: `a${i + 1}`, artistName: `Artist ${i + 1}` },
      ariaLabel: `Open streaming insights for Artist ${i + 1}`,
    }));

    render(
      <ReplayRankingGrid
        items={manyItems}
        onSelect={onSelect}
        pageRangeLabel={(start, end) => `${start}–${end}`}
        pagesNavLabel="Pages"
        previousPageLabel="Previous"
        nextPageLabel="Next"
      />
    );

    const viewport = screen.getByTestId("replay-ranking-viewport");
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 400 });
    const tile = screen.getByRole("button", { name: "Open streaming insights for Artist 1" });

    fireEvent.pointerDown(viewport, { pointerId: 1, clientX: 220, clientY: 40, button: 0 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 200, clientY: 40 });
    fireEvent.pointerMove(viewport, { pointerId: 1, clientX: 40, clientY: 42 });
    fireEvent.pointerUp(viewport, { pointerId: 1, clientX: 40, clientY: 42 });
    fireEvent.click(tile);

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "5–8" })).toHaveAttribute("aria-selected", "true");
  });

  it("slides to the next page with horizontal trackpad wheel", () => {
    const manyItems: ReplayRankingItem[] = Array.from({ length: 8 }, (_, i) => ({
      id: `a${i + 1}`,
      title: `Artist ${i + 1}`,
      metric: `${i + 1} streams`,
      media: { kind: "artist" as const, artistId: `a${i + 1}`, artistName: `Artist ${i + 1}` },
    }));

    render(
      <ReplayRankingGrid
        items={manyItems}
        pageRangeLabel={(start, end) => `${start}–${end}`}
        pagesNavLabel="Pages"
        previousPageLabel="Previous"
        nextPageLabel="Next"
      />
    );

    const viewport = screen.getByTestId("replay-ranking-viewport");
    const wheel = new WheelEvent("wheel", {
      deltaX: 80,
      deltaY: 10,
      cancelable: true,
      bubbles: true,
    });
    act(() => {
      viewport.dispatchEvent(wheel);
    });

    expect(wheel.defaultPrevented).toBe(true);
    expect(screen.getByRole("tab", { name: "5–8" })).toHaveAttribute("aria-selected", "true");
  });
});
