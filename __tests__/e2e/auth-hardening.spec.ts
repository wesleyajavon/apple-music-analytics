import { expect, test, type Page } from "@playwright/test";

const authEmail = process.env.E2E_AUTH_EMAIL?.trim() ?? "";
const authPassword = process.env.E2E_AUTH_PASSWORD?.trim() ?? "";
const hasSeededAuthUser = authEmail.length > 0 && authPassword.length > 0;

const enableSignUpFlow = process.env.E2E_AUTH_ENABLE_SIGNUP === "true";
const signUpDomain = process.env.E2E_AUTH_SIGNUP_DOMAIN?.trim() || "example.com";
const signUpPassword =
  process.env.E2E_AUTH_SIGNUP_PASSWORD?.trim() || "E2EAuthHardening#2026";

if (process.env.CI && !hasSeededAuthUser) {
  throw new Error(
    "Missing E2E auth credentials. Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD in CI."
  );
}

async function signInViaUi(page: Page) {
  await page.goto("/en/sign-in");
  await page.locator('input[type="email"]').fill(authEmail);
  await page.locator('input[type="password"]').fill(authPassword);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard(?:\/overview)?/);
}

test.describe("Auth hardening coverage", () => {
  test("auth bootstrap flow (sign-up if enabled, otherwise deterministic sign-in fallback)", async ({
    page,
  }) => {
    test.skip(
      !enableSignUpFlow && !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD or enable E2E_AUTH_ENABLE_SIGNUP=true."
    );

    if (enableSignUpFlow) {
      const uniqueEmail = `playwright-auth-${Date.now()}@${signUpDomain}`;

      await page.goto("/en/sign-up");
      await page.locator('input[type="email"]').fill(uniqueEmail);
      await page.locator('input[type="password"]').fill(signUpPassword);
      await page.locator('button[type="submit"]').click();

      // Stable assertion for email-confirmation flows.
      await expect(
        page.getByText("Account created. Check your email to confirm your sign up.")
      ).toBeVisible();
      await expect(page.locator('input[type="email"]')).toHaveValue(uniqueEmail);
      return;
    }

    await signInViaUi(page);
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
  });

  test("sign-in grants authenticated dashboard API access", async ({ page }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows."
    );

    await signInViaUi(page);
    await expect(page).toHaveURL(/\/dashboard(?:\/overview)?/);

    const overviewResponse = await page.request.get("/api/overview");
    expect(overviewResponse.status()).toBe(200);

    const overviewPayload = await overviewResponse.json();
    expect(overviewPayload).toEqual(
      expect.objectContaining({
        totalListens: expect.any(Number),
        uniqueArtists: expect.any(Number),
        uniqueTracks: expect.any(Number),
      })
    );
  });

  test("protected API returns 401 without session", async ({ request }) => {
    const response = await request.get("/api/overview");
    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: "Authentication required" })
    );
  });

  test("cross-user isolation ignores foreign userId query overrides", async ({ page }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows."
    );

    await signInViaUi(page);

    const ownScopeResponse = await page.request.get("/api/overview");
    const foreignScopeResponse = await page.request.get(
      "/api/overview?userId=00000000-0000-0000-0000-000000000999"
    );

    expect(ownScopeResponse.status()).toBe(200);
    expect(foreignScopeResponse.status()).toBe(200);

    const ownScopePayload = await ownScopeResponse.json();
    const foreignScopePayload = await foreignScopeResponse.json();

    expect(foreignScopePayload).toEqual(ownScopePayload);
  });
});
