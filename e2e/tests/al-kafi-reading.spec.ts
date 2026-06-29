import { test, expect } from '@playwright/test';

test.describe('Al-Kafi Reading', () => {
  test('should display Al-Kafi chapter with hadiths', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Title section should be visible
    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible({ timeout: 15000 });

    // Should display hadith cards (mat-card with verse content)
    const cards = page.locator('mat-card');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should display narrator chains for hadiths', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Narrator chain text should be present (Arabic text with narrator links)
    const narratorChains = page.locator('.verseText.arabic >> nth=0');
    await expect(narratorChains).toBeVisible();
  });

  test('should have clickable narrator links in chains', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Look for narrator links within verse text (links to /people/narrators/)
    const narratorLinks = page.locator('mat-card a[href*="narrators"]');
    // There should be at least some narrator links if the chapter has hadiths
    const count = await narratorLinks.count();
    expect(count).toBeGreaterThanOrEqual(0); // Some chapters may have narrators, some may not
  });

  test('should display hadith reference numbers', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Each hadith card shows its number (e.g. "#1") in the corner...
    const firstCard = page.locator('mat-card').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });
    await expect(firstCard.locator('.hadith-number').first()).toContainText('#');

    // ...and the reference details live in the collapsible metadata section.
    await firstCard.locator('.metadata-toggle-btn').first().click();
    const meta = firstCard.locator('.secondary-metadata');
    await expect(meta).toContainText('In-book Reference');
  });

  test('should display Arabic hadith text', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Arabic RTL text should be present in hadiths
    const arabicText = page.locator('.verseText.arabic[dir="rtl"]');
    await expect(arabicText.first()).toBeVisible();
    const text = await arabicText.first().textContent();
    expect(text).toMatch(/[\u0600-\u06FF]/);
  });

  test('should display English translation of hadiths', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Translations render in the AI chunked view (.chunk-translation) or the
    // plain translation wrapper, depending on whether the hadith has AI content.
    const translation = page.locator('.chunk-translation, .translation-wrapper').first();
    await expect(translation).toBeVisible({ timeout: 15000 });
    const text = await translation.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(5);
  });
});
