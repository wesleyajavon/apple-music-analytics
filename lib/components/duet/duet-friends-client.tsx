"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Ban,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Link2,
  Mail,
  Music2,
  Send,
  Shield,
  Swords,
  UserMinus,
  X,
} from "lucide-react";
import { UserAvatar } from "@/lib/components/user-avatar";
import { EmptyState } from "@/lib/components/empty-state";
import { ErrorState } from "@/lib/components/error-state";
import { DuetFriendsHero } from "@/lib/components/duet/duet-friends-hero";
import {
  DuetFriendsContentSkeleton,
  DuetFriendsHeroSkeleton,
  DuetFriendsPageFallback,
} from "@/lib/components/duet/duet-friends-skeleton";
import {
  DASHBOARD_BTN_GHOST,
  DASHBOARD_LIST_SEPARATOR,
  DASHBOARD_SEARCH_FIELD,
  DASHBOARD_SECTION_EYEBROW,
  DASHBOARD_SECTION_TITLE,
  DASHBOARD_SEGMENTED_PILL,
  DASHBOARD_SEGMENTED_PILL_ACTIVE,
  DASHBOARD_SEGMENTED_TRACK,
} from "@/lib/components/dashboard-ui";
import {
  DUET_FRIENDS_PAGE_SIZE_OPTIONS,
  isDuetFriendsSection,
  paginateList,
  parseDuetFriendsPageSize,
  resolveDefaultDuetFriendsSection,
  type DuetFriendsSection,
} from "@/lib/constants/duet-friends";
import { DuetSubNav } from "@/lib/components/duet/duet-sub-nav";
import {
  DuetFriendsMobileError,
  DuetFriendsMobileExperience,
  DuetFriendsMobileGated,
  DuetFriendsMobileSkeleton,
} from "@/lib/components/duet/duet-friends-mobile";
import { useDuetFriends, useDuetMutations, type DuetShareScopeOption } from "@/lib/hooks/use-duet";
import { usePublicDemoViewer, useSupabaseAuthUserId } from "@/lib/hooks/use-public-demo-viewer";
import type { FriendshipDto } from "@/lib/dto/duet";
import { getDuetDisplayName } from "@/lib/components/duet/duet-utils";
import { mergeDashboardSearchParams } from "@/lib/utils/dashboard-search-params";
import { buildFriendMusicHref } from "@/lib/utils/duet-compare-href";

function SpotlightSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: "violet" | "lime" | "cyan";
}) {
  return (
    <div className="pb-4">
      <p className={DASHBOARD_SECTION_EYEBROW}>{eyebrow}</p>
      <h2 className={`mt-1 ${DASHBOARD_SECTION_TITLE}`}>{title}</h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted">{description}</p>
      ) : null}
    </div>
  );
}

