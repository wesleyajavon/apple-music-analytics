/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach } from "vitest";
import React, { type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AskSoundprintMobileExperience } from "@/lib/components/ask-soundprint-mobile";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/en/dashboard/ask-your-soundprint",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/components/interactive-ai-genre-backfill-notice", () => ({
  InteractiveAiGenreBackfillNotice: () => null,
}));

vi.mock("@/lib/components/ask-soundprint-chat", () => ({
  AskSoundprintChatMessages: () => <div>chat-messages</div>,
  AskSoundprintComposer: () => <form aria-label="composer" />,
  AskSoundprintMark: () => <span>mark</span>,
  AskSoundprintBetaBadge: () => <span>beta</span>,
}));

vi.mock("@/lib/components/mobile-bottom-sheet", () => ({
  MobileBottomSheet: ({
    open,
    children,
    ariaLabelledBy,
  }: {
    open: boolean;
    children: ReactNode;
    ariaLabelledBy?: string;
  }) =>
    open ? (
      <div role="dialog" aria-labelledby={ariaLabelledBy}>
        {children}
      </div>
    ) : null,
}));

const baseProps = {
  isPublicDemoViewer: false,
  showGenreBackfillNotice: false,
  genreClassify423Notice: false,
  interactiveAiBlockedByGenreBackfill: false,
  thinkingStepIndex: 0,
  thinkingSteps: ["thinking"],
  errorMessage: null,
  input: "",
  onInputChange: () => undefined,
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => event.preventDefault(),
  freeTextDisabled: false,
  inputPlaceholder: "Ask",
  presetsDisabled: false,
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  isAll: false,
  locale: "en",
  featuredRow: <div>featured</div>,
  sheetHints: <div>hints</div>,
};

describe("AskSoundprintMobileExperience all-questions sheet", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("closes the sheet when a premade question is chosen during an existing chat", () => {
    const onSelect = vi.fn();
    render(
      <AskSoundprintMobileExperience
        {...baseProps}
        visibleMessages={[{ role: "user", content: "hello" }]}
        isPending={false}
        hasUserMessages
        playbook={
          <button type="button" onClick={onSelect}>
            Ask: Who were my top artists?
          </button>
        }
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "mobile.allQuestionsAria" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ask: Who were my top artists?" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the sheet when a premade question is chosen from the empty state", () => {
    const onSelect = vi.fn();
    render(
      <AskSoundprintMobileExperience
        {...baseProps}
        visibleMessages={[]}
        isPending={false}
        hasUserMessages={false}
        playbook={
          <button type="button" onClick={onSelect}>
            Ask: Who were my top artists?
          </button>
        }
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /allQuestions/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ask: Who were my top artists?" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
