/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DuetFriendMusicMobileExperience } from "@/lib/components/duet/duet-friend-music-mobile";
import type { OverviewStatsDto } from "@/lib/dto/listening";

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
  usePathname: () => "/fr/dashboard/duet/music",
  useRouter: () => ({
    replace: (href: string) => {
      const qs = href.includes("?") ? href.split("?")[1] ?? "" : "";
      const next = new URLSearchParams(qs);
      for (const key of [...searchParams.keys()]) {
        searchParams.delete(key);
      }
      next.forEach((value, key) => {
        searchParams.set(key, value);
      });
    },
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-listen-date-range", () => ({
  useListenDateRange: () => ({
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    isLoading: false,
    isAll: false,
  }),
}));

const stats: OverviewStatsDto = {
  totalListens: 12,
  uniqueArtists: 4,
  uniqueTracks: 8,
  totalPlayTime: 3600,
};

const baseProps = {
  locale: "fr",
  withFilters: (href: string) => href,
  compareHref: "/dashboard/duet/compare?friendUserId=friend-1",
  subjectName: "Alex",
  subjectAvatar: null,
  bannerLead: "bannerLead",
  stats,
  topArtists: [{ id: "a1", title: "Daft Punk", count: 6 }],
  topGenres: [{ id: "electronic", title: "Electronic", count: 6 }],
  chartData: [] as { formattedDate: string; listens: number }[],
  emptyStats: false,
};

describe("DuetFriendMusicMobileExperience shareScope", () => {
  it("hides top tracks and shows the aggregates hint", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        topTracks={null}
        showAggregatesHint
      />
    );

    expect(screen.getByRole("tab", { name: /viewSwitcher\.views\.tops/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.queryByTestId("duet-friend-music-top-tracks")).not.toBeInTheDocument();
    expect(screen.queryByText("tracksLabel")).not.toBeInTheDocument();
    expect(screen.getByText("aggregatesTracksHint")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "aggregatesTracksHintCta" })).toHaveAttribute(
      "href",
      "/dashboard/settings?view=preferences#settings-duet-sharing"
    );
  });

  it("renders top tracks for full scope and omits the aggregates hint", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        topTracks={[{ id: "t1", title: "One More Time", subtitle: "Daft Punk", count: 4 }]}
        showAggregatesHint={false}
      />
    );

    expect(screen.getByTestId("duet-friend-music-top-tracks")).toBeInTheDocument();
    expect(screen.getByText("One More Time")).toBeInTheDocument();
    expect(screen.queryByText("aggregatesTracksHint")).not.toBeInTheDocument();
  });

  it("uses the dedicated period empty, not an import CTA", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        stats={{ ...stats, totalListens: 0, uniqueArtists: 0, uniqueTracks: 0 }}
        topArtists={[]}
        topGenres={[]}
        topTracks={null}
        emptyStats
        showAggregatesHint={false}
      />
    );

    expect(screen.getByText("emptyStatsDescription")).toBeInTheDocument();
    expect(screen.queryByText("aggregatesTracksHint")).not.toBeInTheDocument();
    expect(screen.queryByTestId("duet-friend-music-top-tracks")).not.toBeInTheDocument();
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
  });
});
