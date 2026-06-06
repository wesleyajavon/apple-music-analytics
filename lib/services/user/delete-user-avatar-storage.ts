import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "avatars";
const AVATAR_EXTENSIONS = ["jpg", "png", "webp", "gif"] as const;

export async function deleteUserAvatarFromStorage(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  const candidatePaths = AVATAR_EXTENSIONS.map((ext) => `${userId}/avatar.${ext}`);
  await admin.storage.from(AVATAR_BUCKET).remove(candidatePaths);

  const { data: files } = await admin.storage.from(AVATAR_BUCKET).list(userId);
  if (files?.length) {
    await admin.storage
      .from(AVATAR_BUCKET)
      .remove(files.map((file) => `${userId}/${file.name}`));
  }
}
