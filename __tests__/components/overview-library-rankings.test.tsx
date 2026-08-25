/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  LIBRARY_LEADER_ACCENTS,
  TopLibraryCard,
} from "@/lib/components/overview-library-rankings";

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

const items = [
  { id: "a1", title: "Daft Punk", count: 42, percentage: 12 },
  { id: "a2", title: "Justice", count: 21, percentage: 6 },
];

describe("TopLibraryCard", () => {
  it("keeps ranking rows static without onItemSelect", () => {
    render(
      <TopLibraryCard
        title="Top artists"
        description="Leaders"
        accent={LIBRARY_LEADER_ACCENTS.artists}
        items={items}
        locale="en-US"
        listensLabel="streams"
      />
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Daft Punk")).toBeInTheDocument();
    expect(screen.getByText("Justice")).toBeInTheDocument();
  });

  it("calls onItemSelect when a ranking row is clicked", () => {
    const onItemSelect = vi.fn();
    render(
      <TopLibraryCard
        title="Top artists"
        description="Leaders"
        accent={LIBRARY_LEADER_ACCENTS.artists}
        items={items}
        locale="en-US"
        listensLabel="streams"
        onItemSelect={onItemSelect}
        itemAriaLabel={(item) => `Open streaming insights for ${item.title}`}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open streaming insights for Justice" })
    );

    expect(onItemSelect).toHaveBeenCalledWith(items[1], 1);
  });
});
