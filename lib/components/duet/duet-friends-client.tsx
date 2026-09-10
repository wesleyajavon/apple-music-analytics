"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  Ban,
  Check,
  Clock,
  Copy,
  Link2,
  Mail,
  Music2,
  Send,
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
  DASHBOARD_LIST_ROW,
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
import { useDuetFriends, useDuetMutations } from "@/lib/hooks/use-duet";
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

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
      {children}
    </span>
  );
}

function FriendRow({
  friendship,
  viewerId,
  onAccept,
  onDecline,
  onRevoke,
  onBlock,
  busy,
}: {
  friendship: FriendshipDto;
  viewerId: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
  onBlock: (id: string) => void;
  busy: boolean;
}) {
  const t = useTranslations("duet.friends");
  const searchParams = useSearchParams();
  const peer =
    friendship.requester.id === viewerId ? friendship.addressee : friendship.requester;
  const displayName = getDuetDisplayName(peer);
  const musicHref = buildFriendMusicHref(searchParams, peer.id);

  const isIncoming = friendship.direction === "incoming" && friendship.status === "pending";
  const isOutgoing = friendship.direction === "outgoing" && friendship.status === "pending";
  const isAccepted = friendship.status === "accepted";

  return (
    <li className={`${DASHBOARD_LIST_SEPARATOR}`}>
      <div className={`${DASHBOARD_LIST_ROW} flex-wrap items-start sm:flex-nowrap sm:items-center`}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <UserAvatar name={displayName} src={peer.avatarUrl} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-foreground">{displayName}</p>
              {isIncoming ? (
                <StatusPill>
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {t("statusIncoming")}
                </StatusPill>
              ) : null}
              {isOutgoing ? (
                <StatusPill>
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {t("statusPending")}
                </StatusPill>
              ) : null}
              {isAccepted ? (
                <StatusPill>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  {t("statusAccepted")}
                </StatusPill>
              ) : null}
            </div>
            {peer.email ? (
              <p className="mt-0.5 truncate text-[13px] text-muted">{peer.email}</p>
            ) : null}
            {isIncoming ? (
              <p className="mt-1 text-[13px] leading-5 text-muted">{t("acceptShareHint")}</p>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {isOutgoing ? (
            <span className="text-[13px] text-muted">{t("pendingOutgoingStatus")}</span>
          ) : null}

          {isIncoming ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAccept(friendship.id)}
                className={`${DASHBOARD_BTN_GHOST} gap-1.5 text-foreground disabled:opacity-50`}
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
          ) : null}

          <button
            type="button"
            disabled={busy}
            onClick={() => onBlock(friendship.id)}
            className={`${DASHBOARD_BTN_GHOST} gap-1.5 text-red-700 dark:text-red-300`}
          >
            <Ban className="h-4 w-4" aria-hidden />
            {t("block")}
          </button>
        </div>
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
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onRevoke: (id: string) => void;
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
    onAccept: (id: string) => patchFriendship.mutate({ id, action: "accept" }),
    onDecline: (id: string) => patchFriendship.mutate({ id, action: "decline" }),
    onRevoke: (id: string) => patchFriendship.mutate({ id, action: "revoke" }),
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
            <p className="mt-3 break-all font-mono text-xs text-muted">{inviteLinkUrl}</p>
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
