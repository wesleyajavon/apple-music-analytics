import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { PaletteMappingNotice } from "@/lib/components/palette/palette-mapping-notice";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/components/palette/genre-accuracy-chooser", () => ({
  GenreAccuracyChooser: ({ viewerUserId }: { viewerUserId?: string | null }) => (
    <div data-testid="genre-accuracy-chooser" data-viewer={viewerUserId ?? ""} />
  ),
}));

describe("PaletteMappingNotice", () => {
  const props = {
    title: "Improve your genre mapping",
    body: "Use Palette for manual refinements or Groq genre mapping to classify unknown tracks faster.",
    linkLabel: "Open Palette",
    className: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render the notice for public demo viewers", () => {
    const html = renderToStaticMarkup(
      <PaletteMappingNotice {...props} isPublicDemoViewer />
    );

    expect(html).toBe("");
  });

  it("renders Palette link copy when Groq chooser is disabled", () => {
    const html = renderToStaticMarkup(
      <PaletteMappingNotice {...props} isPublicDemoViewer={false} />
    );

    expect(html).toContain("Use Palette for manual refinements");
    expect(html).toContain('href="/dashboard/genres/palette"');
    expect(html).toContain(">Open Palette</a>");
  });

  it("renders the genre accuracy chooser when Groq CTA is enabled", () => {
    const html = renderToStaticMarkup(
      <PaletteMappingNotice {...props} isPublicDemoViewer={false} showGroqCta />
    );

    expect(html).toContain('data-testid="genre-accuracy-chooser"');
    expect(html).not.toContain("Use Palette for manual refinements");
  });
});
