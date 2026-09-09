/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import type { ArtistStatsDto, ArtistUserInsightsDto } from "@/lib/dto/artist";

const barChartMargins: Array<{ top?: number; right?: number; left?: number; bottom?: number }> = [];

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/providers/theme-provider", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@/lib/hooks/use-chart-viewport", () => ({
  useIsLgChartViewport: () => true,
}));

vi.mock("@/lib/components/chart-responsive-container", () => ({
  ChartResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/components/artist-avatar-hydrated", () => ({
  ArtistAvatarHydrated: () => <div data-testid="artist-avatar" />,
}));

vi.mock("@/lib/components/error-state", () => ({
  ErrorState: () => null,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

vi.mock("recharts", () => ({
  BarChart: ({
    margin,
    children,
  }: {
    margin?: { top?: number; right?: number; left?: number; bottom?: number };
    children?: React.ReactNode;
  }) => {
    if (margin) barChartMargins.push(margin);
    return <div data-testid="insights-bar-chart">{children}</div>;
  },
  Bar: () => null,
  XAxis: () => null,
  YAxis: ({ width }: { width?: number }) => <div data-testid="insights-y-axis" data-width={width} />,
  Tooltip: () => null,
  CartesianGrid: () => null,
}));

const insights: ArtistUserInsightsDto = {
  artist: {
    artistId: "a1",
    artistName: "Test Artist",
    imageUrl: null,
    listenCount: 120,
    uniqueTracks: 9,
    firstListenDate: "2024-01-05T12:00:00.000Z",
    lastListenDate: "2024-06-01T18:30:00.000Z",
    totalPlayTime: 36000,
  },
  topTracks: [{ trackId: "t1", title: "Track One", listenCount: 40 }],
  listensByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, listens: hour === 20 ? 20 : 0 })),
  listensByWeekday: Array.from({ length: 7 }, (_, weekdayIndexMondayFirst) => ({
    weekdayIndexMondayFirst,
    listens: weekdayIndexMondayFirst === 2 ? 50 : 0,
  })),
  listensBySource: [{ source: "lastfm", listens: 120 }],
  busiestDay: { date: "2024-03-15", listens: 25 },
  activeListeningDays: 40,
  listeningSpanDays: 150,
  peakListenHour: { hour: 20, listens: 20 },
  peakWeekday: { weekdayIndexMondayFirst: 2, listens: 50 },
};

vi.mock("@/lib/hooks/use-artists", () => ({
  useArtistUserInsights: () => ({
    data: insights,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import { ArtistUserInsightsPanel } from "@/lib/components/artist-user-insights-panel";

const previewArtist: ArtistStatsDto = insights.artist;

describe("ArtistUserInsightsPanel charts", () => {
  it("keeps hour and weekday Y-axis ticks fully visible inside the card", () => {
    render(
      <ArtistUserInsightsPanel
        open
        artistId="a1"
        previewArtist={previewArtist}
        locale="en"
        onClose={() => undefined}
        colorIndex={0}
      />
    );

    expect(screen.getByText("insightsByHour")).toBeInTheDocument();
    expect(screen.getByText("insightsByWeekday")).toBeInTheDocument();
    expect(barChartMargins).toHaveLength(2);
    const yAxes = screen.getAllByTestId("insights-y-axis");
    expect(yAxes).toHaveLength(2);
    for (const margin of barChartMargins) {
      expect(margin.left ?? 0).toBeGreaterThanOrEqual(0);
    }
    for (const axis of yAxes) {
      expect(Number(axis.getAttribute("data-width"))).toBeGreaterThanOrEqual(36);
    }
  });
});
