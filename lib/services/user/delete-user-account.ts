import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteUserAvatarFromStorage } from "@/lib/services/user/delete-user-avatar-storage";

export type DeleteUserAccountResult = {
  prismaUserDeleted: boolean;
  supabaseAuthDeleted: boolean;
  avatarStorageCleared: boolean;
};

/**
 * Suppression complète du compte : Prisma (cascade), avatar Storage, Supabase Auth.
 * Requiert SUPABASE_SERVICE_ROLE_KEY.
 */
export async function deleteUserAccount(userId: string): Promise<DeleteUserAccountResult> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for account deletion");
  }

  await deleteUserAvatarFromStorage(userId);

  await prisma.user.delete({ where: { id: userId } });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }

  return {
    prismaUserDeleted: true,
    supabaseAuthDeleted: true,
    avatarStorageCleared: true,
  };
}
