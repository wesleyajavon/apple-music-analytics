/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { PublicDemoProvider } from "@/lib/providers/public-demo-provider";
import {
  DASHBOARD_VIDEO_DEMO_PATH,
  SignedInPublicDemoExploreBanner,
  WaitingForImportMobileCtas,
  pathWithoutDashboardUserId,
} from "@/lib/components/waiting-for-import-demo";

const DEMO_USER_ID = "1bbbb9f2-3f82-469b-a50d-fc3b4f48bb21";
const AUTH_USER_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const { searchParamsState, authUserIdState } = vi.hoisted(() => ({
  searchParamsState: { value: new URLSearchParams() },
  authUserIdState: { value: null as string | null | undefined },
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsState.value,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => "/dashboard/overview",
}));

vi.mock("@/lib/hooks/use-public-demo-viewer", () => ({
  useSupabaseAuthUserId: () => authUserIdState.value,
}));

describe("pathWithoutDashboardUserId", () => {
  it("drops userId and keeps other filters", () => {
    const params = new URLSearchParams("userId=abc&startDate=2026-01-01");
    expect(pathWithoutDashboardUserId("/dashboard/overview", params)).toBe(
      "/dashboard/overview?startDate=2026-01-01",
    );
  });

  it("returns the pathname when nothing else remains", () => {
    const params = new URLSearchParams("userId=abc");
    expect(pathWithoutDashboardUserId("/dashboard/musical-profile", params)).toBe(
      "/dashboard/musical-profile",
    );
  });
});

describe("WaitingForImportMobileCtas", () => {
  beforeEach(() => {
    searchParamsState.value = new URLSearchParams();
    authUserIdState.value = AUTH_USER_ID;
  });

  it("links to the live public demo when it is configured", () => {
    render(
      <PublicDemoProvider publicProfileUserId={DEMO_USER_ID}>
        <WaitingForImportMobileCtas
          demoPath="/dashboard/musical-profile"
          importLabel="Import history"
          demoLabel="Explore the demo"
        />
      </PublicDemoProvider>,
    );

    expect(screen.getByRole("link", { name: "Import history" })).toHaveAttribute(
      "href",
      "/dashboard/onboarding?addData=1",
    );
    expect(screen.getByRole("link", { name: "Explore the demo" })).toHaveAttribute(
      "href",
      `/dashboard/musical-profile?userId=${DEMO_USER_ID}`,
    );
  });

  it("falls back to the video demo page when no public profile is configured", () => {
    render(
      <PublicDemoProvider publicProfileUserId={null}>
        <WaitingForImportMobileCtas
          demoPath="/dashboard/overview"
          importLabel="Import history"
          demoLabel="Explore the demo"
        />
      </PublicDemoProvider>,
    );

    expect(screen.getByRole("link", { name: "Explore the demo" })).toHaveAttribute(
      "href",
      DASHBOARD_VIDEO_DEMO_PATH,
    );
  });
});

describe("SignedInPublicDemoExploreBanner", () => {
  beforeEach(() => {
    searchParamsState.value = new URLSearchParams();
    authUserIdState.value = AUTH_USER_ID;
  });

  it("offers a way back when a signed-in user is exploring the public demo", () => {
    searchParamsState.value = new URLSearchParams(`userId=${DEMO_USER_ID}&preset=90d`);
    render(
      <PublicDemoProvider publicProfileUserId={DEMO_USER_ID}>
        <SignedInPublicDemoExploreBanner />
      </PublicDemoProvider>,
    );

    expect(screen.getByText("components.emptyState.waitingDemoBanner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "components.emptyState.waitingDemoBack" })).toHaveAttribute(
      "href",
      "/dashboard/overview?preset=90d",
    );
    expect(
      screen.getByRole("link", { name: "components.emptyState.importData.actionLabel" }),
    ).toHaveAttribute("href", "/dashboard/onboarding?addData=1");
  });

  it("stays hidden on the signed-in user's own empty dashboard", () => {
    render(
      <PublicDemoProvider publicProfileUserId={DEMO_USER_ID}>
        <SignedInPublicDemoExploreBanner />
      </PublicDemoProvider>,
    );

    expect(screen.queryByText("components.emptyState.waitingDemoBanner")).not.toBeInTheDocument();
  });
});
