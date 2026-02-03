import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Aller à la page d'accueil
    await page.goto('/');
  });

  test('should load the home page', async ({ page }) => {
    await expect(page).toHaveTitle(/Apple Music Analytics/i);
  });

  test('should navigate to dashboard overview', async ({ page }) => {
    // Naviguer vers le dashboard (supposant qu'il y a un lien ou qu'on va directement)
    await page.goto('/dashboard/overview');
    
    // Vérifier que la page est chargée
    await expect(page).toHaveURL(/\/dashboard\/overview/);
    
    // Vérifier que le contenu principal est visible
    // (Ajustez les sélecteurs selon votre structure réelle)
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should navigate to timeline page', async ({ page }) => {
    await page.goto('/dashboard/timeline');
    await expect(page).toHaveURL(/\/dashboard\/timeline/);
    
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should navigate to genres page', async ({ page }) => {
    await page.goto('/dashboard/genres');
    await expect(page).toHaveURL(/\/dashboard\/genres/);
    
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

  test('should navigate to network page', async ({ page }) => {
    await page.goto('/dashboard/network');
    await expect(page).toHaveURL(/\/dashboard\/network/);
    
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible();
  });

});

test.describe('Dashboard API Integration', () => {
  test('should fetch overview stats from API', async ({ page }) => {
    // Intercepter la requête API
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/overview') && response.status() === 200
    );

    await page.goto('/dashboard/overview');
    
    // Attendre la réponse API
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Vérifier la structure de la réponse
    expect(data).toHaveProperty('totalListens');
    expect(data).toHaveProperty('uniqueArtists');
    expect(data).toHaveProperty('uniqueTracks');
  });

  test('should fetch timeline data from API', async ({ page }) => {
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/timeline') && response.status() === 200
    );

    await page.goto('/dashboard/timeline');
    
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should fetch genres data from API', async ({ page }) => {
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/genres') && response.status() === 200
    );

    await page.goto('/dashboard/genres');
    
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('totalListens');
    expect(Array.isArray(data.data)).toBe(true);
  });
});

test.describe('Dashboard UI Elements', () => {
  test('should display loading states', async ({ page }) => {
    await page.goto('/dashboard/overview');
    
    // Vérifier qu'il y a un indicateur de chargement (si présent)
    // Ajustez selon votre implémentation
    const loadingIndicator = page.locator('[aria-label*="loading"], [data-testid*="loading"]').first();
    
    // Soit le chargement est déjà terminé, soit on attend qu'il disparaisse
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Intercepter et faire échouer une requête API
    await page.route('/api/overview', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/dashboard/overview');
    
    // Vérifier qu'un message d'erreur est affiché
    // Ajustez selon votre composant d'erreur
    const errorMessage = page.locator('[role="alert"], [data-testid*="error"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dashboard Performance', () => {
  test('should load overview page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard/overview');
    
    // Attendre que le contenu principal soit visible
    await page.locator('main, [role="main"]').first().waitFor({ state: 'visible' });
    
    const loadTime = Date.now() - startTime;
    
    // Vérifier que la page charge en moins de 5 secondes
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have reasonable number of DOM nodes', async ({ page }) => {
    await page.goto('/dashboard/overview');
    
    const nodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
    
    // Vérifier qu'on n'a pas trop de nœuds DOM (indicateur de performance)
    // Ajustez la valeur selon vos besoins
    expect(nodeCount).toBeLessThan(2000);
  });
});



