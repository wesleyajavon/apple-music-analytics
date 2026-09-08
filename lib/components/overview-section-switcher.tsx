"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  DashboardSectionPanel,
  DashboardSectionSwitcher,
  useDashboardSectionView,
  type DashboardSectionItem,
} from "@/lib/components/dashboard-section-switcher";

export const OVERVIEW_VIEWS = [
  "spotlight",
  "tops",
  "trends",
  "context",
  "summary",
  "friends",
  "further",
] as const;

export type OverviewView = (typeof OVERVIEW_VIEWS)[number];

export function isOverviewView(value: string | null | undefined): value is OverviewView {
  return OVERVIEW_VIEWS.some((view) => view === value);
}

export function useOverviewView(available: OverviewView[]) {
  const fallback = available.includes("spotlight")
    ? "spotlight"
    : (available[0] ?? "summary");
  return useDashboardSectionView(available, fallback);
}

type OverviewSectionSwitcherProps = {
  available: OverviewView[];
  activeView: OverviewView;
  onChange: (view: OverviewView) => void;
  idPrefix: string;
};

export function OverviewSectionSwitcher({
  available,
  activeView,
  onChange,
  idPrefix,
}: OverviewSectionSwitcherProps) {
  const t = useTranslations("overview.viewSwitcher");
  const items: DashboardSectionItem<OverviewView>[] = available.map((id) => ({
    id,
    label: t(`views.${id}`),
  }));

  return (
    <DashboardSectionSwitcher
      items={items}
      activeView={activeView}
      onChange={onChange}
      idPrefix={idPrefix}
      navLabel={t("navLabel")}
    />
  );
}

export function OverviewViewPanel({
  view,
  activeView,
  idPrefix,
  children,
}: {
  view: OverviewView;
  activeView: OverviewView;
  idPrefix: string;
  children: ReactNode;
}) {
  return (
    <DashboardSectionPanel view={view} activeView={activeView} idPrefix={idPrefix}>
      {children}
    </DashboardSectionPanel>
  );
}
