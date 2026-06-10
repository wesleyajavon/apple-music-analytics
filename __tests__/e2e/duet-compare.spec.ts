import { expect, test, type Page } from "@playwright/test";

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

test.describe("Duet hardening (Phase 5)", () => {
  test("duet pages redirect anonymous visitors to sign-in", async ({ page }) => {
    await page.goto("/en/dashboard/duet/friends");
    await expect(page).toHaveURL(/\/en\/sign-in/);
    expect(page.url()).toContain("next=%2Fdashboard%2Fduet%2Ffriends");
  });

  test("duet API routes return 401 without session", async ({ request }) => {
    const friends = await request.get("/api/duet/friends");
    expect(friends.status()).toBe(401);

    const timeline = await request.get(
      `/api/duet/compare/timeline?friendUserId=${FOREIGN_FRIEND_ID}`
    );
    expect(timeline.status()).toBe(401);

    const invite = await request.post("/api/duet/friends/invite", {
      data: { email: "nobody@example.com" },
    });
    expect(invite.status()).toBe(401);
  });

  test("solo analytics ignore foreign userId query (no friend leak via userId)", async ({
    page,
  }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows."
    );

    await signInViaUi(page);

    const ownTimeline = await page.request.get(
      "/api/timeline?startDate=2024-01-01&endDate=2024-01-31"
    );
    const foreignTimeline = await page.request.get(
      `/api/timeline?startDate=2024-01-01&endDate=2024-01-31&userId=${FOREIGN_FRIEND_ID}`
    );

    expect(ownTimeline.status()).toBe(200);
    expect(foreignTimeline.status()).toBe(200);
    expect(await foreignTimeline.json()).toEqual(await ownTimeline.json());

    const ownArtists = await page.request.get("/api/artists?limit=5");
    const foreignArtists = await page.request.get(
      `/api/artists?limit=5&userId=${FOREIGN_FRIEND_ID}`
    );

    expect(ownArtists.status()).toBe(200);
    expect(foreignArtists.status()).toBe(200);
    expect(await foreignArtists.json()).toEqual(await ownArtists.json());
  });

  test("duet compare returns 404 for non-friend when authenticated", async ({ page }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows."
    );

    await signInViaUi(page);

    const response = await page.request.get(
      `/api/duet/compare/timeline?friendUserId=${FOREIGN_FRIEND_ID}`
    );
    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: "NOT_FOUND" })
    );
  });

  test("public demo overview hides Duet navigation links", async ({ page }) => {
    test.skip(!hasPublicDemo, "Set NEXT_PUBLIC_PUBLIC_PROFILE_USER_ID for public demo E2E.");

    await page.goto(`/en/dashboard/overview?userId=${encodeURIComponent(publicProfileId)}`);
    await expect(page.locator('a[href*="/dashboard/duet"]')).toHaveCount(0);
  });
});
