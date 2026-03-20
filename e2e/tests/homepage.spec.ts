import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display the book tree and quick links', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Header with app title should be visible
    await expect(page.locator('.bannerTop')).toContainText('Thaqalayn');

    // Breadcrumbs area should exist with Home link
    await expect(page.locator('.crumb-holder a[routerLink="/"]')).toHaveText('Home');

    // The book tree should be rendered (primary navigation on homepage)
    const bookTree = page.locator('app-book-tree');
    await expect(bookTree).toBeVisible({ timeout: 10000 });

    // The chapter-list table should NOT be visible on the homepage
    const table = page.locator('app-chapter-list table.full-width-table');
    await expect(table).not.toBeVisible();

    // Quick links section should be visible with Quran and Al-Kafi cards
    const quickLinks = page.locator('.homepage-quick-links');
    await expect(quickLinks).toBeVisible();

    const quranCard = page.locator('.quick-link-card').first();
    await expect(quranCard).toBeVisible();

    // Should have 2 quick link cards
    await expect(page.locator('.quick-link-card')).toHaveCount(2);
  });

  test('should navigate to Quran via quick link card', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Click the Quran quick link card
    const quranCard = page.locator('.quick-link-card').first();
    await quranCard.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to Quran page which shows the chapter list table
    await expect(page).toHaveURL(/quran/);
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('should still show chapter-list table on non-root pages', async ({ page }) => {
    await page.goto('/books/al-kafi?lang=en');
    await page.waitForLoadState('networkidle');

    // The chapter-list table should be visible on non-root chapter_list pages
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('should display footer navigation links', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    const footer = page.locator('#footer');
    await expect(footer).toContainText('Download');
    await expect(footer).toContainText('Support');
    await expect(footer).toContainText('About');
  });
});
