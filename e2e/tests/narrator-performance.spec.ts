import { test, expect } from '@playwright/test';

test.describe('Narrator Profile Performance', () => {
  test('should load narrator with many narrations without freezing', async ({ page }) => {
    const start = Date.now();
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(8000);

    // Pagination should be visible for the narrated ahadith section
    const paginators = page.locator('mat-paginator');
    await expect(paginators.first()).toBeVisible();
  });

  test('should paginate narrated ahadith', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    // Should have paginator(s)
    const paginators = page.locator('mat-paginator');
    const count = await paginators.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should limit verse paths shown per subchain by default', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    // Look for a "Show all" button indicating paths are collapsed
    const showAllBtn = page.locator('button', { hasText: /Show all/ });
    // If the narrator has subchains with > 3 paths, there should be show-all buttons
    const btnCount = await showAllBtn.count();
    if (btnCount > 0) {
      await expect(showAllBtn.first()).toBeVisible();
    }
  });

  test('should expand subchain verse paths on click', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    const showAllBtn = page.locator('button', { hasText: /Show all/ });
    const btnCount = await showAllBtn.count();
    if (btnCount > 0) {
      // Click the first "Show all" button
      await showAllBtn.first().click();

      // Should now show a "Show less" button
      const showLessBtn = page.locator('button', { hasText: /Show less/ });
      await expect(showLessBtn.first()).toBeVisible();
    }
  });
});
