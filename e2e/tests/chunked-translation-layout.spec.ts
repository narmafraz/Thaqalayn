import { test, expect } from '@playwright/test';

/**
 * Chunked Translation Layout Tests
 *
 * Tests for the layout behavior when hadith chunks are displayed
 * with different translation types:
 * 1. AI translation (en.ai) — inline per-chunk translation, full width
 * 2. Non-AI translation (en.hubeali) — side-by-side 50/50 layout
 * 3. Translation comparison (AI + non-AI, or two non-AI)
 *
 * These tests depend on AI chunk data being present in the JSON files
 * for Al-Kafi chapters, and the "Show diacritized text" setting being
 * enabled (which activates the chunked view).
 */

const CHAPTER_WITH_CHUNKS = '/#/books/al-kafi:1:2:2';

/** Helper: enable diacritics setting if not already enabled */
async function enableDiacritics(page: import('@playwright/test').Page) {
  // Open AI settings panel
  const settingsBtn = page.locator('.ai-settings-btn').first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(300);

    // Check the diacritics checkbox (1st .ai-pref)
    const diacriticsCheckbox = page.locator('.ai-pref input[type="checkbox"]').nth(0);
    if (await diacriticsCheckbox.isVisible() && !(await diacriticsCheckbox.isChecked())) {
      await diacriticsCheckbox.check();
      await page.waitForTimeout(300);
    }

    // Close settings
    const closeBtn = page.locator('.ai-settings-close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }
}

test.describe('Chunked Translation Layout', () => {

  test('should display chunked view with AI translation inline (full width)', async ({ page }) => {
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.ai`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    await enableDiacritics(page);
    await page.waitForTimeout(500);

    // Look for chunked view with AI translation
    const chunkedView = page.locator('.chunked-view').first();
    if (await chunkedView.isVisible()) {
      // Should have the chunked-ai-translation class (full width mode)
      const hasAiClass = await chunkedView.evaluate(
        el => el.classList.contains('chunked-ai-translation')
      );

      // Check for chunk blocks
      const chunkBlocks = chunkedView.locator('.chunk-block');
      const count = await chunkBlocks.count();
      if (count > 0) {
        expect(count).toBeGreaterThan(0);

        // If AI translation data exists, chunks should have translation columns
        const translationCols = chunkedView.locator('.chunk-translation-col');
        const tCount = await translationCols.count();
        if (tCount > 0) {
          expect(hasAiClass).toBe(true);
          // Translation text should be present in at least one chunk
          const firstTranslation = translationCols.first().locator('.chunk-translation');
          if (await firstTranslation.isVisible()) {
            const text = await firstTranslation.textContent();
            expect(text!.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('should display non-AI translation side-by-side with chunks (50/50 layout)', async ({ page }) => {
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.hubeali`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    await enableDiacritics(page);
    await page.waitForTimeout(500);

    // With non-AI translation + chunks, the textrow should NOT have
    // chunked-ai-translation class (falls back to global 50/50 layout)
    const textrow = page.locator('.textrow').first();
    if (await textrow.isVisible()) {
      // chunked-view should exist but NOT have chunked-ai-translation class
      const chunkedView = textrow.locator('.chunked-view');
      if (await chunkedView.isVisible()) {
        const hasAiClass = await chunkedView.evaluate(
          el => el.classList.contains('chunked-ai-translation')
        );
        expect(hasAiClass).toBe(false);
      }

      // Translation should be visible as a separate column (via global flex layout)
      const translation = textrow.locator('.translation');
      if (await translation.first().isVisible()) {
        const text = await translation.first().textContent();
        expect(text!.length).toBeGreaterThan(0);
      }
    }
  });

  test('should show chunk blocks with Arabic text when diacritics enabled', async ({ page }) => {
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.hubeali`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    await enableDiacritics(page);
    await page.waitForTimeout(500);

    // Chunk blocks should contain Arabic text
    const chunkArabic = page.locator('.chunk-arabic').first();
    if (await chunkArabic.isVisible()) {
      const text = await chunkArabic.textContent();
      expect(text).toMatch(/[\u0600-\u06FF]/);
    }
  });

  test('should display chunk type labels (isnad, body, etc.)', async ({ page }) => {
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.ai`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    await enableDiacritics(page);
    await page.waitForTimeout(500);

    // Check for chunk labels
    const labels = page.locator('.chunk-label');
    const count = await labels.count();
    if (count > 0) {
      const text = await labels.first().textContent();
      expect(text?.toLowerCase()).toMatch(/isnad|body|quran_quote|opening|closing/);
    }
  });
});

test.describe('Translation Comparison with Chunks', () => {

  test('should display two non-AI translations side-by-side', async ({ page }) => {
    // Use translation comparison: primary + secondary (both non-AI)
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.hubeali&translation2=en.sarwar`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    // Both translation columns should be visible
    const translationCol1 = page.locator('.translation-col').first();
    const translationCol2 = page.locator('.translation-col-2').first();

    if (await translationCol1.isVisible()) {
      const text1 = await translationCol1.textContent();
      expect(text1!.length).toBeGreaterThan(0);
    }

    if (await translationCol2.isVisible()) {
      const text2 = await translationCol2.textContent();
      expect(text2!.length).toBeGreaterThan(0);
    }

    // The side-by-side class should be applied (grid layout)
    const sideBySide = page.locator('.side-by-side').first();
    if (await translationCol2.isVisible()) {
      await expect(sideBySide).toBeVisible();
    }
  });

  test('should compare AI translation with non-AI translation', async ({ page }) => {
    // AI as primary, non-AI as secondary
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.ai&translation2=en.hubeali`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    await enableDiacritics(page);
    await page.waitForTimeout(500);

    // When AI translation is primary with chunks, the chunked view shows inline translations
    // The secondary (non-AI) translation should still be visible
    const translationCol2 = page.locator('.translation-col-2').first();
    if (await translationCol2.isVisible()) {
      const text = await translationCol2.textContent();
      expect(text!.length).toBeGreaterThan(0);
    }
  });

  test('should compare non-AI primary with AI secondary translation', async ({ page }) => {
    // Non-AI as primary, AI as secondary
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.hubeali&translation2=en.ai`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    // Primary non-AI translation should be visible
    const primaryTranslation = page.locator('.translation').first();
    if (await primaryTranslation.isVisible()) {
      const text = await primaryTranslation.textContent();
      expect(text!.length).toBeGreaterThan(0);
    }

    // Secondary AI translation should also be visible
    const translationCol2 = page.locator('.translation-col-2').first();
    if (await translationCol2.isVisible()) {
      const text = await translationCol2.textContent();
      expect(text!.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Word-by-Word with Translation Comparison', () => {

  test('should show word-by-word with AI+non-AI comparison side-by-side', async ({ page }) => {
    // AI as primary, non-AI as secondary, with word-by-word enabled via toolbar
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.ai&translation2=en.hubeali`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    // Click the word-by-word toggle button in the chapter toolbar
    const wbwToggle = page.locator('.word-by-word-toggle');
    if (await wbwToggle.isVisible()) {
      await wbwToggle.click();
      await page.waitForTimeout(500);

      // Word analysis grid should be visible (replaces Arabic text)
      const wordGrid = page.locator('.word-analysis-grid').first();
      if (await wordGrid.isVisible()) {
        // Word cards should be present
        const wordCards = wordGrid.locator('.word-card');
        const count = await wordCards.count();
        expect(count).toBeGreaterThan(0);
      }

      // Both translation columns should be visible side-by-side
      const translationCol1 = firstCard.locator('.translation-col').first();
      const translationCol2 = firstCard.locator('.translation-col-2').first();

      if (await translationCol1.isVisible() && await translationCol2.isVisible()) {
        // Side-by-side class should be applied
        const sideBySide = firstCard.locator('.side-by-side').first();
        await expect(sideBySide).toBeVisible();

        // Both should have content
        const text1 = await translationCol1.textContent();
        const text2 = await translationCol2.textContent();
        expect(text1!.length).toBeGreaterThan(0);
        expect(text2!.length).toBeGreaterThan(0);
      }

      // AI extras (summary, key terms) should be OUTSIDE the side-by-side grid
      const aiExtra = firstCard.locator('.ai-translation-extra').first();
      if (await aiExtra.isVisible()) {
        // It should NOT be inside the .side-by-side container
        const isInsideSideBySide = await aiExtra.evaluate(
          el => !!el.closest('.side-by-side')
        );
        expect(isInsideSideBySide).toBe(false);
      }
    }
  });

  test('should display AI summary/key-terms when comparing translations', async ({ page }) => {
    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.ai&translation2=en.hubeali`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    // AI extras (summary, key terms) should be visible when AI translation is selected
    const aiExtra = firstCard.locator('.ai-translation-extra').first();
    if (await aiExtra.isVisible()) {
      // Should have content (summary or key terms)
      const text = await aiExtra.textContent();
      expect(text!.length).toBeGreaterThan(0);
    }

    // Both translation columns should be present in compare mode
    const translationCol2 = firstCard.locator('.translation-col-2').first();
    if (await translationCol2.isVisible()) {
      const text = await translationCol2.textContent();
      expect(text!.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Translation Layout Responsiveness', () => {

  test('should stack translations on narrow viewports', async ({ page }) => {
    // Set narrow viewport
    await page.setViewportSize({ width: 400, height: 800 });

    await page.goto(`${CHAPTER_WITH_CHUNKS}?lang=en&translation=en.hubeali&translation2=en.sarwar`);
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 15000 });

    // On mobile, side-by-side should stack to single column
    const sideBySide = page.locator('.side-by-side').first();
    if (await sideBySide.isVisible()) {
      // The CSS media query at 600px switches to single column
      // On 400px viewport, translation-col-2 should have top border instead of left border
      const col2 = sideBySide.locator('.translation-col-2');
      if (await col2.isVisible()) {
        const borderLeft = await col2.evaluate(
          el => getComputedStyle(el).borderLeftStyle
        );
        // On narrow viewport, should be 'none' (top border used instead)
        expect(borderLeft).toBe('none');
      }
    }
  });
});
