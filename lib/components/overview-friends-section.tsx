"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Music2, Users } from "lucide-react";
import { OverviewSectionHeader } from "@/lib/components/overview-section";
import { UserAvatar } from "@/lib/components/user-avatar";
import { useDuetFriends } from "@/lib/hooks/use-duet";
import { usePublicDemoViewer, useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import { useDashboardViewerUserId } from "@/lib/context/dashboard-viewer-context";
import {
  getDuetDisplayName,
  getDuetFriendFromFriendship,
} from "@/lib/components/duet/duet-utils";
import { buildFriendMusicHref } from "@/lib/utils/duet-compare-href";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";

type OverviewFriendsSectionProps = {
  compact?: boolean;
};

export function OverviewFriendsSection({ compact = false }: OverviewFriendsSectionProps) {
  const t = useTranslations("overview.friends");
  const searchParams = useSearchParams();
  const authUserId = useSupabaseAuthUserId();
  const viewerUserId = useDashboardViewerUserId();
  const isPublicDemoViewer = usePublicDemoViewer(viewerUserId);
  const enabled = Boolean(authUserId) && !isPublicDemoViewer;

  const { data, isLoading, isError, refetch } = useDuetFriends({ enabled });

  const acceptedFriends = useMemo(() => {
    if (!authUserId || !data?.friends) return [];
    return data.friends
      .filter((row) => row.status === "accepted")
      .map((row) => {
        const peer = getDuetFriendFromFriendship(row, authUserId);
        return {
          id: peer.id,
          name: getDuetDisplayName(peer),
          avatarUrl: peer.avatarUrl,
          musicHref: buildFriendMusicHref(searchParams, peer.id),
        };
      });
  }, [authUserId, data?.friends, searchParams]);

  const friendsHref = mergeDashboardSearchParams("/dashboard/duet/friends", searchParams);

  if (isPublicDemoViewer || authUserId === null) {
    return null;
  }

  return (
    <section className="relative">
      {compact ? (
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-foreground dark:text-white">
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
      ) : (
        <OverviewSectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
      )}

      {authUserId === undefined || isLoading ? (
        <ul className="space-y-2" aria-busy="true" aria-label={t("loadingLabel")}>
          {Array.from({ length: 3 }).map((_, index) => (
            <li
              key={index}
              className="h-[4.25rem] animate-pulse rounded-[1.25rem] border border-slate-200/80 bg-slate-100/80 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </ul>
      ) : isError ? (
        <div className="rounded-[1.35rem] border border-rose-200/80 bg-rose-50/80 px-4 py-5 dark:border-rose-400/20 dark:bg-rose-950/30">
          <p className="text-sm font-medium text-rose-800 dark:text-rose-100">{t("errorTitle")}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-rose-600 px-3.5 text-sm font-semibold text-white"
          >
            {t("errorRetry")}
          </button>
        </div>
      ) : acceptedFriends.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-slate-300/90 bg-slate-50/80 px-4 py-6 dark:border-white/15 dark:bg-white/[0.04]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-violet-600 dark:border-white/10 dark:bg-white/5 dark:text-violet-300">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground dark:text-white">
                {t("emptyTitle")}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("emptyDescription")}</p>
              <Link
                href={friendsHref}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white no-underline"
              >
                {t("emptyCta")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {acceptedFriends.map((friend) => (
            <li key={friend.id}>
              <div className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-slate-950/50">
                <UserAvatar name={friend.name} src={friend.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">
                    {friend.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{t("readOnlyHint")}</p>
                </div>
                <Link
                  href={friend.musicHref}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-3.5 text-sm font-semibold text-white no-underline shadow-md shadow-violet-500/20"
                  aria-label={t("seeMusicAria", { name: friend.name })}
                >
                  <Music2 className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{t("seeMusic")}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {acceptedFriends.length > 0 ? (
        <p className="mt-3 text-center sm:text-left">
          <Link
            href={friendsHref}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-violet-700 no-underline hover:underline dark:text-violet-300"
          >
            {t("manageFriends")}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      ) : null}
    </section>
  );
}
