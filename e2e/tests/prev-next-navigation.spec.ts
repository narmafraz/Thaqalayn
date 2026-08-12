import { test, expect } from '@playwright/test';

test.describe('Prev/Next Navigation', () => {
  test('should show navigation buttons on chapter pages', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Compact navigation buttons live in the sticky reading toolbar
    const compactNav = page.locator('.reading-toolbar .chapter-nav-compact');
    await expect(compactNav.first()).toBeVisible();
  });

  test('should show labeled pager at the end of the chapter', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const pager = page.locator('.chapter-nav-pager');
    await expect(pager).toHaveCount(1);
    // Surah 1 has a next chapter but no previous one
    await expect(pager.locator('.pager-next')).toBeVisible();
    await expect(pager.locator('.pager-prev')).toHaveCount(0);
  });

  test('should navigate to next surah with next button', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Click the next navigation button (navigate_next icon)
    const nextButton = page.locator('a[aria-label="Navigate to the next chapter"]').first();
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    await page.waitForLoadState('networkidle');

    // Should be on surah 2
    await expect(page).toHaveURL(/quran:2/);

    // Title should show surah 2 content
    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible();
    await expect(titles).toContainText('The Cow');
  });

  test('should navigate to previous surah with prev button', async ({ page }) => {
    await page.goto('/books/quran:2?lang=en');
    await page.waitForLoadState('networkidle');

    // Click the previous navigation button
    const prevButton = page.locator('a[aria-label="Navigate to the previous chapter"]').first();
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await page.waitForLoadState('networkidle');

    // Should be on surah 1
    await expect(page).toHaveURL(/quran:1/);
    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toContainText('The Opening');
  });

  test('should navigate up to parent with up button', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Click the up navigation button
    const upButton = page.locator('a[aria-label="Navigate to the parent"]').first();
    await expect(upButton).toBeVisible();
    await upButton.click();
    await page.waitForLoadState('networkidle');

    // Should be at the Quran surah list
    await expect(page).toHaveURL(/quran(?!:)/);
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();
  });

  test('should not show prev button on first chapter', async ({ page }) => {
    // First surah should not have a prev button
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const prevButton = page.locator('a[aria-label="Navigate to the previous chapter"]').first();
    // The prev button should not exist (nav.prev is null for first item)
    await expect(prevButton).toHaveCount(0);
  });

  test('Al-Kafi prev/next navigation', async ({ page }) => {
    // Use al-kafi:1:2:1 which is known to have nav buttons
    await page.goto('/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for content to render
    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible({ timeout: 15000 });

    // Should have next button
    const nextButton = page.locator('a[aria-label="Navigate to the next chapter"]').first();
    await expect(nextButton).toBeVisible({ timeout: 10000 });

    // Click next to go to chapter 2
    await nextButton.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/al-kafi:1:2:2/);
  });
});
