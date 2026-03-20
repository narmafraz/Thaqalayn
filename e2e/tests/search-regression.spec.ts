import { test, expect } from '@playwright/test';

test.describe('Search Regression Tests', () => {
  test('should return results for a basic title search', async ({ page }) => {
    await page.goto('/search?q=moon&lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for results to appear (index loading can take a few seconds)
    const resultsText = page.locator('.results-summary');
    await expect(resultsText).toContainText(/\d+ results for/, { timeout: 15000 });

    // Should have at least one result card
    const resultCards = page.locator('.result-card');
    await expect(resultCards.first()).toBeVisible({ timeout: 5000 });
    const count = await resultCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should return results for an Arabic search', async ({ page }) => {
    // "القمر" = "The Moon"
    await page.goto('/search?q=%D8%A7%D9%84%D9%82%D9%85%D8%B1&lang=en');
    await page.waitForLoadState('networkidle');

    const resultsText = page.locator('.results-summary');
    await expect(resultsText).toContainText(/\d+ results for/, { timeout: 15000 });

    const resultCards = page.locator('.result-card');
    await expect(resultCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should not show console errors on search page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/search?q=prayer&lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for search to complete
    const resultsText = page.locator('.results-summary');
    await expect(resultsText).toContainText(/results for/, { timeout: 15000 });

    // No JS errors should have occurred
    expect(errors).toEqual([]);
  });

  test('should display search results with correct structure', async ({ page }) => {
    await page.goto('/search?q=fasting&lang=en');
    await page.waitForLoadState('networkidle');

    const resultsText = page.locator('.results-summary');
    await expect(resultsText).toContainText(/\d+ results for/, { timeout: 15000 });

    // First result card should have a title and book name
    const firstCard = page.locator('.result-card').first();
    await expect(firstCard).toBeVisible();

    const title = firstCard.locator('.result-title');
    await expect(title).not.toBeEmpty();

    const bookName = firstCard.locator('.result-book');
    await expect(bookName).not.toBeEmpty();
  });

  test('should return more than 30 results for broad queries (no artificial limit)', async ({ page }) => {
    await page.goto('/search?q=allah&lang=en');
    await page.waitForLoadState('networkidle');

    const resultsText = page.locator('.results-summary');
    await expect(resultsText).toContainText(/\d+ results for/, { timeout: 15000 });

    // Extract total result count from "N results for" text
    const summaryText = await resultsText.textContent();
    const match = summaryText?.match(/(\d+) results for/);
    expect(match).toBeTruthy();
    const totalResults = parseInt(match![1], 10);

    // A broad query like "allah" should return well over 30 results
    expect(totalResults).toBeGreaterThan(30);

    // Should show paged display: "Showing 30 of N results"
    const showingCount = page.locator('.showing-count');
    await expect(showingCount).toContainText('30');

    // Load more button should be visible
    const loadMoreBtn = page.locator('.load-more-btn');
    await expect(loadMoreBtn).toBeVisible();

    // Click load more and verify more results are shown
    await loadMoreBtn.click();
    await expect(showingCount).toContainText('60');
  });

  test('should navigate to book page when clicking a result', async ({ page }) => {
    await page.goto('/search?q=moon&lang=en');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('.result-card').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    // Click the result link and wait for navigation
    await Promise.all([
      page.waitForURL('**/books/**', { timeout: 10000 }),
      firstCard.click(),
    ]);

    expect(page.url()).toContain('/books/');
  });
});
