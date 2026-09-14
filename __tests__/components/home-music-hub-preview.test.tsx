/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomeMusicHubPreview } from "@/lib/components/home-music-hub-preview";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    aside: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
      <aside {...props}>{children}</aside>
    ),
  },
  useReducedMotion: () => true,
  useInView: () => false,
}));

describe("HomeMusicHubPreview", () => {
  it("switches overview tabs and period chips like the real hub", () => {
    render(<HomeMusicHubPreview />);

    expect(screen.getByRole("region", { name: "home.musicHub.label" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "home.musicHub.deepDive.openAria" }).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "overview.viewSwitcher.views.tops" }));
    expect(
      screen.getAllByRole("button", { name: "home.musicHub.selectAlbumAria" }).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "overview.viewSwitcher.views.trends" }));
    expect(
      screen.getAllByRole("button", { name: "home.musicHub.genreToggleAria" }).length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "components.dateRangeFilter.presets.7d" }));
    expect(screen.getByText(/1\s?[,.]?240/)).toBeInTheDocument();
  });

  it("opens a fake artist deepdive overlay from an artist card", () => {
    render(<HomeMusicHubPreview />);

    fireEvent.click(screen.getAllByRole("button", { name: "home.musicHub.deepDive.openAria" })[0]!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("artists.insightsTopTracks")).toBeInTheDocument();
    expect(screen.getAllByText("Blinding Lights").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "home.musicHub.deepDive.closeAria" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens a library page from the sidebar", () => {
    render(<HomeMusicHubPreview />);

    fireEvent.click(screen.getByRole("button", { name: "sidebar.items.heatmap" }));
    expect(screen.queryByRole("tab", { name: "overview.viewSwitcher.views.spotlight" })).toBeNull();
    expect(screen.getByText("home.dashboardPreviews.heatmap.description")).toBeInTheDocument();
  });
});
