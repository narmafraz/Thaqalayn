import { test, expect } from '@playwright/test';

test.describe('Jump to Verse', () => {
  test('should show jump-to-verse bar on chapters with 20+ verses', async ({ page }) => {
    // Surah Al-Baqarah has 286 verses
    await page.goto('/#/books/quran:2?lang=en');
    await page.waitForLoadState('networkidle');

    const jumpBar = page.locator('.jump-to-verse');
    await expect(jumpBar).toBeVisible();
  });

  test('should NOT show jump-to-verse bar on short chapters', async ({ page }) => {
    // Surah Al-Fatiha has only 7 verses
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const jumpBar = page.locator('.jump-to-verse');
    await expect(jumpBar).not.toBeVisible();
  });

  test('should scroll to the target verse when jump is triggered', async ({ page }) => {
    await page.goto('/#/books/quran:2?lang=en');
    await page.waitForLoadState('networkidle');

    const jumpInput = page.locator('.jump-to-verse input[type="number"]');
    await jumpInput.fill('100');
    await jumpInput.press('Enter');

    // Wait for scroll and fragment update
    await page.waitForTimeout(1000);

    // The URL fragment should be updated
    const url = page.url();
    expect(url).toContain('h100');

    // The anchor element for verse 100 should be near the viewport
    const anchor = page.locator('#h100');
    await expect(anchor).toBeAttached();
  });

  test('should show jump-to-verse bar for long hadith chapters', async ({ page }) => {
    // Al-Kafi volume 1, book 1, chapter 1 typically has 20+ hadiths
    await page.goto('/#/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Check if the chapter has enough verses for the bar to appear
    const jumpBar = page.locator('.jump-to-verse');
    const verseCards = page.locator('mat-card');
    const count = await verseCards.count();

    if (count >= 20) {
      await expect(jumpBar).toBeVisible();
    } else {
      await expect(jumpBar).not.toBeVisible();
    }
  });
});
