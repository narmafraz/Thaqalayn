import { test, expect } from '@playwright/test';

test.describe('Deep Linking', () => {
  test('should load Quran surah directly via URL', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible();
    await expect(titles).toContainText('The Opening');

    const verseCards = page.locator('mat-card');
    await expect(verseCards.first()).toBeVisible();
  });

  test('should load Al-Kafi chapter directly via URL', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible();

    const verseCards = page.locator('mat-card');
    await expect(verseCards.first()).toBeVisible();
  });

  test('should load narrator page directly via URL', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    const title = page.locator('h1.arabic');
    await expect(title).toBeVisible();
  });

  test('should load narrator list directly via URL', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();
  });

  test('should load about page directly via URL', async ({ page }) => {
    await page.goto('/#/about');
    await page.waitForLoadState('networkidle');

    // Page should load without error
    await expect(page.locator('.bannerTop')).toContainText('Thaqalayn');
  });

  test('should load download page directly via URL', async ({ page }) => {
    await page.goto('/#/download');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.bannerTop')).toContainText('Thaqalayn');
  });

  test('should load support page directly via URL', async ({ page }) => {
    await page.goto('/#/support');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.bannerTop')).toContainText('Thaqalayn');
  });

  test('should redirect root to books page', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForLoadState('networkidle');

    // Root should redirect to /books?lang=en
    await expect(page).toHaveURL(/books/);
  });

  test('should handle deep Al-Kafi path with 4 segments', async ({ page }) => {
    // Navigate to a deeply nested path
    await page.goto('/#/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Should render content (either chapter list or verse list)
    const content = page.locator('.description.mat-elevation-z2, table.full-width-table');
    await expect(content.first()).toBeVisible();

    // Breadcrumbs should show the full path
    const crumbHolder = page.locator('.crumb-holder');
    await expect(crumbHolder).toContainText('Home');
  });

  test('should load late Quran surah directly', async ({ page }) => {
    // Last surah (An-Nas, 114)
    await page.goto('/#/books/quran:114?lang=en');
    await page.waitForLoadState('networkidle');

    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible();

    const verseCards = page.locator('mat-card');
    await expect(verseCards.first()).toBeVisible();

    // An-Nas has 6 verses
    const count = await verseCards.count();
    expect(count).toBe(6);
  });
});
