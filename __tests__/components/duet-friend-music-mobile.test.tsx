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
  topTracks: [{ id: "t1", title: "One More Time", subtitle: "Daft Punk", count: 4 }],
};

describe("DuetFriendMusicMobileExperience", () => {
  it("renders top tracks", () => {
    searchParams.delete("view");
    render(<DuetFriendMusicMobileExperience {...baseProps} />);

    expect(screen.getByRole("tab", { name: /viewSwitcher\.views\.tops/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("duet-friend-music-top-tracks")).toBeInTheDocument();
    expect(screen.getByText("One More Time")).toBeInTheDocument();
    expect(screen.queryByText("aggregatesTracksHint")).not.toBeInTheDocument();
  });

  it("labels the hero insight under the banner lead", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        insight={{
          eyebrow: "Alex’s signature sound",
          title: "One More Time",
          subtitle: "Daft Punk",
          metric: "4",
          metricLabel: "streams",
        }}
      />
    );

    expect(screen.getByText("Alex’s signature sound")).toBeInTheDocument();
    const banner = screen.getByText("bannerLead");
    const label = screen.getByText("Alex’s signature sound");
    expect(
      banner.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("shows the friend name as title with an initials avatar", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience {...baseProps} subjectAvatar={null} />
    );

    expect(screen.getByRole("heading", { name: "Alex" })).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("uses the dedicated period empty, not an import CTA", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        topArtists={[]}
        topGenres={[]}
        topTracks={[]}
        emptyStats
      />
    );

    expect(screen.getByText("emptyStatsDescription")).toBeInTheDocument();
    expect(screen.queryByText("aggregatesTracksHint")).not.toBeInTheDocument();
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
  });

  it("does not expose a summary tab", () => {
    searchParams.delete("view");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        chartData={[
          { formattedDate: "Jan 2026", listens: 10 },
          { formattedDate: "Feb 2026", listens: 40 },
        ]}
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
    render(<DuetFriendMusicMobileExperience {...baseProps} />);

    const tracks = screen.getByText("topTracksTitle");
    const genres = screen.getByText("topGenresTitle");
    expect(tracks.compareDocumentPosition(genres) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses the timeline sparkline on the trends view", () => {
    searchParams.set("view", "trends");
    render(
      <DuetFriendMusicMobileExperience
        {...baseProps}
        chartData={[
          { formattedDate: "Jan 2026", listens: 10 },
          { formattedDate: "Feb 2026", listens: 40 },
        ]}
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
