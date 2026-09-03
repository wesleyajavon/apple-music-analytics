/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { AiUnavailableEmptyState } from "@/lib/components/ai-unavailable-empty-state";

const openGroqAiConsentPrompt = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/context/groq-ai-consent-prompt-context", () => ({
  useGroqAiConsentPrompt: () => ({ openGroqAiConsentPrompt }),
}));

describe("AiUnavailableEmptyState", () => {
  it("offers Enable Groq AI and not another import when consent is missing", () => {
    render(<AiUnavailableEmptyState reason="consent" />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "aiMasterToggle.unavailableTitle",
    );
    expect(screen.getByRole("button", { name: "aiMasterToggle.enableGroqCta" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "groqAiConsentPrompt.manageInSettings" })).toHaveAttribute(
      "href",
      "/dashboard/settings?view=preferences#settings-groq-ai",
    );
    expect(screen.queryByText(/import/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /onboarding/i })).not.toBeInTheDocument();
  });

  it("does not show an enable CTA when the server kill-switch is on", () => {
    render(<AiUnavailableEmptyState reason="env" />);

    expect(screen.queryByRole("button", { name: "aiMasterToggle.enableGroqCta" })).not.toBeInTheDocument();
    expect(screen.getByText("aiMasterToggle.unavailableDescriptionEnv")).toBeInTheDocument();
  });
});
