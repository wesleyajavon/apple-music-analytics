/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DuetFriendMusicMobileExperience } from "@/lib/components/duet/duet-friend-music-mobile";

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

const baseProps = {
  locale: "fr",
  withFilters: (href: string) => href,
  compareHref: "/dashboard/duet/compare?friendUserId=friend-1",
  subjectName: "Alex",
  subjectAvatar: null,
  bannerLead: "bannerLead",
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

  it("does not expose a summary tab", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        topTracks={[{ id: "t1", title: "One More Time", subtitle: "Daft Punk", count: 4 }]}
        chartData={[
          { formattedDate: "Jan 2026", listens: 10 },
          { formattedDate: "Feb 2026", listens: 40 },
        ]}
        showAggregatesHint={false}
      />
    );

    expect(screen.queryByRole("tab", { name: /viewSwitcher\.views\.summary/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "viewSwitcher.views.tops",
      "viewSwitcher.views.trends",
    ]);
  });

  it("renders top genres after top tracks", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        topTracks={[{ id: "t1", title: "One More Time", subtitle: "Daft Punk", count: 4 }]}
        showAggregatesHint={false}
      />
    );

    const tracks = screen.getByText("tracksLabel");
    const genres = screen.getByText("genresLabel");
    expect(tracks.compareDocumentPosition(genres) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses the timeline sparkline on the trends view", () => {
    searchParams.set("view", "trends");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        topTracks={[{ id: "t1", title: "One More Time", subtitle: "Daft Punk", count: 4 }]}
        chartData={[
          { formattedDate: "Jan 2026", listens: 10 },
          { formattedDate: "Feb 2026", listens: 40 },
        ]}
        showAggregatesHint={false}
      />
    );

    expect(screen.getByRole("tab", { name: /viewSwitcher\.views\.trends/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("img", { name: "sparkAria" })).toBeInTheDocument();
    expect(screen.getByText("sparkTitle")).toBeInTheDocument();
    expect(screen.getByText("bucketsTitle")).toBeInTheDocument();
    expect(screen.queryByText("timelineLabel")).not.toBeInTheDocument();
  });
});
