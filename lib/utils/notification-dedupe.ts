/** Items carrying `source` + `createdAt` (ISO) for duplicate window logic. */
export type NotificationDedupeItem = {
  source?: string;
  createdAt: string;
};

/**
 * Removes entries that share `source` and fall strictly inside a recent time window
 * (`nowMs - createdAt < windowMs`), so a new notification with the same `source`
 * can replace rapid repeats.
 */
export function removeDuplicateSourcesWithinWindow<T extends NotificationDedupeItem>(
  items: T[],
  source: string,
  nowMs: number,
  windowMs: number
): T[] {
  return items.filter((n) => {
    if (n.source !== source) return true;
    const created = new Date(n.createdAt).getTime();
    if (Number.isNaN(created)) return true;
    return nowMs - created >= windowMs;
  });
}
