/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DuetCompareMobileExperience } from "@/lib/components/duet/duet-compare-mobile";
import type { CompareEntityResponse } from "@/lib/dto/duet";

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    return t;
  },
}));

const searchParams = new URLSearchParams("startDate=2026-01-01&endDate=2026-01-31");

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
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

vi.mock("@/lib/hooks/use-listen-date-range", () => ({
  useListenDateRange: () => ({
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    isLoading: false,
    isAll: false,
  }),
}));

vi.mock("@/lib/components/dashboard-ui", () => ({
  DashboardCinematicHeroBg: () => null,
}));

vi.mock("@/lib/components/musical-profile-period-badge", () => ({
  MusicalProfilePeriodBadge: () => null,
}));

vi.mock("@/lib/components/user-avatar", () => ({
  UserAvatar: () => null,
}));

vi.mock("@/lib/components/mobile-bottom-sheet", () => ({
  MobileBottomSheet: () => null,
}));

vi.mock("@/lib/components/duet/duet-mobile-sub-nav", () => ({
  DuetMobileSubNav: () => null,
}));

const artistCompare: CompareEntityResponse = {
  type: "artist",
  entityId: "artist-1",
  artistName: "Radiohead",
  imageUrl: null,
  period: "month",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  rangeClamped: false,
  selfCount: 42,
  friendCount: 18,
  winner: "self",
  merged: [],
};

const baseProps = {
  locale: "fr",
  viewer: { id: "me", name: "Wes", avatarUrl: null },
  friendName: "Alex",
  friendAvatarUrl: null,
  friends: [],
  hrefForFriend: () => "/dashboard/duet/compare",
  withFilters: (href: string) => href,
  onSelectFriend: vi.fn(),
  onSectionChange: vi.fn(),
  selfTotal: 100,
  friendTotal: 80,
  rangeClamped: false,
  chartData: [],
  period: "month" as const,
  resolvedTheme: "light",
  chartView: "period" as const,
  onChartViewChange: vi.fn(),
  sharedLoading: false,
  sharedError: false,
  onRetryShared: vi.fn(),
  onCompareArtist: vi.fn(),
  onArenaModeChange: vi.fn(),
  searchQuery: "",
  onSearchQueryChange: vi.fn(),
  suggestions: [],
  showSuggestions: false,
  onSelectEntity: vi.fn(),
  onClearEntity: vi.fn(),
  entityChartData: [],
  entityLoading: false,
  entityError: false,
  onRetryEntity: vi.fn(),
};

describe("DuetCompareMobileExperience shared empty", () => {
  it("shows title and description when there is no overlap", () => {
    render(
      <DuetCompareMobileExperience
        {...baseProps}
        activeSection="shared"
        sharedArtists={[]}
      />
    );

    expect(screen.getByRole("status", { name: "sharedArtistsEmptyTitle" })).toBeTruthy();
    expect(screen.getByText("sharedArtistsEmptyDescription")).toBeTruthy();
  });
});

describe("DuetCompareMobileExperience arena actions", () => {
  it("shows share and download on an artist duel", () => {
    render(
      <DuetCompareMobileExperience
        {...baseProps}
        activeSection="target"
        arenaMode="artist"
        selectedEntityLabel="Radiohead"
        entityCompare={artistCompare}
      />
    );

    expect(screen.getByRole("button", { name: "shareBattleImage" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "downloadBattleImage" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "arenaGenre" })).toBeNull();
  });

  it("shows share and download on a track duel", () => {
    render(
      <DuetCompareMobileExperience
        {...baseProps}
        activeSection="target"
        arenaMode="track"
        selectedEntityLabel="Paranoid Android"
        selectedEntitySubtitle="Radiohead"
        entityCompare={{
          type: "track",
          entityId: "track-1",
          trackTitle: "Paranoid Android",
          artistName: "Radiohead",
          period: "month",
          startDate: "2026-01-01",
          endDate: "2026-01-31",
          rangeClamped: false,
          selfCount: 12,
          friendCount: 20,
          winner: "friend",
          merged: [],
        }}
      />
    );

    expect(screen.getByRole("button", { name: "shareBattleImage" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "downloadBattleImage" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "arenaTrack" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "arenaGenre" })).toBeNull();
  });
});
