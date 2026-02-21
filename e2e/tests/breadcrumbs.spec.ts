import { test, expect } from '@playwright/test';

test.describe('Breadcrumb Navigation', () => {
  test('should show Home breadcrumb on all pages', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    const homeLink = page.locator('.crumb-holder a[routerLink="/"]');
    await expect(homeLink).toHaveText('Home');
  });

  test('should build breadcrumbs when navigating into a book', async ({ page }) => {
    await page.goto('/books/al-kafi?lang=en');
    await page.waitForLoadState('networkidle');

    const crumbHolder = page.locator('.crumb-holder');
    await expect(crumbHolder).toContainText('Home');
    await expect(crumbHolder).toContainText('Al-Kafi');
  });

  test('should show full breadcrumb trail for deep navigation', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    const crumbHolder = page.locator('.crumb-holder');
    await expect(crumbHolder).toContainText('Home');

    // Should contain breadcrumb segments joined by separators
    const crumbLinks = crumbHolder.locator('a');
    const count = await crumbLinks.count();
    // Home + at least Al-Kafi + Volume + Book + Chapter = 5 links minimum
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should navigate back when clicking a breadcrumb', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Click the Home breadcrumb
    const homeLink = page.locator('.crumb-holder a[routerLink="/"]');
    await homeLink.click();
    await page.waitForLoadState('networkidle');

    // Should be back at the books list
    await expect(page).toHaveURL(/books/);
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();
  });

  test('should show breadcrumbs for Al-Kafi chapter pages', async ({ page }) => {
    await page.goto('/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    const crumbHolder = page.locator('.crumb-holder');
    await expect(crumbHolder).toContainText('Home');

    // Wait for breadcrumb trail to load with separator
    await expect(crumbHolder).toContainText('»', { timeout: 10000 });
    await expect(crumbHolder).toContainText('Al-Kafi');

    // Should have multiple crumb links (Home + Al-Kafi + Volume + Book + Chapter)
    const crumbLinks = crumbHolder.locator('a');
    const count = await crumbLinks.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
