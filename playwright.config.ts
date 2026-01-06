import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  /* Exécuter les tests en parallèle */
  fullyParallel: true,
  /* Échouer le build sur CI si vous avez laissé test.only dans le code source */
  forbidOnly: !!process.env.CI,
  /* Retry sur CI seulement */
  retries: process.env.CI ? 2 : 0,
  /* Nombre d'workers par défaut */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter à utiliser */
  reporter: 'html',
  /* Options partagées pour tous les projets */
  use: {
    /* URL de base à utiliser pour naviguer dans les actions (ex: await page.goto('/')) */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collecter la trace lors de la retry du test échoué */
    trace: 'on-first-retry',
    /* Screenshot seulement en cas d'échec */
    screenshot: 'only-on-failure',
  },

  /* Configurer les projets pour les navigateurs principaux */
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

    /* Test sur les navigateurs mobiles */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Exécuter le serveur de développement local avant de commencer les tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});



