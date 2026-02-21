import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display the book list', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Header with app title should be visible
    await expect(page.locator('.bannerTop')).toContainText('Thaqalayn');

    // Breadcrumbs area should exist with Home link
    await expect(page.locator('.crumb-holder a[routerLink="/"]')).toHaveText('Home');

    // The chapter-list table should be rendered with book rows
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();

    // Should have at least 2 books (Quran and Al-Kafi)
    const rows = table.locator('tr[mat-row]');
    await expect(rows).toHaveCount(2, { timeout: 10000 });

    // Verify Quran is listed (English title)
    await expect(table).toContainText('Quran');

    // Verify Al-Kafi is listed (English title)
    await expect(table).toContainText('Al-Kafi');
  });

  test('should display Arabic titles alongside English titles', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();

    // Arabic text should be present (check for Arabic Unicode characters)
    await expect(table).toContainText(/[\u0600-\u06FF]/);
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
