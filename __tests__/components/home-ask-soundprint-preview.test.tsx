/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { HomeAskSoundprintPreview } from "@/lib/components/home-ask-soundprint-preview";

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

describe("HomeAskSoundprintPreview", () => {
  it("shows a chat that asks about real listening history", () => {
    render(<HomeAskSoundprintPreview />);

    expect(screen.getByLabelText("home.soundprintAiChatDemo.sectionEyebrow")).toBeInTheDocument();
    expect(screen.getByText("home.soundprintAiChatDemo.previewQuestion")).toBeInTheDocument();
    expect(screen.getByText("home.soundprintAiChatDemo.previewAnswer")).toBeInTheDocument();
  });
});
