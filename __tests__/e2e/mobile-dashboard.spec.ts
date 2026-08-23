import { test, expect } from "@playwright/test";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "../../lib/constants/public-profile";

const publicDemoQuery = `?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`;

test.describe("Mobile dashboard UX", () => {
  test("home exposes mobile menu and header sign-in", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Hamburger is mobile-only");

    await page.goto("/en");

    await expect(page.getByRole("button", { name: /open page sections menu/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("region", { name: /quick actions/i })).toHaveCount(0);
  });

  test("dashboard overview loads with mobile bottom nav", async ({ page }) => {
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);

    const bottomNav = page.getByRole("navigation", { name: /main dashboard navigation/i });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole("link", { name: /your music/i })).toBeVisible();
  });

  test("overview now screen shows insight and ask destination", async ({ page }) => {
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: /overview sections/i })).toHaveCount(0);
    await expect(main.getByRole("link", { name: /^ask your soundprint$/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("overview now screen is usable in French", async ({ page }) => {
    await page.goto(`/fr/dashboard/overview${publicDemoQuery}`);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("tablist", { name: /sections de la vue d['’]ensemble/i })
    ).toHaveCount(0);
    await expect(main.getByRole("link", { name: /^interroger soundprint$/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("musical profile hub shows signature and destinations", async ({ page }) => {
    await page.goto(`/en/dashboard/musical-profile${publicDemoQuery}`);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(main.getByRole("link", { name: /^your music$/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /soundprint chat/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /^duet$/i })).toBeVisible();
  });

  test("musical profile hub is usable in French", async ({ page }) => {
    await page.goto(`/fr/dashboard/musical-profile${publicDemoQuery}`);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(main.getByRole("link", { name: /^your music$/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /soundprint chat/i })).toBeVisible();
    await expect(main.getByRole("link", { name: /^duet$/i })).toBeVisible();
  });

  test("genres page shows distribution chart on mobile", async ({ page }) => {
    await page.goto(`/en/dashboard/genres${publicDemoQuery}`);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /^pie$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^bar$/i })).toBeVisible();
  });

  test("mobile bottom nav navigates to artists", async ({ page }) => {
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);

    await page.getByRole("link", { name: /^artists$/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\/artists/);
  });

  test("mobile plus menu opens heatmap and settings shortcuts", async ({ page }) => {
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);

    await page.getByRole("button", { name: /open more destinations/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^more$/i })).toBeVisible();

    await page.getByRole("link", { name: /heat grid/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\/heatmap/);

    await page.getByRole("button", { name: /open more destinations/i }).click();
    await page.getByRole("link", { name: /account hub/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\/settings/);
  });

  test("sign-in page is usable on mobile", async ({ page }) => {
    await page.goto("/en/sign-in");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#auth-main input[type='email']")).toBeVisible();
    await expect(page.getByRole("button", { name: /^sign in$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /dashboard/i }).first()).toBeVisible();
  });

  test("serves web app manifest", async ({ page }) => {
    const response = await page.goto("/manifest.webmanifest");
    expect(response?.ok()).toBeTruthy();
    const manifest = await response!.json();
    expect(manifest.name).toBe("Soundprint-AI");
    expect(manifest.display).toBe("standalone");
  });

  test("heatmap opens day details sheet on tap", async ({ page }) => {
    await page.goto(`/en/dashboard/heatmap${publicDemoQuery}`);

    const activeDay = page
      .getByRole("button")
      .filter({ has: page.locator("[title*='listen' i]") })
      .filter({ hasNot: page.locator("[title*='no listen' i]") })
      .first();

    await expect(activeDay).toBeVisible({ timeout: 15_000 });
    await activeDay.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#heatmap-day-details-title")).toBeVisible();
  });

  test("period control opens a sheet and applies 30d", async ({ page }) => {
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);

    await page.getByRole("button", { name: /period:/i }).click();
    const sheet = page.getByRole("dialog", { name: /listening period/i });
    await expect(sheet).toBeVisible();
    await expect(page.getByRole("navigation", { name: /main dashboard navigation/i })).toBeVisible();

    await sheet.getByRole("button", { name: /last 30 days/i }).click();
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/startDate=/);
    await expect(page).toHaveURL(/endDate=/);
    await expect(page).toHaveURL(/userId=/);
  });

  test("period sheet shows full French labels", async ({ page }) => {
    await page.goto(`/fr/dashboard/overview${publicDemoQuery}`);

    await page.getByRole("button", { name: /période :/i }).click();
    const sheet = page.getByRole("dialog", { name: /période d[’']écoute/i });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: /^cette année$/i })).toBeVisible();
    await expect(sheet.getByRole("button", { name: /^personnalisé$/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /navigation principale du dashboard/i })).toBeVisible();
  });
});
