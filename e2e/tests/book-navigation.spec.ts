import { test, expect } from '@playwright/test';

test.describe('Book Navigation', () => {
  test('should navigate from homepage into Al-Kafi volumes', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Click on Al-Kafi row in the book list table
    const alKafiRow = page.locator('tr[mat-row]', { hasText: 'Al-Kafi' });
    await expect(alKafiRow).toBeVisible();
    await alKafiRow.click();

    // Should navigate to al-kafi page showing volumes
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/al-kafi/);

    // Should show a chapter list table with volumes
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();

    // Al-Kafi has 8 volumes
    const rows = table.locator('tr[mat-row]');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('should drill down Al-Kafi: Volume -> Book -> Chapter', async ({ page }) => {
    // Start at Al-Kafi volumes
    await page.goto('/books/al-kafi?lang=en');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();

    // Click first volume
    const firstRow = table.locator('tr[mat-row]').first();
    await firstRow.click();
    await page.waitForLoadState('networkidle');

    // Should now be on volume 1 showing books
    await expect(page).toHaveURL(/al-kafi:1/);
    const booksTable = page.locator('table.full-width-table');
    await expect(booksTable).toBeVisible();

    // Click first book
    const firstBook = booksTable.locator('tr[mat-row]').first();
    await firstBook.click();
    await page.waitForLoadState('networkidle');

    // Should now be on book 1 showing chapters
    await expect(page).toHaveURL(/al-kafi:1:1/);
  });

  test('should navigate into Quran surahs', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Click on Quran row
    const quranRow = page.locator('tr[mat-row]', { hasText: 'Quran' });
    await expect(quranRow).toBeVisible();
    await quranRow.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/quran/);

    // Should show surahs list
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();

    // Quran has 114 surahs
    const rows = table.locator('tr[mat-row]');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBe(114);
  });
});
