/** @vitest-environment jsdom */

import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NotificationCenter } from "@/lib/components/notification-center";
import { GenreBackfillJobProvider } from "@/lib/context/genre-backfill-job-context";
import {
  NotificationCenterProvider,
  useNotifications,
} from "@/lib/context/notification-center-context";
import { NOTIFICATION_CENTER_STORAGE_KEY } from "@/lib/constants/notification-storage";
import type { FriendshipDto } from "@/lib/dto/duet";

const pendingFriendship: FriendshipDto = {
  id: "friendship-1",
  status: "pending",
  shareScope: "none",
  createdAt: "2026-06-10T12:00:00.000Z",
  respondedAt: null,
  direction: "incoming",
  requester: {
    id: "user-b",
    email: "b@test.com",
    name: "Bob",
    avatarUrl: null,
  },
  addressee: {
    id: "user-a",
    email: "a@test.com",
    name: "Alice",
    avatarUrl: null,
  },
};

const { duetState } = vi.hoisted(() => ({
  duetState: { pendingIncoming: [] as FriendshipDto[] },
}));

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

vi.mock("@/lib/hooks/use-duet-pending-incoming", () => ({
  useDuetPendingIncoming: () => ({
    pendingIncoming: duetState.pendingIncoming,
    pendingCount: duetState.pendingIncoming.length,
    isLoading: false,
    isFetching: false,
  }),
}));

function renderCenter() {
  return render(
    <GenreBackfillJobProvider>
      <NotificationCenterProvider>
        <NotificationCenter />
      </NotificationCenterProvider>
    </GenreBackfillJobProvider>
  );
}

describe("NotificationCenter (RTL)", () => {
  beforeEach(() => {
    duetState.pendingIncoming = [];
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
    renderCenter();

    fireEvent.click(screen.getByRole("button", { name: "openLabel" }));
    expect(screen.getByRole("dialog", { name: "panelTitle" })).toBeInTheDocument();
    expect(screen.getByText("empty")).toBeInTheDocument();
  });

  it("hides mark-read and clear when only Duet requests are present", () => {
    duetState.pendingIncoming = [pendingFriendship];
    renderCenter();

    fireEvent.click(screen.getByRole("button", { name: "openLabel" }));
    expect(screen.queryByRole("button", { name: "markAllRead" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "clearAll" })).not.toBeInTheDocument();
  });

  it("shows mark-read and clear when client activity exists alongside Duet", async () => {
    duetState.pendingIncoming = [pendingFriendship];

    function Harness() {
      const { addNotification } = useNotifications();
      return (
        <>
          <button
            type="button"
            onClick={() =>
              addNotification({ title: "imported", source: "import-complete" })
            }
          >
            add-import
          </button>
          <NotificationCenter />
        </>
      );
    }

    render(
      <GenreBackfillJobProvider>
        <NotificationCenterProvider>
          <Harness />
        </NotificationCenterProvider>
      </GenreBackfillJobProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "add-import" }));
    fireEvent.click(screen.getByRole("button", { name: "openLabel" }));

    expect(screen.getByRole("button", { name: "markAllRead" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "clearAll" })).toBeInTheDocument();
  });

  it("dedupes two addNotification calls with the same source when triggered from clicks", async () => {
    function DedupeHarness() {
      const { addNotification, items } = useNotifications();
      return (
        <div>
          <button
            type="button"
            onClick={() => addNotification({ title: "first", source: "import-complete" })}
          >
            add-a
          </button>
          <button
            type="button"
            onClick={() => addNotification({ title: "second", source: "import-complete" })}
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

  it("marks matching source items as read via markReadBySource", async () => {
    function Harness() {
      const { addNotification, markReadBySource, items } = useNotifications();
      return (
        <div>
          <button
            type="button"
            onClick={() =>
              addNotification({
                title: "nudge",
                source: "genre-groq-unknown-majority",
              })
            }
          >
            add-nudge
          </button>
          <button
            type="button"
            onClick={() => markReadBySource("genre-groq-unknown-majority")}
          >
            mark-source
          </button>
          <span data-testid="read">{String(items[0]?.read ?? "")}</span>
        </div>
      );
    }

    render(
      <NotificationCenterProvider>
        <Harness />
      </NotificationCenterProvider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole("button", { name: "add-nudge" }));
    expect(screen.getByTestId("read")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("button", { name: "mark-source" }));
    expect(screen.getByTestId("read")).toHaveTextContent("true");
  });
});
