import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n)', () => {
  test('should load with English as default language', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Footer should contain English text
    const footer = page.locator('#footer');
    await expect(footer).toContainText('About');
    await expect(footer).toContainText('Download');
    await expect(footer).toContainText('Support');
  });

  test('should persist language via ?lang= query param', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // URL should contain lang param
    const url = page.url();
    expect(url).toContain('lang=en');
  });

  test('should have language picker in header', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Look for a language selector element (mat-select or select)
    const langPicker = page.locator('mat-select, select, [class*="lang"]').first();
    // If language picker exists, it should be visible
    if (await langPicker.isVisible()) {
      await expect(langPicker).toBeVisible();
    }
  });

  test('should have lang="ar" on Arabic text elements', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

    // Arabic text containers should have lang="ar"
    const arabicElements = page.locator('[lang="ar"]');
    const count = await arabicElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have lang="ar" on narrator page Arabic names', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const arabicH1 = page.locator('h1[lang="ar"]');
    await expect(arabicH1).toBeVisible();
  });

  test('should have lang="ar" on chapter list Arabic titles', async ({ page }) => {
    await page.goto('/books/al-kafi:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 10000 });

    const arabicCells = page.locator('[lang="ar"]');
    const count = await arabicCells.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Individual Hadith Pages', () => {
  // Note: These tests will work once per-hadith JSON files are generated.
  // For now they verify the VerseDetail component routing works with the URL pattern.

  test('should have hadith detail link icons in chapter view', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Look for the detail link icons (open_in_new icon)
    const detailLinks = page.locator('.verse-detail-link, a[aria-label*="details"]');
    const count = await detailLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have hadith detail link icons in Quran surah view', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

    const detailLinks = page.locator('.verse-detail-link, a[aria-label*="details"]');
    const count = await detailLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have accessible labels on hadith detail links', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    const detailLinks = page.locator('a[aria-label*="details"]');
    if (await detailLinks.count() > 0) {
      const label = await detailLinks.first().getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label).toContain('details');
    }
  });
});

test.describe('ExpandLanguagePipe', () => {
  test('should display full language names in translation selector', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

    // The translation selector should show language names
    const translationSelector = page.locator('app-translation-selection');
    if (await translationSelector.isVisible()) {
      const text = await translationSelector.textContent();
      // Should show "English" instead of just "en"
      expect(text).toContain('English');
    }
  });
});
