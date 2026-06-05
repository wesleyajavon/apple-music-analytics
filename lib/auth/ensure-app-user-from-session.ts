import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

/**
 * Ensure the authenticated Supabase user exists in app DB.
 * Prisma User.id is the same value as Supabase auth user id.
 */
export async function ensureAppUserFromSession(user: SupabaseUser) {
  const metadataName =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    undefined;
  const safeName = metadataName?.trim() ? metadataName.trim() : undefined;
  const metadataAvatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    undefined;
  const safeAvatarUrl = metadataAvatarUrl?.trim()
    ? metadataAvatarUrl.trim()
    : undefined;

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email ?? null,
      // Never overwrite an existing DB name with null/empty metadata.
      ...(safeName !== undefined ? { name: safeName } : {}),
    },
    create: {
      id: user.id,
      email: user.email ?? null,
      name: safeName ?? null,
      avatarUrl: safeAvatarUrl ?? null,
    },
  });

  if (safeAvatarUrl !== undefined) {
    await prisma.user.updateMany({
      where: { id: user.id, avatarUrl: null },
      data: { avatarUrl: safeAvatarUrl },
    });
  }
}
