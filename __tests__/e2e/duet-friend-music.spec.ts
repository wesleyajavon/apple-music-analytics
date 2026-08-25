import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Playwright workers do not inherit Next env files; match global-setup loading.
loadEnvConfig(process.cwd());

const authEmail = process.env.E2E_AUTH_EMAIL?.trim() ?? "";
const authPassword = process.env.E2E_AUTH_PASSWORD?.trim() ?? "";
const hasSeededAuthUser = authEmail.length > 0 && authPassword.length > 0;

const publicProfileId = process.env.NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID?.trim() ?? "";
const hasPublicDemo = publicProfileId.length > 0;

/** Valid UUID v4 shape — must not match a real friend in test DB. */
const FOREIGN_FRIEND_ID = "22222222-2222-4222-8222-222222222222";

async function signInViaUi(page: Page) {
  await page.goto("/en/sign-in");
  await page.locator('input[type="email"]').fill(authEmail);
  await page.locator('input[type="password"]').fill(authPassword);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard(?:\/overview)?/);
}

test.describe("Duet friend music hardening (step 5)", () => {
  test("friend-overview API returns 401 without session", async ({ request }) => {
    const response = await request.get(
      `/api/duet/friend-overview?friendUserId=${FOREIGN_FRIEND_ID}`
    );
    expect(response.status()).toBe(401);
  });

  test("friend music page redirects anonymous visitors to sign-in", async ({ page }) => {
    await page.goto("/en/dashboard/duet/music");
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });

  test("friend-overview returns 404 for non-friend when authenticated", async ({
    page,
  }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows."
    );

    await signInViaUi(page);

    const response = await page.request.get(
      `/api/duet/friend-overview?friendUserId=${FOREIGN_FRIEND_ID}`
    );
    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: "NOT_FOUND" })
    );
  });

  test("solo overview ignores foreign userId query (no friend leak via userId)", async ({
    page,
  }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows."
    );

    await signInViaUi(page);

    const ownOverview = await page.request.get("/api/overview");
    const foreignOverview = await page.request.get(
      `/api/overview?userId=${FOREIGN_FRIEND_ID}`
    );

    expect(ownOverview.status()).toBe(200);
    expect(foreignOverview.status()).toBe(200);
    expect(await foreignOverview.json()).toEqual(await ownOverview.json());
  });

  test("public demo overview hides Duet and friend-music navigation", async ({
    page,
  }) => {
    test.skip(!hasPublicDemo, "Set NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID for public demo E2E.");

    await page.goto(`/en/dashboard/overview?userId=${encodeURIComponent(publicProfileId)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator('a[href*="/dashboard/duet"]')).toHaveCount(0);
    await expect(page.locator('a[href*="/dashboard/duet/music"]')).toHaveCount(0);
  });
});
