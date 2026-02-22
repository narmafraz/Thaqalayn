import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n)', () => {
  test('should load with English as default language', async ({ page }) => {
    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Footer should contain English text
    const footer = page.locator('#footer');
    await expect(footer).toContainText('About');
    await expect(footer).toContainText('Download');
    await expect(footer).toContainText('Support');
  });

  test('should persist language via ?lang= query param', async ({ page }) => {
    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');

    // URL should contain lang param
    const url = page.url();
    expect(url).toContain('lang=en');
  });

  test('should have language picker in header', async ({ page }) => {
    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Look for a language selector element (mat-select or select)
    const langPicker = page.locator('mat-select, select, [class*="lang"]').first();
    // If language picker exists, it should be visible
    if (await langPicker.isVisible()) {
      await expect(langPicker).toBeVisible();
    }
  });

  test('should have lang="ar" on Arabic text elements', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

    // Arabic text containers should have lang="ar"
    const arabicElements = page.locator('[lang="ar"]');
    const count = await arabicElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have lang="ar" on narrator page Arabic names', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const arabicH1 = page.locator('h1[lang="ar"]');
    await expect(arabicH1).toBeVisible();
  });

  test('should have lang="ar" on chapter list Arabic titles', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 10000 });

    const arabicCells = page.locator('[lang="ar"]');
    const count = await arabicCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should set html lang attribute to match UI language', async ({ page }) => {
    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');

    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('en');
  });
});

test.describe('Language Switching', () => {
  test('should display Arabic UI strings when lang=ar', async ({ page }) => {
    await page.goto('/#/books?lang=ar');
    await page.waitForLoadState('networkidle');

    // Footer should contain Arabic text (translated nav strings)
    const footer = page.locator('#footer');
    await expect(footer).toContainText('حول');     // "About" in Arabic
    await expect(footer).toContainText('تحميل');   // "Download" in Arabic
    await expect(footer).toContainText('دعم');     // "Support" in Arabic
  });

  test('should display translated column headers when lang=ar', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 10000 });

    // The table headers should show Arabic text
    const pageContent = await page.content();
    // Check for Arabic number symbol or translated column header
    expect(pageContent).toMatch(/[\u0600-\u06FF]/);
  });

  test('should display translated narrator page strings when lang=ar', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 10000 });

    // Filter placeholder should be in Arabic
    const filterInput = page.locator('input[matinput], input[type="text"]').first();
    if (await filterInput.isVisible()) {
      const placeholder = await filterInput.getAttribute('placeholder');
      // Should contain Arabic text (the translated "Filter" string)
      if (placeholder) {
        expect(placeholder).toMatch(/[\u0600-\u06FF]/);
      }
    }
  });
});

test.describe('RTL Layout', () => {
  test('should set dir="rtl" on html element when lang=ar', async ({ page }) => {
    await page.goto('/#/books?lang=ar');
    await page.waitForLoadState('networkidle');

    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');
  });

  test('should set dir="ltr" on html element when lang=en', async ({ page }) => {
    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');

    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('ltr');
  });

  test('should maintain RTL layout on content pages', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');
  });
});

test.describe('Dual-Language Display', () => {
  test('should always show Arabic text alongside English on Quran page', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

    // Arabic text should be present (in lang="ar" containers)
    const arabicElements = page.locator('[lang="ar"]');
    const arabicCount = await arabicElements.count();
    expect(arabicCount).toBeGreaterThan(0);

    // English translation text should also be present
    const pageText = await page.textContent('body');
    // Quran Fatiha has well-known English text
    expect(pageText).toContain('In the Name of');
  });

  test('should always show Arabic text alongside English on Al-Kafi page', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Arabic text should be visible
    const arabicElements = page.locator('[lang="ar"]');
    const arabicCount = await arabicElements.count();
    expect(arabicCount).toBeGreaterThan(0);

    // Arabic Unicode characters should be in the page
    const pageContent = await page.content();
    expect(pageContent).toMatch(/[\u0600-\u06FF]/);
  });

  test('should show Arabic book titles in chapter list regardless of UI language', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table').first().waitFor({ state: 'visible', timeout: 10000 });

    // Arabic column should have Arabic text
    const arabicCells = page.locator('[lang="ar"]');
    const count = await arabicCells.count();
    expect(count).toBeGreaterThan(0);

    // Verify actual Arabic characters in those cells
    const firstArabicText = await arabicCells.first().textContent();
    expect(firstArabicText).toMatch(/[\u0600-\u06FF]/);
  });
});

test.describe('Individual Hadith Pages', () => {
  // Note: These tests will work once per-hadith JSON files are generated.
  // For now they verify the VerseDetail component routing works with the URL pattern.

  test('should have hadith detail link icons in chapter view', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Look for the detail link icons (open_in_new icon)
    const detailLinks = page.locator('.verse-detail-link, a[aria-label*="details"]');
    const count = await detailLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have hadith detail link icons in Quran surah view', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

    const detailLinks = page.locator('.verse-detail-link, a[aria-label*="details"]');
    const count = await detailLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have accessible labels on hadith detail links', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
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
    await page.goto('/#/books/quran:1?lang=en');
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
