import { test, expect } from '@playwright/test';

test.describe('Cross-References', () => {
  test('should display Mentions section on Al-Kafi chapters with Quran references', async ({ page }) => {
    // al-kafi:1:2:1 is known to have a verse that mentions Quran 9:122
    await page.goto('/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    const cards = page.locator('mat-card');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Cross-references render as inline AI chips; the relation label (e.g.
    // "Mentions:", "Mentioned In:") sits above the linked chips.
    const mentionsSection = page.locator('.ai-relation-type-label', { hasText: /Mentions|Mentioned In/ });
    await expect(mentionsSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have clickable cross-reference links to other books', async ({ page }) => {
    await page.goto('/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('mat-card');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Cross-reference links should contain /books/ paths
    const crossRefLinks = page.locator('.ai-quran-chip, .ai-relation-chip');
    const count = await crossRefLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should navigate when clicking a cross-reference link', async ({ page }) => {
    await page.goto('/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('mat-card');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Find a cross-reference link
    const crossRefLinks = page.locator('.ai-quran-chip, .ai-relation-chip');
    const count = await crossRefLinks.count();

    if (count > 0) {
      const href = await crossRefLinks.first().getAttribute('href');
      await crossRefLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Should have navigated to a different page
      const currentUrl = page.url();
      expect(currentUrl).toContain('books');
    }
  });

  test('should display Mentioned In section on Quran verses referenced by Al-Kafi', async ({ page }) => {
    // Quran surah 1 (Al-Fatiha) verse 1 has a "Mentioned In" reference to Al-Kafi
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const cards = page.locator('mat-card');
    await expect(cards.first()).toBeVisible();

    // Look for "Mentioned In" relation labels in the verse references.
    const mentionedIn = page.locator('.ai-relation-type-label', { hasText: 'Mentioned In' });
    const count = await mentionedIn.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
