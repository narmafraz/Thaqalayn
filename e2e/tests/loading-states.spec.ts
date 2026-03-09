import { test, expect } from '@playwright/test';

test.describe('Loading States', () => {
  test('should show loading skeleton on chapter page', async ({ page }) => {
    // Intercept API to delay response so skeleton is visible
    await page.route('**/books/**/*.json', async route => {
      await new Promise(r => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto('/#/books/al-kafi:1:1:1');
    // Skeleton should appear within 1 second
    const skeleton = page.locator('app-skeleton-loader');
    await expect(skeleton).toBeVisible({ timeout: 1000 });
  });

  test('should hide skeleton once content loads', async ({ page }) => {
    await page.goto('/#/books/quran:1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    // Skeleton should be gone once content has loaded
    const skeleton = page.locator('app-skeleton-loader');
    await expect(skeleton).toHaveCount(0);
  });

  test('should show skeleton on narrator page while loading', async ({ page }) => {
    await page.route('**/people/**/*.json', async route => {
      await new Promise(r => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto('/#/people/narrators/1');
    const skeleton = page.locator('app-skeleton-loader');
    await expect(skeleton).toBeVisible({ timeout: 1000 });
  });

  test('should show skeleton on people list while loading', async ({ page }) => {
    await page.route('**/people/**/*.json', async route => {
      await new Promise(r => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto('/#/people/narrators/index');
    const skeleton = page.locator('app-skeleton-loader');
    await expect(skeleton).toBeVisible({ timeout: 1000 });
  });

  test('skeleton should have shimmer animation elements', async ({ page }) => {
    await page.route('**/books/**/*.json', async route => {
      await new Promise(r => setTimeout(r, 3000));
      await route.continue();
    });
    await page.goto('/#/books/al-kafi:1:1');
    const shimmerLines = page.locator('app-skeleton-loader .skeleton-line');
    await expect(shimmerLines.first()).toBeVisible({ timeout: 1000 });
    const count = await shimmerLines.count();
    expect(count).toBeGreaterThan(0);
  });
});
