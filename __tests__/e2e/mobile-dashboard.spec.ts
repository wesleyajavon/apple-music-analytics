import { test, expect } from "@playwright/test";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "../../lib/constants/public-profile";

const publicDemoQuery = `?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`;

test.describe("Mobile dashboard UX", () => {
  test("home exposes mobile menu and sticky CTA", async ({ page }) => {
    await page.goto("/en");

    await expect(page.getByRole("button", { name: /open page sections menu/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up/i }).first()).toBeVisible();
  });

  test("dashboard overview loads with mobile bottom nav", async ({ page }) => {
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);

    await expect(page.getByRole("navigation", { name: /main dashboard navigation/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /your music/i })).toBeVisible();
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
});