function DuetFriendsSectionNav({
  activeSection,
  counts,
  onSelect,
}: {
  activeSection: DuetFriendsSection;
  counts: { friends: number; pendingIncoming: number; pendingOutgoing: number };
  onSelect: (section: DuetFriendsSection) => void;
}) {
  const t = useTranslations("duet.friends");

  const segments: {
    value: DuetFriendsSection;
    label: string;
    count?: number;
    accent?: "amber" | "lime";
  }[] = [
    { value: "invite", label: t("navInvite") },
    {
      value: "incoming",
      label: t("navIncoming"),
      count: counts.pendingIncoming,
      accent: "amber",
    },
    { value: "outgoing", label: t("navOutgoing"), count: counts.pendingOutgoing },
    { value: "friends", label: t("navFriends"), count: counts.friends, accent: "lime" },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("navLabel")}
      className={`${DASHBOARD_SEGMENTED_TRACK} w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
    >
      {segments.map((segment) => {
        const selected = activeSection === segment.value;
        return (
          <button
            key={segment.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(segment.value)}
            className={`${selected ? DASHBOARD_SEGMENTED_PILL_ACTIVE : DASHBOARD_SEGMENTED_PILL} gap-2`}
          >
            {segment.label}
            {segment.count !== undefined && segment.count > 0 ? (
              <span className="tabular-nums text-[12px] text-muted">
                {segment.count > 99 ? "99+" : segment.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function FriendsListPagination({
  page,
  pageSize,
  totalPages,
  pageStart,
  pageEnd,
  total,
  hasMore,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  pageStart: number;
  pageEnd: number;
  total: number;
  hasMore: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
}) {
  const t = useTranslations("duet.friends");

  if (total <= DUET_FRIENDS_PAGE_SIZE_OPTIONS[0]) return null;

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-glass-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-muted">
        {t("paginationSummary", { start: pageStart, end: pageEnd, total })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={DASHBOARD_BTN_GHOST}
        >
          {t("paginationPrevious")}
        </button>
        <label className="inline-flex items-center gap-2 text-[13px] text-muted">
          <span>{t("pageSizeLabel")}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="min-h-11 rounded-full border border-glass-hairline bg-surface-raised px-3 text-[13px] text-foreground"
          >
            {DUET_FRIENDS_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span className="px-2 text-[13px] text-muted">
          {t("paginationPage", { page, totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore}
          className={DASHBOARD_BTN_GHOST}
        >
          {t("paginationNext")}
        </button>
      </div>
    </div>
  );
}

function StatusPill({
  variant,
  children,
}: {
  variant: "incoming" | "outgoing" | "accepted";
  children: ReactNode;
}) {
  const classes =
    variant === "incoming"
      ? "border-amber-200/90 bg-amber-50/90 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
      : variant === "outgoing"
        ? "border-slate-200/90 bg-slate-50/90 text-slate-600 dark:border-white/15 dark:bg-white/10 dark:text-slate-300"
        : "border-emerald-200/90 bg-emerald-50/90 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${classes}`}>
      {children}
    </span>
  );
}

