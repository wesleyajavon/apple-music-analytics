import type { User as SupabaseUser } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

/**
 * Ensure the authenticated Supabase user exists in app DB.
 * Prisma User.id is the same value as Supabase auth user id.
 */
export async function ensureAppUserFromSession(user: SupabaseUser) {
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email ?? null,
      name:
        (user.user_metadata?.name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        null,
    },
    create: {
      id: user.id,
      email: user.email ?? null,
      name:
        (user.user_metadata?.name as string | undefined) ??
        (user.user_metadata?.full_name as string | undefined) ??
        null,
    },
  });
}
