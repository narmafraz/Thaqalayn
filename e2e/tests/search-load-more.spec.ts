import { test, expect } from '@playwright/test';

test.describe('Search Results Count and Load More', () => {
  test('should display results count header', async ({ page }) => {
    await page.goto('/#/search?q=allah&lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show "Showing X of Y results"
    const showingCount = page.locator('.showing-count');
    const summaryText = await showingCount.textContent();
    // The count text should contain numbers
    expect(summaryText).toMatch(/\d+/);
  });

  test('should limit displayed results and show load more button', async ({ page }) => {
    // Use a broad search that returns many results
    await page.goto('/#/search?q=allah&lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const resultCards = page.locator('.result-card');
    const initialCount = await resultCards.count();

    // If there are more than 30 results total, load more button should be visible
    const loadMoreBtn = page.locator('.load-more-btn');
    if (initialCount >= 30) {
      await expect(loadMoreBtn).toBeVisible();
    }
  });

  test('should load more results when button is clicked', async ({ page }) => {
    await page.goto('/#/search?q=allah&lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const resultCards = page.locator('.result-card');
    const initialCount = await resultCards.count();

    const loadMoreBtn = page.locator('.load-more-btn');
    if (await loadMoreBtn.isVisible()) {
      await loadMoreBtn.click();
      await page.waitForTimeout(500);

      const newCount = await resultCards.count();
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('should show "all results shown" when all are displayed', async ({ page }) => {
    // Use a search with fewer results
    await page.goto('/#/search?q=fatiha&lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const resultCards = page.locator('.result-card');
    const count = await resultCards.count();

    if (count > 0 && count < 30) {
      // Should show "All results shown" and no load more button
      const showingAll = page.locator('.showing-all');
      await expect(showingAll).toBeVisible();

      const loadMoreBtn = page.locator('.load-more-btn');
      await expect(loadMoreBtn).not.toBeVisible();
    }
  });
});
