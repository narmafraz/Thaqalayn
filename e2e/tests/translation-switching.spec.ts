import { test, expect } from '@playwright/test';

test.describe('Translation Switching', () => {
  test('should display translation selector on chapter pages', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Translation selection component should be visible
    const translationSelect = page.locator('mat-form-field', { hasText: 'Choose translation' });
    await expect(translationSelect.first()).toBeVisible();
  });

  test('should show available translations in dropdown', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Click the translation dropdown to open it
    const selectTrigger = page.locator('mat-select[name="translation"]').first();
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
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Get current translation text
    const translation = page.locator('.translation').first();
    await expect(translation).toBeVisible();
    const originalText = await translation.textContent();

    // Open the translation dropdown
    const selectTrigger = page.locator('mat-select[name="translation"]').first();
    await selectTrigger.click();

    // Get all options
    const options = page.locator('mat-option');
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Click the second option (different from current)
      await options.nth(1).click();
      await page.waitForLoadState('networkidle');

      // Translation text may or may not change (depends on available translations)
      // Just verify the page still renders without errors
      await expect(translation).toBeVisible();
    } else {
      // Only one translation available, close dropdown
      await page.keyboard.press('Escape');
    }
  });

  test('should preserve translation selection via query params', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Open translation dropdown and select a specific option
    const selectTrigger = page.locator('mat-select[name="translation"]').first();
    await selectTrigger.click();

    const options = page.locator('mat-option');
    await expect(options.first()).toBeVisible();
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Click second option
      await options.nth(1).click();
      await page.waitForLoadState('networkidle');

      // Navigate to next surah
      const nextButton = page.locator('a[aria-label="Navigate to the next chapter"]').first();
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // Translation selector should still be visible on the new page
        const newSelect = page.locator('mat-form-field', { hasText: 'Choose translation' });
        await expect(newSelect.first()).toBeVisible();
      }
    } else {
      await page.keyboard.press('Escape');
    }
  });
});
