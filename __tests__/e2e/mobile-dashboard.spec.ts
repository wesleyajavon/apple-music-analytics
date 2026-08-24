import { test, expect, type Page } from "@playwright/test";
import { DEFAULT_PUBLIC_PROFILE_USER_ID } from "../../lib/constants/public-profile";

const publicDemoQuery = `?userId=${DEFAULT_PUBLIC_PROFILE_USER_ID}`;
const e2eAuthEmail = process.env.E2E_AUTH_EMAIL?.trim() ?? "";
const e2eAuthPassword = process.env.E2E_AUTH_PASSWORD?.trim() ?? "";
const hasSeededAuthUser = e2eAuthEmail.length > 0 && e2eAuthPassword.length > 0;

async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "ama-cookie-consent-v1",
      JSON.stringify({
        version: "2026-06-01",
        decidedAt: "2026-01-01T00:00:00.000Z",
        categories: {
          necessary: true,
          analytics: false,
          errorMonitoring: false,
          sessionReplay: false,
        },
      })
    );
  });
}

async function dismissCookieBannerIfPresent(page: Page) {
  const accept = page.getByRole("button", { name: /accept all|tout accepter/i });
  try {
    await accept.click({ timeout: 1500 });
  } catch {
    // Banner already dismissed or not shown.
  }
}

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

  test("genres ranking shows a tappable first row and keeps dates", async ({ page }) => {
    await page.goto(`/en/dashboard/genres${publicDemoQuery}`);

    await page.getByRole("button", { name: /period:/i }).click();
    await page.getByRole("dialog", { name: /listening period/i }).getByRole("button", { name: /last 30 days/i }).click();
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/startDate=/);
    await expect(page).toHaveURL(/endDate=/);
    await expect(page).toHaveURL(/userId=/);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: /genre sections/i })).toHaveCount(0);

    const firstRow = main.getByRole("button", { name: /open mix details/i }).first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/userId=/);

    await page.getByRole("button", { name: /close genre details/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await main.getByRole("link", { name: /genre trends/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\/genres\/trends/);
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/startDate=/);
    await expect(page).toHaveURL(/endDate=/);
    await expect(page).toHaveURL(/userId=/);
  });

  test("genres ranking is usable in French", async ({ page }) => {
    await page.goto(`/fr/dashboard/genres${publicDemoQuery}`);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: /sections genres/i })).toHaveCount(0);

    const firstRow = main.getByRole("button", { name: /voir le détail/i }).first();
    await expect(firstRow).toBeVisible({ timeout: 20_000 });
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
  });

  test("mobile bottom nav navigates to artists", async ({ page }) => {
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);

    await page.getByRole("link", { name: /^artists$/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\/artists/);
  });

  test("artists ranking shows a tappable first row and keeps dates", async ({ page }) => {
    await page.goto(`/en/dashboard/artists${publicDemoQuery}`);

    await page.getByRole("button", { name: /period:/i }).click();
    await page.getByRole("dialog", { name: /listening period/i }).getByRole("button", { name: /last 30 days/i }).click();
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/startDate=/);
    await expect(page).toHaveURL(/endDate=/);
    await expect(page).toHaveURL(/userId=/);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: /artist sections/i })).toHaveCount(0);

    const firstRow = main.getByRole("button", { name: /open streaming insights/i }).first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/userId=/);

    await page.getByRole("button", { name: /close insights/i }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await main.getByRole("link", { name: /artist trends/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\/artists\/trends/);
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/startDate=/);
    await expect(page).toHaveURL(/endDate=/);
    await expect(page).toHaveURL(/userId=/);
  });

  test("artists ranking is usable in French", async ({ page }) => {
    await page.goto(`/fr/dashboard/artists${publicDemoQuery}`);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: /sections artistes/i })).toHaveCount(0);

    const firstRow = main.getByRole("button", { name: /analyse d/i }).first();
    await expect(firstRow).toBeVisible({ timeout: 20_000 });
    await firstRow.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
  });

  test("tracks ranking shows a tappable first row and keeps dates", async ({ page }) => {
    test.setTimeout(60_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/tracks${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    await page.getByRole("button", { name: /period:/i }).click();
    await page.getByRole("dialog", { name: /listening period/i }).getByRole("button", { name: /last 30 days/i }).click();
    await expect(page).toHaveURL(/preset=30d/);
    await expect(page).toHaveURL(/startDate=/);
    await expect(page).toHaveURL(/endDate=/);
    await expect(page).toHaveURL(/userId=/);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: /track sections/i })).toHaveCount(0);

    const rows = main.getByRole("button", { name: /open track details/i });
    const emptyTitle = main.getByRole("heading", { name: /no tracks yet/i });
    await expect(rows.first().or(emptyTitle)).toBeVisible({ timeout: 20_000 });
    const rowCount = await rows.count();
    if (rowCount === 0) {
      await expect(emptyTitle).toBeVisible();
    } else {
      expect(rowCount).toBeGreaterThanOrEqual(3);
      await rows.first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveURL(/preset=30d/);
      await expect(page).toHaveURL(/userId=/);
      await page.getByRole("button", { name: /close track details/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await main.getByRole("link", { name: /view track trends/i }).click();
      await expect(page).toHaveURL(/\/en\/dashboard\/tracks\/trends/);
      await expect(page).toHaveURL(/preset=30d/);
      await expect(page).toHaveURL(/startDate=/);
      await expect(page).toHaveURL(/endDate=/);
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("tracks ranking is usable in French", async ({ page }) => {
    test.setTimeout(60_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/tracks${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("tablist", { name: /sections des titres/i })).toHaveCount(0);

    const firstRow = main.getByRole("button", { name: /voir le détail/i }).first();
    const emptyTitle = main.getByRole("heading", { name: /pas encore de titres/i });
    await expect(firstRow.or(emptyTitle)).toBeVisible({ timeout: 20_000 });
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("mobile plus menu opens heatmap and settings shortcuts", async ({ page }) => {
    test.setTimeout(60_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/overview${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    await page.getByRole("button", { name: /open more destinations/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^more$/i })).toBeVisible();

    await page.getByRole("link", { name: /heat grid/i }).click();
    await expect(page).toHaveURL(/\/en\/dashboard\/heatmap/);

    await page.getByRole("button", { name: /open more destinations/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
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
    test.setTimeout(60_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/heatmap${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

    const peakCta = main.getByRole("button", { name: /open that day/i });
    await expect(peakCta).toBeVisible();
    await peakCta.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#heatmap-day-details-title")).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
  });

  test("heatmap day details is usable in French", async ({ page }) => {
    test.setTimeout(60_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/heatmap${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

    const peakCta = main.getByRole("button", { name: /ouvrir ce jour/i });
    await expect(peakCta).toBeVisible();
    await peakCta.click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#heatmap-day-details-title")).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
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

  test("timeline mobile shows heading, spark captions, and bucket or empty", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/timeline${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const emptyTitle = main.getByRole("heading", { name: /no pulse yet/i });
    const spark = main.getByRole("img", { name: /compact streaming trend/i });
    await expect(spark.or(emptyTitle)).toBeVisible({ timeout: 20_000 });

    if (await spark.isVisible()) {
      await expect(main.locator("time").first()).toBeVisible();
      await expect(main.getByText(/peak /i).first()).toBeVisible();
      const bucket = main.getByRole("button", { name: /^open /i }).first();
      await bucket.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
      await bucket.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveURL(/userId=/);

      await page.getByRole("button", { name: /close bucket details/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const heatmapRow = main.getByRole("link", { name: /daily intensity/i });
      await expect(heatmapRow).toHaveAttribute("href", /heatmap/);
      await heatmapRow.click();
      await expect(page).toHaveURL(/\/en\/dashboard\/heatmap/, { timeout: 20_000 });
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("timeline mobile is usable in French", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/timeline${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const emptyTitle = main.getByRole("heading", { name: /pas encore de pouls/i });
    const spark = main.getByRole("img", { name: /tendance compacte des streams/i });
    await expect(spark.or(emptyTitle)).toBeVisible({ timeout: 20_000 });

    if (await spark.isVisible()) {
      await expect(main.locator("time").first()).toBeVisible();
      await expect(main.getByText(/pic /i).first()).toBeVisible();
      const bucket = main.getByRole("button", { name: /^ouvrir /i }).first();
      await bucket.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
      await bucket.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveURL(/userId=/);

      await page.getByRole("button", { name: /fermer le détail du segment/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const heatmapRow = main.getByRole("link", { name: /intensité quotidienne/i });
      await expect(heatmapRow).toHaveAttribute("href", /heatmap/);
      await heatmapRow.click();
      await expect(page).toHaveURL(/\/fr\/dashboard\/heatmap/, { timeout: 20_000 });
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("temporal mobile shows heading, rows or empty, and keeps dates", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(
      `/en/dashboard/temporal-analysis${publicDemoQuery}&preset=30d&startDate=2026-07-24&endDate=2026-08-23`,
    );
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("tablist", { name: /rhythm sections/i })).toHaveCount(0);

    const emptyTitle = main.getByRole("heading", { name: /no rhythm yet/i });
    const segment = main.getByRole("tablist", { name: /when you listen/i });
    await expect(segment.or(emptyTitle)).toBeVisible({ timeout: 20_000 });

    if (await segment.isVisible()) {
      await expect(page).toHaveURL(/preset=30d/);
      await expect(page).toHaveURL(/userId=/);

      const firstRow = main.getByRole("button", { name: /^open /i }).first();
      await firstRow.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
      await firstRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveURL(/preset=30d/);
      await expect(page).toHaveURL(/userId=/);

      await page.getByRole("button", { name: /close details/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await main.getByRole("tab", { name: /^hours$/i }).click();
      await expect(main.getByRole("button", { name: /^open /i }).first()).toBeVisible();

      const heatmapRow = main.getByRole("link", { name: /daily intensity/i });
      await expect(heatmapRow).toHaveAttribute("href", /heatmap/);
      await heatmapRow.click();
      await expect(page).toHaveURL(/\/en\/dashboard\/heatmap/, { timeout: 20_000 });
      await expect(page).toHaveURL(/preset=30d/);
      await expect(page).toHaveURL(/startDate=/);
      await expect(page).toHaveURL(/endDate=/);
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("temporal mobile is usable in French", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/temporal-analysis${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("tablist", { name: /sections rythme/i })).toHaveCount(0);

    const emptyTitle = main.getByRole("heading", { name: /pas encore de rythme/i });
    const segment = main.getByRole("tablist", { name: /quand vous écoutez/i });
    await expect(segment.or(emptyTitle)).toBeVisible({ timeout: 20_000 });

    if (await segment.isVisible()) {
      const firstRow = main.getByRole("button", { name: /^ouvrir /i }).first();
      await firstRow.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
      await firstRow.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page).toHaveURL(/userId=/);

      await page.getByRole("button", { name: /fermer le détail/i }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      await main.getByRole("tab", { name: /^heures$/i }).click();
      const heatmapRow = main.getByRole("link", { name: /intensité quotidienne/i });
      await expect(heatmapRow).toHaveAttribute("href", /heatmap/);
      await heatmapRow.click();
      await expect(page).toHaveURL(/\/fr\/dashboard\/heatmap/, { timeout: 20_000 });
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("public demo cannot open Palette and is redirected", async ({ page }) => {
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/genres/palette${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    await expect(page).toHaveURL(/\/en\/dashboard\/genres/, { timeout: 20_000 });
    await expect(page).toHaveURL(/palette=restricted/);
    await expect(page).toHaveURL(/userId=/);
    await expect(page.getByRole("heading", { name: /couldn't load palette/i })).toHaveCount(0);
  });

  test("signed-in Palette maps or skips one queue item", async ({ page }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows.",
    );

    await page.goto("/en/sign-in");
    await page.locator('input[type="email"]').fill(e2eAuthEmail);
    await page.locator('input[type="password"]').fill(e2eAuthPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard(?:\/overview)?/);

    await page.goto(
      "/en/dashboard/genres/palette?startDate=2024-01-01&endDate=2024-01-31",
    );

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });

    const emptyCta = main.getByRole("link", { name: /back to genres/i });
    const apply = page.getByRole("button", { name: /^apply$/i });
    const skip = page.getByRole("button", { name: /^skip$/i });

    if (await emptyCta.isVisible()) {
      await emptyCta.click();
      await expect(page).toHaveURL(/\/en\/dashboard\/genres/);
      await expect(page).toHaveURL(/startDate=2024-01-01/);
      await expect(page).toHaveURL(/endDate=2024-01-31/);
      return;
    }

    await expect(apply).toBeDisabled();
    await main.getByLabel(/^genre$/i).fill("Jazz");
    await expect(apply).toBeEnabled();
    await skip.click();
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("signed-in Palette is usable in French", async ({ page }) => {
    test.skip(
      !hasSeededAuthUser,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD for authenticated E2E flows.",
    );

    await page.goto("/fr/sign-in");
    await page.locator('input[type="email"]').fill(e2eAuthEmail);
    await page.locator('input[type="password"]').fill(e2eAuthPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard(?:\/overview)?/);

    await page.goto("/fr/dashboard/genres/palette");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(
      main.getByRole("link", { name: /retour aux genres/i }).or(
        page.getByRole("button", { name: /^appliquer$/i }),
      ),
    ).toBeVisible();
  });

  test("ask your Soundprint sends a featured preset without covering the nav", async ({ page }) => {
    test.setTimeout(60_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/ask-your-soundprint${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: /ask your soundprint/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/userId=/);

    const featured = main.getByRole("button", { name: /^ask:/i });
    await expect(featured).toHaveCount(1);
    await expect(main.getByRole("button", { name: /all questions/i })).toBeVisible();

    await featured.click();
    await expect(
      main.getByText(/tell me my streaming history with/i).first()
    ).toBeVisible({
      timeout: 20_000,
    });

    const nav = page.getByRole("navigation", { name: /main dashboard navigation/i });
    await expect(nav).toBeVisible();
    const composer = page.locator("#ask-soundprint-composer");
    const composerBox = await composer.boundingBox();
    const navBox = await nav.boundingBox();
    expect(composerBox).toBeTruthy();
    expect(navBox).toBeTruthy();
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  });

  test("ask your Soundprint is usable in French", async ({ page }) => {
    test.setTimeout(60_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/ask-your-soundprint${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1, name: /interrogez votre soundprint/i })).toBeVisible({
      timeout: 20_000,
    });
    const featured = main.getByRole("button", { name: /^poser :/i });
    await expect(featured).toBeVisible();
    await expect(main.getByRole("button", { name: /toutes les questions/i })).toBeVisible();
    await featured.click();
    await expect(page.getByRole("navigation", { name: /navigation principale du dashboard/i })).toBeVisible();
    await expect(page).toHaveURL(/userId=/);
  });

  test("ai insights mobile shows heading and an insight or empty/quota", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/ai-insights${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const featured = main.locator("blockquote");
    const emptyTitle = main.getByRole("heading", { name: /no insights yet/i });
    const quota = main.getByRole("alert");
    const retry = main.getByRole("button", { name: /^retry$/i });
    await expect(featured.or(emptyTitle).or(quota).or(retry)).toBeVisible({ timeout: 45_000 });

    if (await featured.isVisible()) {
      const ask = main.getByRole("link", { name: /ask your soundprint/i });
      await expect(ask).toBeVisible();
      await expect(ask).toHaveAttribute("href", /ask-your-soundprint/);
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("ai insights mobile is usable in French", async ({ page }) => {
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/ai-insights${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const featured = main.locator("blockquote");
    const emptyTitle = main.getByRole("heading", { name: /pas encore d['’]insights/i });
    const quota = main.getByRole("alert");
    const retry = main.getByRole("button", { name: /^réessayer$/i });
    await expect(featured.or(emptyTitle).or(quota).or(retry)).toBeVisible({ timeout: 45_000 });

    if (await featured.isVisible()) {
      const ask = main.getByRole("link", { name: /interrogez votre soundprint/i });
      await expect(ask).toBeVisible();
      await expect(page).toHaveURL(/userId=/);
    }
  });

  test("duet friends mobile shows heading and invite or gated empty", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile Duet Friends tree is lg:hidden");
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/duet/friends${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const invite = main.getByRole("button", { name: /invite a friend/i });
    const gated = main.getByRole("link", { name: /^sign in$/i });
    await expect(invite.or(gated)).toBeVisible({ timeout: 45_000 });
    await expect(main.getByRole("tablist", { name: /friends sections/i })).toBeHidden();
    await expect(page).toHaveURL(/userId=/);
  });

  test("duet friends mobile is usable in French", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile Duet Friends tree is lg:hidden");
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/duet/friends${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const invite = main.getByRole("button", { name: /inviter un ami/i });
    const gated = main.getByRole("link", { name: /^se connecter$/i });
    await expect(invite.or(gated)).toBeVisible({ timeout: 45_000 });
    await expect(main.getByRole("tablist", { name: /sections amis/i })).toBeHidden();
    await expect(page).toHaveURL(/userId=/);
  });

  test("duet compare mobile shows heading and gated empty", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile Duet Compare tree is lg:hidden");
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/en/dashboard/duet/compare${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const signIn = main.getByRole("link", { name: /^sign in$/i });
    const pickFriend = main.getByRole("heading", { name: /pick a friend/i });
    await expect(signIn.or(pickFriend)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("navigation", { name: /comparison sections/i })).toBeHidden();
    await expect(main.getByText(/change it with the filter at the top of the dashboard/i)).toHaveCount(0);
    await expect(page).toHaveURL(/userId=/);
  });

  test("duet compare mobile is usable in French", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile Duet Compare tree is lg:hidden");
    test.setTimeout(90_000);
    await seedCookieConsent(page);
    await page.goto(`/fr/dashboard/duet/compare${publicDemoQuery}`);
    await dismissCookieBannerIfPresent(page);

    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 45_000 });

    const signIn = main.getByRole("link", { name: /^se connecter$/i });
    const pickFriend = main.getByRole("heading", { name: /choisis un ami/i });
    await expect(signIn.or(pickFriend)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("navigation", { name: /sections de comparaison/i })).toBeHidden();
    await expect(page).toHaveURL(/userId=/);
  });
});
