import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureAppUserFromSession } from "@/lib/auth/ensure-app-user-from-session";

/**
 * Résout le userId courant depuis la session Supabase.
 * Fallback temporaire: query param userId (pour migration progressive).
 */
export async function getCurrentUserId(
  _request?: NextRequest
): Promise<string | undefined> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      await ensureAppUserFromSession(user);
      return user.id;
    }
  } catch {
    // Return undefined when no valid session is available.
  }
  return undefined;
}
