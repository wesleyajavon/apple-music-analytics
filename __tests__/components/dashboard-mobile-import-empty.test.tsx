/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { PublicDemoProvider } from "@/lib/providers/public-demo-provider";
import { DashboardMobileImportEmpty } from "@/lib/components/dashboard-mobile-import-empty";

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("DashboardMobileImportEmpty", () => {
  it("fills the viewport and shows import, demo, and unlock preview", () => {
    render(
      <PublicDemoProvider publicProfileUserId={null}>
        <DashboardMobileImportEmpty
          eyebrow="Your music"
          title="Import your streams"
          lead="No history yet."
          demoPath="/dashboard/overview"
          importLabel="Import history"
        />
      </PublicDemoProvider>,
    );

    const heading = screen.getByRole("heading", { name: "Import your streams" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("No history yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import history" })).toHaveAttribute(
      "href",
      "/dashboard/onboarding?addData=1",
    );
    expect(screen.getByRole("link", { name: "components.emptyState.emptyDemoCta" })).toHaveAttribute(
      "href",
      "/dashboard/demo",
    );
    expect(screen.getByText("components.emptyState.mobileUnlock.hours")).toBeInTheDocument();
    expect(screen.getByText("components.emptyState.mobileUnlock.catalog")).toBeInTheDocument();
    expect(screen.getByText("components.emptyState.mobileUnlock.taste")).toBeInTheDocument();

    const shell = heading.closest("section")?.parentElement;
    expect(shell?.className).toContain("min-h-[calc(100dvh-");
    expect(shell?.className).toContain("--dashboard-bottom-nav-offset");
    expect(shell?.className).toContain("lg:hidden");
  });
});
