/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationCenter } from "@/lib/components/notification-center";
import {
  GenreBackfillJobProvider,
} from "@/lib/context/genre-backfill-job-context";
import {
  NotificationCenterProvider,
  useNotifications,
} from "@/lib/context/notification-center-context";
import { NOTIFICATION_CENTER_STORAGE_KEY } from "@/lib/constants/notification-storage";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NotificationCenter (RTL)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ job: null }),
      })
    );
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
  });

  it("opens the panel and shows empty state", () => {
    render(
      <GenreBackfillJobProvider>
        <NotificationCenterProvider>
          <NotificationCenter />
        </NotificationCenterProvider>
      </GenreBackfillJobProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "openLabel" }));
    expect(screen.getByRole("dialog", { name: "panelTitle" })).toBeInTheDocument();
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("dedupes two addNotification calls with the same source when triggered from clicks", async () => {
    function DedupeHarness() {
      const { addNotification, items } = useNotifications();
      return (
        <div>
          <button
            type="button"
            onClick={() => addNotification({ title: "first", source: "export-csv" })}
          >
            add-a
          </button>
          <button
            type="button"
            onClick={() => addNotification({ title: "second", source: "export-csv" })}
          >
            add-b
          </button>
          <span data-testid="count">{items.length}</span>
          <span data-testid="title">{items[0]?.title ?? ""}</span>
        </div>
      );
    }

    render(
      <NotificationCenterProvider>
        <DedupeHarness />
      </NotificationCenterProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "add-a" }));
    fireEvent.click(screen.getByRole("button", { name: "add-b" }));

    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("title")).toHaveTextContent("second");
  });

  it("writes to localStorage after adding a notification post-hydration", async () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });

    function AddOne() {
      const { addNotification } = useNotifications();
      return (
        <button
          type="button"
          onClick={() => addNotification({ title: "hello", source: "s1" })}
        >
          add-one
        </button>
      );
    }

    render(
      <NotificationCenterProvider>
        <AddOne />
      </NotificationCenterProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "add-one" }));

    await act(async () => {
      await Promise.resolve();
    });

    const callsForKey = setItem.mock.calls.filter((c) => c[0] === NOTIFICATION_CENTER_STORAGE_KEY);
    expect(callsForKey.length).toBeGreaterThan(0);
    const lastPayload = JSON.parse(String(callsForKey.at(-1)![1])) as { title: string }[];
    expect(lastPayload).toHaveLength(1);
    expect(lastPayload[0].title).toBe("hello");
  });
});
