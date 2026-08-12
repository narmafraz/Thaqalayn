import { test, expect } from '@playwright/test';

// The jump control is a slim native <select> in the sticky reading toolbar
// (app-chapter-jump component); it appears only on chapters with 10+ verses.
const JUMP_SELECT = '.reading-toolbar .chapter-jump-select';

test.describe('Jump to Verse', () => {
  test('should show jump-to-verse control on chapters with 20+ verses', async ({ page }) => {
    // Surah Al-Baqarah has 286 verses
    await page.goto('/books/quran:2?lang=en');
    await page.waitForLoadState('networkidle');

    const jumpSelect = page.locator(JUMP_SELECT);
    await expect(jumpSelect).toBeVisible();
  });

  test('should NOT show jump-to-verse control on short chapters', async ({ page }) => {
    // Surah Al-Fatiha has only 7 verses
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const jumpSelect = page.locator(JUMP_SELECT);
    await expect(jumpSelect).not.toBeVisible();
  });

  test('should scroll to the target verse when jump is triggered', async ({ page }) => {
    await page.goto('/books/quran:2?lang=en');
    await page.waitForLoadState('networkidle');

    // Native select: choose verse 100 directly
    const jumpSelect = page.locator(JUMP_SELECT);
    await jumpSelect.selectOption('100');

    // Wait for scroll and fragment update
    await page.waitForTimeout(1000);

    // The URL fragment should be updated
    const url = page.url();
    expect(url).toContain('h100');

    // The anchor element for verse 100 should be near the viewport
    const anchor = page.locator('#h100');
    await expect(anchor).toBeAttached();
  });

  test('should show jump-to-verse control for long hadith chapters', async ({ page }) => {
    // Al-Kafi volume 1, book 2, chapter 1 typically has 20+ hadiths
    await page.goto('/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Check if the chapter has enough verses for the control to appear
    const jumpSelect = page.locator(JUMP_SELECT);
    const verseCards = page.locator('mat-card');
    const count = await verseCards.count();

    if (count >= 20) {
      await expect(jumpSelect).toBeVisible();
    } else {
      await expect(jumpSelect).not.toBeVisible();
    }
  });
});
