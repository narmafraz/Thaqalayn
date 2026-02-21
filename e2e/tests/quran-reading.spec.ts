import { test, expect } from '@playwright/test';

test.describe('Quran Reading', () => {
  test('should display Surah Al-Fatiha with verses', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Title section should show Al-Fatiha in English and Arabic
    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible();
    await expect(titles).toContainText('The Opening');
    await expect(titles).toContainText(/[\u0600-\u06FF]/); // Arabic title

    // Should display verse cards (mat-card)
    const verseCards = page.locator('mat-card');
    await expect(verseCards.first()).toBeVisible();

    // Al-Fatiha has 7 verses
    const count = await verseCards.count();
    expect(count).toBe(7);
  });

  test('should display Arabic verse text', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Check for Arabic verse text (RTL paragraphs with Arabic content)
    const arabicText = page.locator('.verseText.arabic[dir="rtl"]');
    await expect(arabicText.first()).toBeVisible();
    await expect(arabicText.first()).toContainText(/[\u0600-\u06FF]/);
  });

  test('should display English translation', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Translation text should be visible
    const translation = page.locator('.translation');
    await expect(translation.first()).toBeVisible();

    // Translation should contain English text
    const text = await translation.first().textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(5);
  });

  test('should show verse references with link icons', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Each verse card should have a reference section
    const refs = page.locator('.ref');
    await expect(refs.first()).toBeVisible();
    await expect(refs.first()).toContainText('Reference');
  });

  test('should display a different surah correctly', async ({ page }) => {
    // Navigate to Surah Al-Baqarah (surah 2) - just check it loads
    await page.goto('/books/quran:2?lang=en');
    await page.waitForLoadState('networkidle');

    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible();
    await expect(titles).toContainText('The Cow');

    // Al-Baqarah has 286 verses
    const verseCards = page.locator('mat-card');
    await expect(verseCards.first()).toBeVisible();
    const count = await verseCards.count();
    expect(count).toBe(286);
  });
});
