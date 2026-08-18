import { DASHBOARD_DATE_RANGE_FILTER_ID } from "@/lib/constants/date-range-filter";

const HIGHLIGHT_MS = 1600;

export function focusDashboardDateRangeFilter() {
  if (typeof document === "undefined") return;

  const el = document.getElementById(DASHBOARD_DATE_RANGE_FILTER_ID);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  el.setAttribute("data-highlighted", "");
  window.setTimeout(() => {
    el.removeAttribute("data-highlighted");
  }, HIGHLIGHT_MS);
}
