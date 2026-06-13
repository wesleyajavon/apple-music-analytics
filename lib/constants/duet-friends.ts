export const DUET_FRIENDS_SECTIONS = ["invite", "incoming", "outgoing", "friends"] as const;

export type DuetFriendsSection = (typeof DUET_FRIENDS_SECTIONS)[number];

export const DUET_FRIENDS_DEFAULT_PAGE_SIZE = 10;

export const DUET_FRIENDS_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export function isDuetFriendsSection(value: string | null): value is DuetFriendsSection {
  return value !== null && (DUET_FRIENDS_SECTIONS as readonly string[]).includes(value);
}

export function parseDuetFriendsPageSize(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? String(DUET_FRIENDS_DEFAULT_PAGE_SIZE), 10);
  return (DUET_FRIENDS_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DUET_FRIENDS_DEFAULT_PAGE_SIZE;
}

export function resolveDefaultDuetFriendsSection(counts: {
  friends: number;
  pendingIncoming: number;
  pendingOutgoing: number;
}): DuetFriendsSection {
  if (counts.pendingIncoming > 0) return "incoming";
  if (counts.friends > 0) return "friends";
  if (counts.pendingOutgoing > 0) return "outgoing";
  return "invite";
}

export function paginateList<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;

  return {
    items: items.slice(offset, offset + pageSize),
    total,
    totalPages,
    page: safePage,
    pageSize,
    offset,
    hasMore: safePage < totalPages,
    pageStart: total === 0 ? 0 : offset + 1,
    pageEnd: total === 0 ? 0 : Math.min(offset + pageSize, total),
  };
}
