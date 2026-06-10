import { prisma } from "@/lib/prisma";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Email invites (Friendship rows) + link tokens created today count toward D9 quota. */
export async function countDuetInvitesSentToday(requesterId: string): Promise<number> {
  const since = startOfUtcDay(new Date());
  const [friendshipInvites, linkInvites] = await Promise.all([
    prisma.friendship.count({
      where: {
        requesterId,
        createdAt: { gte: since },
        status: { in: ["pending", "accepted"] },
      },
    }),
    prisma.duetInviteToken.count({
      where: {
        requesterId,
        createdAt: { gte: since },
      },
    }),
  ]);
  return friendshipInvites + linkInvites;
}
