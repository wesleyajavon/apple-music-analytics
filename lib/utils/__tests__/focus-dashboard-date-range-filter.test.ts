/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { DASHBOARD_DATE_RANGE_FILTER_ID } from "@/lib/constants/date-range-filter";
import { focusDashboardDateRangeFilter } from "@/lib/utils/focus-dashboard-date-range-filter";

describe("focusDashboardDateRangeFilter", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("does nothing when the filter is missing", () => {
    expect(() => focusDashboardDateRangeFilter()).not.toThrow();
  });

  it("scrolls to the filter and highlights it briefly", () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    el.id = DASHBOARD_DATE_RANGE_FILTER_ID;
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);

    focusDashboardDateRangeFilter();

    expect(el.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
    });
    expect(el.hasAttribute("data-highlighted")).toBe(true);

    vi.advanceTimersByTime(1600);
    expect(el.hasAttribute("data-highlighted")).toBe(false);
  });
});