function DuetShareScopeFieldset({
  groupName,
  legend,
  value,
  onChange,
  disabled = false,
  showLegend = true,
}: {
  groupName: string;
  legend: string;
  value: DuetShareScopeOption;
  onChange: (scope: DuetShareScopeOption) => void;
  disabled?: boolean;
  showLegend?: boolean;
}) {
  const tAccept = useTranslations("duet.inviteAccept");

  const options = [
    {
      value: "aggregates" as const,
      label: tAccept("scopeAggregates.label"),
      description: tAccept("scopeAggregates.description"),
    },
    {
      value: "full" as const,
      label: tAccept("scopeFull.label"),
      description: tAccept("scopeFull.description"),
    },
  ] satisfies { value: DuetShareScopeOption; label: string; description: string }[];

  return (
    <fieldset
      className="w-full sm:min-w-[18rem] sm:max-w-sm"
      disabled={disabled}
      aria-label={showLegend ? undefined : legend}
    >
      {showLegend ? (
        <legend className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
          <Shield className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400" aria-hidden />
          {legend}
        </legend>
      ) : null}
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              } ${
                selected
                  ? "border-violet-400/80 bg-violet-50 shadow-sm dark:border-violet-400/45 dark:bg-violet-950/55"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:hover:border-white/20 dark:hover:bg-slate-900/80"
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  selected
                    ? "border-violet-600 bg-violet-600 dark:border-violet-400 dark:bg-violet-500"
                    : "border-slate-300 bg-white dark:border-slate-500 dark:bg-slate-800"
                }`}
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-semibold ${
                    selected
                      ? "text-violet-950 dark:text-violet-50"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {option.label}
                </span>
                <span
                  className={`mt-0.5 block text-xs leading-relaxed ${
                    selected
                      ? "text-violet-800/80 dark:text-violet-200/90"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function FriendRow({
  friendship,
  viewerId,
  onAccept,
  onDecline,
  onRevoke,
  onUpdateShareScope,
  onBlock,
  busy,
}: {
  friendship: FriendshipDto;
  viewerId: string;
  onAccept: (id: string, scope: DuetShareScopeOption) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
  onUpdateShareScope: (id: string, scope: DuetShareScopeOption) => void;
  onBlock: (id: string) => void;
  busy: boolean;
}) {
  const t = useTranslations("duet.friends");
  const tAccept = useTranslations("duet.inviteAccept");
  const searchParams = useSearchParams();
  const peer =
    friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
  const displayName = getDuetDisplayName(peer);
  const musicHref = buildFriendMusicHref(searchParams, peer.id);
  const [pendingShareScope, setPendingShareScope] = useState<DuetShareScopeOption>("aggregates");
  const activeShareScope =
    friendship.status === "accepted" && friendship.shareScope !== "none"
      ? (friendship.shareScope as DuetShareScopeOption)
      : pendingShareScope;

  const isIncoming = friendship.direction === "incoming" && friendship.status === "pending";
  const isOutgoing = friendship.direction === "outgoing" && friendship.status === "pending";
  const isAccepted = friendship.status === "accepted";

  return (
    <li
      className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between ${DASHBOARD_LIST_SEPARATOR}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar name={displayName} src={peer.avatarUrl} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{displayName}</p>
            {isIncoming ? (
              <StatusPill variant="incoming">
                <Clock className="h-3 w-3" aria-hidden />
                {t("statusIncoming")}
              </StatusPill>
            ) : null}
            {isOutgoing ? (
              <StatusPill variant="outgoing">
                <Clock className="h-3 w-3" aria-hidden />
                {t("statusPending")}
              </StatusPill>
            ) : null}
            {isAccepted ? (
              <StatusPill variant="accepted">
                <Check className="h-3 w-3" aria-hidden />
                {t("statusAccepted")}
              </StatusPill>
            ) : null}
          </div>
          {peer.email ? (
            <p className={`mt-0.5 truncate text-sm text-muted`}>{peer.email}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isOutgoing ? (
          <span className={`text-sm text-muted`}>{t("pendingOutgoingStatus")}</span>
        ) : null}

        {isIncoming ? (
          <>
            <DuetShareScopeFieldset
              groupName={`duet-share-scope-accept-${friendship.id}`}
              legend={tAccept("sharePrompt")}
              value={pendingShareScope}
              onChange={setPendingShareScope}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept(friendship.id, pendingShareScope)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            >
              <Check className="h-4 w-4" aria-hidden />
              {t("accept")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(friendship.id)}
              className={`${DASHBOARD_BTN_GHOST} gap-1.5`}
            >
              <X className="h-4 w-4" aria-hidden />
              {t("decline")}
            </button>
          </>
        ) : null}

        {isAccepted ? (
          <details className="group w-full rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-white/10 dark:bg-black/25 sm:min-w-[18rem] sm:max-w-sm">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-left">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-violet-500 dark:text-violet-400" aria-hidden />
                  {t("shareScopeLabel")}
                </p>
                <p className={`mt-0.5 truncate text-xs text-muted`}>
                  {activeShareScope === "full"
                    ? tAccept("scopeFull.label")
                    : tAccept("scopeAggregates.label")}
                </p>
              </div>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180 dark:text-slate-400"
                aria-hidden
              />
            </summary>
            <div className="space-y-3 border-t border-slate-200/80 px-3 py-3 dark:border-white/10">
              <DuetShareScopeFieldset
                groupName={`duet-share-scope-friend-${friendship.id}`}
                legend={t("shareScopeLabel")}
                value={activeShareScope}
                onChange={(scope) => {
                  if (scope !== friendship.shareScope) {
                    onUpdateShareScope(friendship.id, scope);
                  }
                }}
                disabled={busy}
                showLegend={false}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/duet/compare?friendUserId=${encodeURIComponent(peer.id)}`}
                  className={`${DASHBOARD_BTN_GHOST} gap-1.5 no-underline text-foreground`}
                >
                  <Swords className="h-4 w-4" aria-hidden />
                  {t("compare")}
                </Link>
                <Link
                  href={musicHref}
                  className={`${DASHBOARD_BTN_GHOST} gap-1.5 no-underline`}
                >
                  <Music2 className="h-4 w-4" aria-hidden />
                  {t("seeMusic")}
                </Link>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRevoke(friendship.id)}
                  className={`${DASHBOARD_BTN_GHOST} gap-1.5`}
                >
                  <UserMinus className="h-4 w-4" aria-hidden />
                  {t("revoke")}
                </button>
              </div>
            </div>
          </details>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => onBlock(friendship.id)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200/90 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <Ban className="h-4 w-4" aria-hidden />
          {t("block")}
        </button>
      </div>
    </li>
  );
}

function FriendsListSection({
  eyebrow,
  title,
  friendships,
  viewerId,
  busy,
  onAccept,
  onDecline,
  onRevoke,
  onUpdateShareScope,
  onBlock,
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  eyebrow: string;
  title: string;
  friendships: FriendshipDto[];
  viewerId: string;
  busy: boolean;
  onAccept: (id: string, scope: DuetShareScopeOption) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
  onUpdateShareScope: (id: string, scope: DuetShareScopeOption) => void;
  onBlock: (id: string) => void;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages: number;
    pageStart: number;
    pageEnd: number;
    total: number;
    hasMore: boolean;
  };
  onPageChange?: (nextPage: number) => void;
  onPageSizeChange?: (nextPageSize: number) => void;
}) {
  if (!friendships.length) return null;

  return (
    <section>
      <SpotlightSectionHeader eyebrow={eyebrow} title={title} />
      <ul>
        {friendships.map((f) => (
          <FriendRow
            key={f.id}
            friendship={f}
            viewerId={viewerId}
            busy={busy}
            onAccept={onAccept}
            onDecline={onDecline}
            onRevoke={onRevoke}
            onUpdateShareScope={onUpdateShareScope}
            onBlock={onBlock}
          />
        ))}
      </ul>
      {pagination && onPageChange && onPageSizeChange ? (
        <FriendsListPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          pageStart={pagination.pageStart}
          pageEnd={pagination.pageEnd}
          total={pagination.total}
          hasMore={pagination.hasMore}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </section>
  );
}

function DuetFriendsContent() {
  const t = useTranslations("duet.friends");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const authUserId = useSupabaseAuthUserId();
  const userIdFromUrl = searchParams.get("userId");
  const isPublicDemoViewer = usePublicDemoViewer(userIdFromUrl);
  const viewerId = authUserId ?? null;
  const withFilters = useCallback(
    (href: string) => mergeDashboardSearchParams(href, searchParams),
    [searchParams]
  );
  const hrefForMusic = useCallback(
    (friendId: string) => buildFriendMusicHref(searchParams, friendId),
    [searchParams]
  );
  const { data, isLoading, error, refetch } = useDuetFriends({
    enabled: authUserId !== undefined && !isPublicDemoViewer,
  });
  const { invite, patchFriendship, blockFriendship, createInviteLink } = useDuetMutations();
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [inviteLinkUrl, setInviteLinkUrl] = useState<string | null>(null);
  const [inviteLinkExpiresAt, setInviteLinkExpiresAt] = useState<string | null>(null);
  const [linkFeedback, setLinkFeedback] = useState<string | null>(null);

  const busy =
    invite.isPending ||
    patchFriendship.isPending ||
    blockFriendship.isPending ||
    createInviteLink.isPending;

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setFeedbackError(false);
    try {
      await invite.mutateAsync(email.trim());
      setEmail("");
      setFeedback(t("inviteSent"));
    } catch {
      setFeedback(t("inviteError"));
      setFeedbackError(true);
    }
  }

  async function handleCreateInviteLink() {
    setLinkFeedback(null);
    try {
      const result = await createInviteLink.mutateAsync();
      setInviteLinkUrl(result.url);
      setInviteLinkExpiresAt(result.expiresAt);
      setLinkFeedback(t("inviteLinkGenerated"));
    } catch {
      setLinkFeedback(t("inviteLinkError"));
    }
  }

  async function handleCopyInviteLink() {
    if (!inviteLinkUrl) return;
    try {
      await navigator.clipboard.writeText(inviteLinkUrl);
      setLinkFeedback(t("inviteLinkCopied"));
    } catch {
      setLinkFeedback(t("inviteLinkCopyError"));
    }
  }

  const friendsCount = data?.friends.length ?? 0;
  const pendingIncomingCount = data?.pendingIncoming.length ?? 0;
  const pendingOutgoingCount = data?.pendingOutgoing.length ?? 0;

  const sectionCounts = useMemo(
    () => ({
      friends: friendsCount,
      pendingIncoming: pendingIncomingCount,
      pendingOutgoing: pendingOutgoingCount,
    }),
    [friendsCount, pendingIncomingCount, pendingOutgoingCount]
  );

  const sectionParam = searchParams.get("section");
  const activeSection = isDuetFriendsSection(sectionParam)
    ? sectionParam
    : resolveDefaultDuetFriendsSection(sectionCounts);

  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = parseDuetFriendsPageSize(searchParams.get("pageSize"));

  const updateFriendsParams = useCallback(
    (next: { section?: DuetFriendsSection; page?: number; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextSection = next.section ?? activeSection;
      params.set("section", nextSection);

      const nextPageSize = next.pageSize ?? pageSize;
      params.set("pageSize", String(nextPageSize));

      const nextPage = next.page ?? (next.section !== undefined || next.pageSize !== undefined ? 1 : page);
      params.set("page", String(Math.max(1, nextPage)));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [activeSection, page, pageSize, pathname, router, searchParams]
  );

  const handleSectionChange = useCallback(
    (nextSection: DuetFriendsSection) => {
      updateFriendsParams({ section: nextSection, page: 1 });
    },
    [updateFriendsParams]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      updateFriendsParams({ page: nextPage });
    },
    [updateFriendsParams]
  );

  const handlePageSizeChange = useCallback(
    (nextPageSize: number) => {
      updateFriendsParams({ pageSize: nextPageSize, page: 1 });
    },
    [updateFriendsParams]
  );

  const incomingPagination = useMemo(
    () => paginateList(data?.pendingIncoming ?? [], page, pageSize),
    [data?.pendingIncoming, page, pageSize]
  );
  const outgoingPagination = useMemo(
    () => paginateList(data?.pendingOutgoing ?? [], page, pageSize),
    [data?.pendingOutgoing, page, pageSize]
  );
  const friendsPagination = useMemo(
    () => paginateList(data?.friends ?? [], page, pageSize),
    [data?.friends, page, pageSize]
  );

  useEffect(() => {
    const currentListTotal =
      activeSection === "incoming"
        ? pendingIncomingCount
        : activeSection === "outgoing"
          ? pendingOutgoingCount
          : activeSection === "friends"
            ? friendsCount
            : 0;

    if (currentListTotal === 0) return;

    const totalPages = Math.max(1, Math.ceil(currentListTotal / pageSize));
    if (page > totalPages) {
      updateFriendsParams({ page: totalPages });
    }
  }, [
    activeSection,
    friendsCount,
    page,
    pageSize,
    pendingIncomingCount,
    pendingOutgoingCount,
    updateFriendsParams,
  ]);

  useEffect(() => {
    if (isLoading || !data) return;

    const resolved = isDuetFriendsSection(sectionParam)
      ? sectionParam
      : resolveDefaultDuetFriendsSection(sectionCounts);

    if (sectionParam !== resolved) {
      updateFriendsParams({ section: resolved, page: 1 });
    }
  }, [data, isLoading, sectionCounts, sectionParam, updateFriendsParams]);

  if (authUserId === undefined || (isLoading && !isPublicDemoViewer)) {
    return (
      <>
        <div className="lg:hidden">
          <DuetFriendsMobileSkeleton locale={locale} />
        </div>
        <div className="hidden space-y-8 lg:block">
          <DuetSubNav />
          <DuetFriendsHeroSkeleton />
          <DuetFriendsContentSkeleton />
        </div>
      </>
    );
  }

  if (isPublicDemoViewer) {
    return (
      <>
        <div className="lg:hidden">
          <DuetFriendsMobileGated locale={locale} withFilters={withFilters} />
        </div>
        <div className="hidden space-y-8 lg:block">
          <DuetSubNav />
          <EmptyState
            variant="startup"
            message={t("emptyTitle")}
            description={t("emptyDescription")}
            actions={[{ label: t("mobile.gatedCta"), href: "/sign-in" }]}
          />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="lg:hidden">
          <DuetFriendsMobileError locale={locale} onRetry={() => refetch()} />
        </div>
        <div className="hidden space-y-8 lg:block">
          <DuetSubNav />
          <DuetFriendsHero
            friendsCount={0}
            pendingIncomingCount={0}
            pendingOutgoingCount={0}
            locale={locale}
          />
          <ErrorState variant="startup" error={error} message={t("error")} onRetry={() => refetch()} />
        </div>
      </>
    );
  }

  const hasAny = friendsCount + pendingIncomingCount + pendingOutgoingCount > 0;

  const mutationHandlers = {
    onAccept: (id: string, scope: DuetShareScopeOption) =>
      patchFriendship.mutate({ id, action: "accept", shareScope: scope }),
    onDecline: (id: string) => patchFriendship.mutate({ id, action: "decline" }),
    onRevoke: (id: string) => patchFriendship.mutate({ id, action: "revoke" }),
    onUpdateShareScope: (id: string, scope: DuetShareScopeOption) =>
      patchFriendship.mutate({ id, action: "updateShareScope", shareScope: scope }),
    onBlock: (id: string) => blockFriendship.mutate(id),
  };

  const listPaginationProps = {
    page,
    pageSize,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
  };

  const inviteSection = (
    <section>
      <SpotlightSectionHeader
        eyebrow={t("inviteEyebrow")}
        title={t("inviteTitle")}
        description={t("inviteDescription")}
      />
      <div>
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("invitePlaceholder")}
              className={`${DASHBOARD_SEARCH_FIELD}`}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className={`${DASHBOARD_BTN_GHOST} gap-2 text-foreground disabled:opacity-50`}
          >
            <Send className="h-4 w-4" aria-hidden />
            {t("inviteSubmit")}
          </button>
        </form>
        {feedback ? (
          <p
            className={`mt-3 text-sm ${feedbackError ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {feedback}
          </p>
        ) : null}

        <div className="mt-6 border-t border-glass-hairline pt-6">
          <div className="mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">{t("inviteLinkTitle")}</h3>
          </div>
          <p className="mb-4 text-sm leading-6 text-muted">{t("inviteLinkDescription")}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCreateInviteLink()}
              className={`${DASHBOARD_BTN_GHOST} gap-2 disabled:opacity-50`}
            >
              <Link2 className="h-4 w-4" aria-hidden />
              {t("inviteLinkGenerate")}
            </button>
            {inviteLinkUrl ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCopyInviteLink()}
                className={`${DASHBOARD_BTN_GHOST} gap-2 text-foreground disabled:opacity-50`}
              >
                <Copy className="h-4 w-4" aria-hidden />
                {t("inviteLinkCopy")}
              </button>
            ) : null}
          </div>
          {inviteLinkUrl ? (
            <p className="mt-3 break-all rounded-2xl border border-glass-hairline bg-surface-raised/60 px-3 py-2 font-mono text-xs text-foreground">
              {inviteLinkUrl}
            </p>
          ) : null}
          {inviteLinkExpiresAt ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {t("inviteLinkExpires", {
                date: new Date(inviteLinkExpiresAt).toLocaleString(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          ) : null}
          {linkFeedback ? (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{linkFeedback}</p>
          ) : null}
        </div>
      </div>
    </section>
  );

  return (
    <>
      {viewerId ? (
        <div className="lg:hidden">
          <DuetFriendsMobileExperience
            locale={locale}
            viewerId={viewerId}
            activeSection={activeSection}
            counts={sectionCounts}
            incoming={incomingPagination}
            outgoing={outgoingPagination}
            friends={friendsPagination}
            busy={busy}
            email={email}
            onEmailChange={setEmail}
            onInvite={handleInvite}
            inviteFeedback={feedback}
            inviteFeedbackError={feedbackError}
            onCreateInviteLink={() => void handleCreateInviteLink()}
            onCopyInviteLink={() => void handleCopyInviteLink()}
            inviteLinkUrl={inviteLinkUrl}
            inviteLinkExpiresAt={inviteLinkExpiresAt}
            linkFeedback={linkFeedback}
            withFilters={withFilters}
            hrefForMusic={hrefForMusic}
            onSectionChange={handleSectionChange}
            onPageChange={handlePageChange}
            {...mutationHandlers}
          />
        </div>
      ) : (
        <div className="lg:hidden">
          <DuetFriendsMobileSkeleton locale={locale} />
        </div>
      )}
      <div className="hidden space-y-8 lg:block">
        <DuetSubNav />

      <DuetFriendsHero
        friendsCount={friendsCount}
        pendingIncomingCount={pendingIncomingCount}
        pendingOutgoingCount={pendingOutgoingCount}
        locale={locale}
      />

      <DuetFriendsSectionNav
        activeSection={activeSection}
        counts={sectionCounts}
        onSelect={handleSectionChange}
      />

      {activeSection === "invite" ? inviteSection : null}

      {activeSection === "incoming" && viewerId ? (
        incomingPagination.total > 0 ? (
          <FriendsListSection
            eyebrow={t("incomingEyebrow")}
            title={t("pendingIncoming")}
            friendships={incomingPagination.items}
            viewerId={viewerId}
            busy={busy}
            pagination={incomingPagination}
            {...listPaginationProps}
            {...mutationHandlers}
          />
        ) : (
          <EmptyState variant="startup" message={t("emptyIncoming")} description={t("emptyIncomingDescription")} />
        )
      ) : null}

      {activeSection === "outgoing" && viewerId ? (
        outgoingPagination.total > 0 ? (
          <FriendsListSection
            eyebrow={t("outgoingEyebrow")}
            title={t("pendingOutgoing")}
            friendships={outgoingPagination.items}
            viewerId={viewerId}
            busy={busy}
            pagination={outgoingPagination}
            {...listPaginationProps}
            {...mutationHandlers}
          />
        ) : (
          <EmptyState variant="startup" message={t("emptyOutgoing")} description={t("emptyOutgoingDescription")} />
        )
      ) : null}

      {activeSection === "friends" && viewerId ? (
        friendsPagination.total > 0 ? (
          <FriendsListSection
            eyebrow={t("rosterEyebrow")}
            title={t("friendsList")}
            friendships={friendsPagination.items}
            viewerId={viewerId}
            busy={busy}
            pagination={friendsPagination}
            {...listPaginationProps}
            {...mutationHandlers}
          />
        ) : (
          <EmptyState
            variant="startup"
            message={t("emptyFriendsSection")}
            description={t("emptyFriendsSectionDescription")}
            actions={hasAny ? undefined : [{ label: t("navInvite"), href: "/dashboard/duet/friends?section=invite" }]}
          />
        )
      ) : null}
      </div>
    </>
  );
}

export function DuetFriendsClient() {
  return (
    <Suspense fallback={<DuetFriendsPageFallback />}>
      <DuetFriendsContent />
    </Suspense>
  );
}
