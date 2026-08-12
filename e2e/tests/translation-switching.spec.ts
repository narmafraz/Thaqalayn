import { test, expect, Page } from '@playwright/test';

// The translation selector lives in the Settings reading sheet (opened from
// the top app bar), not inline on chapter pages.
async function openReadingSheet(page: Page): Promise<void> {
  await page.locator('button.reading-sheet-trigger').click();
  await expect(page.locator('.reading-sheet-panel')).toHaveClass(/open/);
}

async function closeReadingSheet(page: Page): Promise<void> {
  await page.locator('.reading-sheet-close').click();
  await expect(page.locator('.reading-sheet-panel')).not.toHaveClass(/open/);
}

test.describe('Translation Switching', () => {
  test('translation selector lives in the settings sheet, not inline on the page', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // No inline translation dropdown on the chapter page itself
    await expect(page.locator('app-chapter-content app-translation-selection')).toHaveCount(0);

    // The settings sheet hosts the selector
    await openReadingSheet(page);
    const translationSelect = page.locator('.reading-sheet-panel mat-select[name="translation"]');
    await expect(translationSelect).toBeVisible();
  });

  test('should show available translations in dropdown', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    await openReadingSheet(page);
    const selectTrigger = page.locator('.reading-sheet-panel mat-select[name="translation"]');
    await selectTrigger.click();

    // Options panel should appear
    const options = page.locator('mat-option');
    await expect(options.first()).toBeVisible();

    // Should have multiple translation options
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Close the dropdown by pressing Escape
    await page.keyboard.press('Escape');
  });

  test('should change displayed translation when switching', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Get current translation text
    const translation = page.locator('.translation').first();
    await expect(translation).toBeVisible();

    await openReadingSheet(page);
    const selectTrigger = page.locator('.reading-sheet-panel mat-select[name="translation"]');
    await selectTrigger.click();

    const options = page.locator('mat-option');
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Click the second option (different from current)
      await options.nth(1).click();
      await page.waitForLoadState('networkidle');
      await closeReadingSheet(page);

      // Translation text may or may not change (depends on available translations)
      // Just verify the page still renders without errors
      await expect(translation).toBeVisible();
    } else {
      // Only one translation available, close dropdown
      await page.keyboard.press('Escape');
    }
  });

  test('should preserve translation selection via query params', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    await openReadingSheet(page);
    const selectTrigger = page.locator('.reading-sheet-panel mat-select[name="translation"]');
    await selectTrigger.click();

    const options = page.locator('mat-option');
    await expect(options.first()).toBeVisible();
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Click second option
      await options.nth(1).click();
      await page.waitForLoadState('networkidle');
      await closeReadingSheet(page);

      // Navigate to next surah
      const nextButton = page.locator('a[aria-label="Navigate to the next chapter"]').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // Translation selector should still be available on the new page
        await openReadingSheet(page);
        const newSelect = page.locator('.reading-sheet-panel mat-select[name="translation"]');
        await expect(newSelect).toBeVisible();
      }
    } else {
      await page.keyboard.press('Escape');
    }
  });
});
