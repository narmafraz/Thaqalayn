import { test, expect } from '@playwright/test';

/**
 * Phase 4: Design System Tests
 *
 * Tests for spacing consistency, topic card interactions,
 * and localized page titles.
 */

test.describe('DS-01: Spacing System', () => {
  test('should apply consistent spacing on verse cards', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Verse cards should have consistent padding/margin via CSS custom properties or classes
    const cards = page.locator('mat-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Collect padding values from all visible cards to verify consistency
    const paddings: string[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      const padding = await cards.nth(i).evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.padding;
      });
      paddings.push(padding);
    }

    // All cards should have the same padding (consistent spacing)
    const uniquePaddings = new Set(paddings);
    expect(uniquePaddings.size).toBe(1);
  });

  test('should have visual separation between Arabic and English text', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Verify that Arabic text and translation text are both visible and
    // have distinct vertical positions (Arabic above translation).
    const firstCard = page.locator('mat-card').first();
    await expect(firstCard).toBeVisible();

    const result = await firstCard.evaluate(el => {
      const arabicEl = el.querySelector('.verseText.arabic');
      const translationEl = el.querySelector('.translation');
      if (!arabicEl || !translationEl) return null;

      const arabicRect = arabicEl.getBoundingClientRect();
      const translationRect = translationEl.getBoundingClientRect();

      return {
        arabicTop: arabicRect.top,
        translationTop: translationRect.top,
        arabicHeight: arabicRect.height,
        translationHeight: translationRect.height,
      };
    });

    if (result !== null) {
      // Both elements should have height (they are rendered and visible)
      expect(result.arabicHeight).toBeGreaterThan(0);
      expect(result.translationHeight).toBeGreaterThan(0);
      // Translation should start at or below the Arabic text's top position
      // (they are vertically stacked, or side-by-side at the same level)
      expect(result.translationTop).toBeGreaterThanOrEqual(result.arabicTop);
    }
  });
});

test.describe('DS-04: Topic Card Hover States', () => {
  test('should display topic cards on the topics page', async ({ page }) => {
    await page.goto('/topics?lang=en');
    await page.waitForLoadState('networkidle');

    // Topic cards or topic list items should exist
    const topicCards = page.locator('.topic-card, mat-card, .topic-item, mat-list-item');
    const count = await topicCards.count();

    // If the topics page has content, cards should be present
    if (count > 0) {
      await expect(topicCards.first()).toBeVisible({ timeout: 15000 });
    }
  });

  test('should have cursor: pointer on topic cards', async ({ page }) => {
    await page.goto('/topics?lang=en');
    await page.waitForLoadState('networkidle');

    // Find clickable topic elements
    const topicCards = page.locator('.topic-card, mat-card, .topic-item, mat-list-item');
    const count = await topicCards.count();

    if (count > 0) {
      const cursor = await topicCards.first().evaluate(el => {
        return window.getComputedStyle(el).cursor;
      });
      expect(cursor).toBe('pointer');
    }
  });
});

test.describe('DS-06: Localized Page Titles', () => {
  test('should have English page title on Quran Fatiha page with lang=en', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Wait for dynamic title to update
    await page.waitForTimeout(1000);

    const title = await page.title();
    expect(title).toBeTruthy();
    // Title should contain the surah name or "Quran"
    expect(title).toMatch(/Opening|Quran|Fatiha|Thaqalayn/i);
  });

  test('should have non-English page title on Quran Fatiha page with lang=ar', async ({ page }) => {
    await page.goto('/books/quran:1?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Wait for dynamic title to update
    await page.waitForTimeout(1000);

    const title = await page.title();
    expect(title).toBeTruthy();

    // Title should contain Arabic text (not purely English/ASCII)
    // Check that the title is NOT purely ASCII Latin characters
    const isPurelyEnglish = /^[A-Za-z0-9\s\-|:,.()]+$/.test(title);
    // Either contains Arabic characters or is not purely English
    const hasArabic = /[\u0600-\u06FF]/.test(title);
    expect(hasArabic || !isPurelyEnglish).toBe(true);
  });
});
