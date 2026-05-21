import type { SupabaseClient, User } from "@supabase/supabase-js";

const LIST_USERS_PAGE_SIZE = 200;
const MAX_PAGES = 25;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Looks up an auth user by email via the Admin API (paginated scan).
 * Suitable for small/medium user bases; not ideal at very large scale.
 */
export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const target = normalizeEmail(email);

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: LIST_USERS_PAGE_SIZE,
    });

    if (error) {
      throw error;
    }

    const found = data.users.find(
      (user) => user.email && normalizeEmail(user.email) === target
    );
    if (found) {
      return found;
    }

    if (data.users.length < LIST_USERS_PAGE_SIZE) {
      return null;
    }
  }

  return null;
}
