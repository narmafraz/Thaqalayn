import { test, expect } from '@playwright/test';

/**
 * The settings a visitor picked have to come back on their next visit AND be
 * reflected in the controls that set them.
 *
 * Regression: the language survived a reload (the page rendered in Farsi) but
 * the Settings-sheet picker still read "English", so switching back to English
 * meant selecting Farsi first to force a change event.
 */

// The sheet has two <select>s (site language, word-by-word language);
// the site-language one is first.
const SHEET_SELECT = 'app-reading-sheet select.reading-sheet-select';

/** Opens the Settings sheet (idempotent) and returns the language <select>. */
async function openSettingsSheet(page: import('@playwright/test').Page) {
  const panel = page.locator('app-reading-sheet .reading-sheet-panel');
  if (!(await panel.evaluate(el => el.classList.contains('open')).catch(() => false))) {
    await page.locator('.reading-sheet-trigger, .mobile-reading-sheet-btn').first().click();
  }
  const select = page.locator(SHEET_SELECT).first();
  await select.waitFor({ state: 'visible' });
  return select;
}

test.describe('Settings persistence', () => {
  test('a language restored from storage is shown in both pickers', async ({ page }) => {
    await page.goto('/books/quran:1');
    await page.evaluate(() => localStorage.setItem('thaqalayn-ui-lang', 'fa'));

    await page.goto('/books/quran:1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('mat-select.lang-picker')).toContainText('فارسی');
    await expect(await openSettingsSheet(page)).toHaveValue('fa');
  });

  test('?lang= wins over the stored language and shows in the pickers', async ({ page }) => {
    await page.goto('/books/quran:1');
    await page.evaluate(() => localStorage.setItem('thaqalayn-ui-lang', 'fa'));

    await page.goto('/books/quran:1?lang=tr');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(await openSettingsSheet(page)).toHaveValue('tr');
  });

  test('a language picked in the sheet survives a reload', async ({ page }) => {
    await page.goto('/books/quran:1');
    await page.waitForLoadState('networkidle');

    await (await openSettingsSheet(page)).selectOption('es');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(await openSettingsSheet(page)).toHaveValue('es');
  });

  test('a stored theme and font size are restored', async ({ page }) => {
    await page.goto('/books/quran:1');
    await page.evaluate(() => {
      localStorage.setItem('thaqalayn-theme', 'dark');
      localStorage.setItem('thaqalayn-font-size', '130');
    });

    await page.goto('/books/quran:1');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toHaveClass(/dark-theme/);
    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--font-scale').trim());
    expect(scale).toBe('1.3');
  });
});
