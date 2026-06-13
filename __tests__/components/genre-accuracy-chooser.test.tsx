import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { GenreAccuracyChooser } from "@/lib/components/palette/genre-accuracy-chooser";

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

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const copy: Record<string, Record<string, string>> = {
      genreTrends: {
        groqCheckingEligibility: "Checking eligibility…",
        genreAccuracyChooserTitle: "Some tracks still need a genre",
        genreAccuracyChooserIntro: "Pick one option below.",
        genreAccuracyGroqRecommended: "Recommended",
        genreAccuracyGroqTitle: "AI auto-fill",
        genreAccuracyGroqDescription: "One tap.",
        genreAccuracyPaletteTitle: "Palette",
        genreAccuracyPaletteDescription: "Pick genres yourself.",
        genreAccuracyPaletteCta: "Open Palette",
      },
      "onboarding.genreLlmConsent": {
        accept: "Yes, classify with Groq",
        starting: "Starting…",
        privacy: "Privacy copy",
        missingKey: "Groq not configured",
        startError: "Could not start",
        startedToast: "Started",
      },
    };

    const table = copy[namespace] ?? {};
    return (key: string) => table[key] ?? key;
  },
}));

const mockUseGroqGenreBackfillMeta = vi.fn();

vi.mock("@/lib/hooks/use-groq-genre-backfill-meta", () => ({
  useGroqGenreBackfillMeta: (...args: unknown[]) => mockUseGroqGenreBackfillMeta(...args),
}));

describe("GenreAccuracyChooser", () => {
  it("does not render for viewed profiles", () => {
    mockUseGroqGenreBackfillMeta.mockReturnValue({
      meta: { loaded: true, eligibility: null, jobStatus: null, errorStatus: null },
      isStarting: false,
      isJobActive: false,
      startBackfill: vi.fn(),
    });

    const html = renderToStaticMarkup(<GenreAccuracyChooser viewerUserId="demo-user" />);
    expect(html).toBe("");
  });

  it("renders the recommended Groq card and Palette action when eligible", () => {
    mockUseGroqGenreBackfillMeta.mockReturnValue({
      meta: {
        loaded: true,
        eligibility: {
          unknownTrackCount: 42,
          unknownRatio: 12.5,
          totalTrackCount: 336,
          groqConfigured: true,
        },
        jobStatus: null,
        errorStatus: null,
      },
      isStarting: false,
      isJobActive: false,
      startBackfill: vi.fn(),
    });

    const html = renderToStaticMarkup(<GenreAccuracyChooser />);

    expect(html).toContain("Some tracks still need a genre");
    expect(html).toContain("Recommended");
    expect(html).toContain("Yes, classify with Groq");
    expect(html).toContain('href="/dashboard/genres/palette"');
    expect(html).toContain("Open Palette");
  });

  it("hides the chooser when every track already has a genre", () => {
    mockUseGroqGenreBackfillMeta.mockReturnValue({
      meta: {
        loaded: true,
        eligibility: {
          unknownTrackCount: 0,
          unknownRatio: 0,
          totalTrackCount: 100,
          groqConfigured: true,
        },
        jobStatus: null,
        errorStatus: null,
      },
      isStarting: false,
      isJobActive: false,
      startBackfill: vi.fn(),
    });

    const html = renderToStaticMarkup(<GenreAccuracyChooser />);
    expect(html).toBe("");
  });
});
