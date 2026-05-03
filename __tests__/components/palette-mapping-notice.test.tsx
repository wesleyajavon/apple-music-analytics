import { describe, expect, it, vi } from "vitest";
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

describe("PaletteMappingNotice", () => {
  const props = {
    title: "Improve your genre mapping",
    body: "Use Palette for manual refinements or Groq genre mapping to classify unknown tracks faster.",
    linkLabel: "Open Palette",
    className: "",
  };

  it("does not render the notice for public demo viewers", () => {
    const html = renderToStaticMarkup(
      <PaletteMappingNotice {...props} isPublicDemoViewer />
    );

    expect(html).toBe("");
    expect(html).not.toContain("Groq genre mapping");
    expect(html).not.toContain("/dashboard/genres/palette");
    expect(html).not.toContain(">Open Palette<");
  });

  it("renders Palette and Groq mapping copy for authenticated viewers", () => {
    const html = renderToStaticMarkup(
      <PaletteMappingNotice {...props} isPublicDemoViewer={false} />
    );

    expect(html).toContain("Use Palette for manual refinements");
    expect(html).toContain("Groq genre mapping");
    expect(html).toContain('href="/dashboard/genres/palette"');
    expect(html).toContain(">Open Palette</a>");
  });
});
