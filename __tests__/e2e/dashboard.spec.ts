import { test, expect } from "@playwright/test";

/**
 * E2E tests for Dashboard navigation and functionality.
 * Uses /en/ locale explicitly for deterministic, locale-independent tests.
 * Asserts structure and visibility, not exact translated text.
 */
test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en");
  });

  test("should load the home page", async ({ page }) => {
    await expect(page).toHaveTitle(/Soundprint/i);
  });

  test("should navigate to dashboard overview", async ({ page }) => {
    await page.goto("/en/dashboard/overview");

    await expect(page).toHaveURL(/\/en\/dashboard\/overview/);

    const mainContent = page.locator("main, [role='main']").first();
    await expect(mainContent).toBeVisible();
  });

  test("should navigate to timeline page", async ({ page }) => {
    await page.goto("/en/dashboard/timeline");
    await expect(page).toHaveURL(/\/en\/dashboard\/timeline/);

    const mainContent = page.locator("main, [role='main']").first();
    await expect(mainContent).toBeVisible();
  });

  test("should navigate to genres page", async ({ page }) => {
    await page.goto("/en/dashboard/genres");
    await expect(page).toHaveURL(/\/en\/dashboard\/genres/);

    const mainContent = page.locator("main, [role='main']").first();
    await expect(mainContent).toBeVisible();
  });

});

test.describe("Dashboard API Integration", () => {
  test("should fetch overview stats from API", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/overview") && response.status() === 200
    );

    await page.goto("/en/dashboard/overview");

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("totalListens");
    expect(data).toHaveProperty("uniqueArtists");
    expect(data).toHaveProperty("uniqueTracks");
  });

  test("should fetch timeline data from API", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/timeline") && response.status() === 200
    );

    await page.goto("/en/dashboard/timeline");

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("should fetch genres data from API", async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/genres") && response.status() === 200
    );

    await page.goto("/en/dashboard/genres");

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("totalListens");
    expect(Array.isArray(data.data)).toBe(true);
  });
});

test.describe("Dashboard UI Elements", () => {
  test("should display loading states", async ({ page }) => {
    await page.goto("/en/dashboard/overview");

    const loadingIndicator = page
      .locator('[aria-label*="loading"], [data-testid*="loading"]')
      .first();

    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
  });

  test("should handle error states gracefully", async ({ page }) => {
    await page.route("/api/overview", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/en/dashboard/overview");

    const errorMessage = page
      .locator('[role="alert"], [data-testid*="error"]')
      .first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Theme Switcher", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/dashboard/overview");
  });

  test("should display Theme Switcher in sidebar", async ({ page }) => {
    const themeSwitcher = page.getByRole("button", { name: /change theme/i });
    await expect(themeSwitcher).toBeVisible();
  });

  test("should open dropdown on click", async ({ page }) => {
    const themeSwitcher = page.getByRole("button", { name: /change theme/i });
    await expect(themeSwitcher).toHaveAttribute("aria-expanded", "false");

    await themeSwitcher.click();

    await expect(themeSwitcher).toHaveAttribute("aria-expanded", "true");
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
  });

  test("should apply dark theme when selecting Dark option", async ({ page }) => {
    const themeSwitcher = page.getByRole("button", { name: /change theme/i });
    await themeSwitcher.click();

    const darkOption = page.getByRole("option", { name: /^dark$/i });
    await darkOption.click();

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });

  test("should persist theme selection after page reload", async ({ page }) => {
    const themeSwitcher = page.getByRole("button", { name: /change theme/i });
    await themeSwitcher.click();

    const darkOption = page.getByRole("option", { name: /^dark$/i });
    await darkOption.click();

    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();

    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("Dashboard Performance", () => {
  test("should load overview page within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/en/dashboard/overview");

    await page
      .locator("main, [role='main']")
      .first()
      .waitFor({ state: "visible" });

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test("should have reasonable number of DOM nodes", async ({ page }) => {
    await page.goto("/en/dashboard/overview");

    const nodeCount = await page.evaluate(
      () => document.querySelectorAll("*").length
    );

    expect(nodeCount).toBeLessThan(2000);
  });
});
