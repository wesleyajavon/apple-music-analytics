/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DuetSharedArtistsPanel } from "@/lib/components/duet/duet-shared-artists-panel";
import type { CompareSharedArtistsResponse } from "@/lib/dto/duet";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => {
    const t = (key: string) => key;
    return t;
  },
}));

vi.mock("@/lib/components/artist-avatar-hydrated", () => ({
  ArtistAvatarHydrated: () => null,
}));

vi.mock("@/lib/components/error-state", () => ({
  ErrorState: () => <div>error-state</div>,
}));

const emptyData: CompareSharedArtistsResponse = {
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  rangeClamped: false,
  topPool: 50,
  totalShared: 0,
  artists: [],
};

describe("DuetSharedArtistsPanel empty overlap", () => {
  it("renders an inline empty state instead of the nested library empty card", () => {
    render(
      <DuetSharedArtistsPanel
        friendName="Alex"
        data={emptyData}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onCompareArtist={vi.fn()}
      />
    );

    expect(screen.getByRole("status", { name: "sharedArtistsEmptyTitle" })).toBeTruthy();
    expect(screen.getAllByText("sharedArtistsEmptyEyebrow").length).toBeGreaterThan(0);
    expect(screen.getByText("sharedArtistsEmptyDescription")).toBeTruthy();
    expect(screen.queryByText("Empty library")).toBeNull();
    expect(screen.queryByText("Pipeline · no rows")).toBeNull();
    expect(screen.queryByRole("heading", { name: "sharedArtistsEmptyTitle", level: 3 })).toBeTruthy();
  });
});
