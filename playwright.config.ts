import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration
 * @see https://playwright.dev/docs/test-configuration
 */
const e2ePort = process.env.PLAYWRIGHT_TEST_PORT || "3100";
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://localhost:${e2ePort}`;
const useExternalDevServer =
  !!process.env.PLAYWRIGHT_TEST_BASE_URL || !!process.env.PLAYWRIGHT_SKIP_WEBSERVER;

export default defineConfig({
  testDir: "./__tests__/e2e",
  globalSetup: "./__tests__/e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      testMatch: /mobile-dashboard\.spec\.ts/,
    },
  ],

  /* Start dev server before tests (skip when PLAYWRIGHT_TEST_BASE_URL points at a running app) */
  webServer: useExternalDevServer
    ? undefined
    : {
        command: `npm run dev -- --port ${e2ePort}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});



