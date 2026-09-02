/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { HomeJourneyInteractSection } from "@/lib/components/home-journey-interact-section";

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

vi.mock("@/lib/components/home-animations", () => ({
  HomeBlurFadeReveal: ({ children }: { children: React.ReactNode }) => children,
  HomeClipReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  HomeTextReveal: ({
    text,
    as: Tag = "h2",
    className,
  }: {
    text: string;
    as?: "h1" | "h2" | "h3" | "p" | "span";
    className?: string;
  }) => <Tag className={className}>{text}</Tag>,
}));

describe("HomeJourneyInteractSection", () => {
  it("stages chat and duet as two labeled features with both deep-link anchors", () => {
    const { container } = render(<HomeJourneyInteractSection />);

    expect(container.querySelector("#interact")).toBeInTheDocument();
    expect(container.querySelector("#soundprint-ai-chat")).toBeInTheDocument();
    expect(container.querySelector("#duet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "home.journey.steps.interact.askTitle" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "home.journey.steps.interact.duetTitle" })).toBeInTheDocument();
    expect(screen.getByText("home.journey.steps.interact.askLabel")).toBeInTheDocument();
    expect(screen.getByText("home.journey.steps.interact.askDescription")).toBeInTheDocument();
    expect(screen.getByText("home.journey.steps.interact.duetLabel")).toBeInTheDocument();
    expect(screen.getByText("home.journey.steps.interact.duetDescription")).toBeInTheDocument();
    expect(
      screen.getByLabelText("home.journey.steps.interact.stageLabel"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("home.soundprintAiChatDemo.sectionEyebrow")).toBeInTheDocument();
    expect(screen.getByLabelText("home.duetPreview.label")).toBeInTheDocument();
    expect(screen.getByText("home.journey.steps.interact.connector")).toBeInTheDocument();
  });
});
