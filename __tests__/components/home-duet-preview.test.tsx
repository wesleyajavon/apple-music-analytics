/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { HomeDuetPreview } from "@/lib/components/home-duet-preview";
import {
  HOME_DUET_PREVIEW_FRIEND_LISTENS,
  HOME_DUET_PREVIEW_SELF_LISTENS,
} from "@/lib/constants/home-interact-preview";

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

describe("HomeDuetPreview", () => {
  it("reads as a 1v1 streaming battle at a glance", () => {
    render(<HomeDuetPreview />);

    expect(screen.getByLabelText("home.duetPreview.label")).toBeInTheDocument();
    expect(screen.getByText("home.duetPreview.vsLabel")).toBeInTheDocument();
    expect(screen.getByText("home.duetPreview.selfName")).toBeInTheDocument();
    expect(screen.getByText("home.duetPreview.friendName")).toBeInTheDocument();
    expect(screen.getByText("home.duetPreview.artistName")).toBeInTheDocument();
    expect(screen.getByText("home.duetPreview.winnerHeadline")).toBeInTheDocument();
    expect(screen.getByText("home.duetPreview.leadLabel")).toBeInTheDocument();
    expect(
      screen.getByText(HOME_DUET_PREVIEW_SELF_LISTENS.toLocaleString("en")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(HOME_DUET_PREVIEW_FRIEND_LISTENS.toLocaleString("en")),
    ).toBeInTheDocument();
  });
});
