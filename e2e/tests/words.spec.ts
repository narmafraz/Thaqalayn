import { test, expect } from '@playwright/test';

/**
 * E2E tests for the /words feature (Track A in WORDS_PROJECT_PLAN.md).
 *
 * Verifies:
 *  - Browse page loads with virtual scroll across surfaces/lemmas/roots
 *  - Direct navigation to surface/lemma/root pages works
 *  - Word-by-word toggle on a hadith renders clickable word cards
 *  - The toggle is now available even when v3 word_analysis data isn't
 *    present (chunks-only v4 hadiths get the same view via lazy lemma
 *    loads)
 *  - Classical lexicon accordion renders sanitized HTML safely
 *
 * NOTE: Playwright targets production by default (see playwright.config.ts).
 * These tests will fail until the words feature is deployed.
 */

test.describe('Words browse page', () => {
  test('should load /words with three tabs and a filter', async ({ page }) => {
    await page.goto('/words');
    await page.waitForLoadState('networkidle');

    // The browse page has tabs for lemmas/surfaces/roots
    await expect(page.locator('.tabs button', { hasText: 'Lemmas' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.tabs button', { hasText: 'Surfaces' })).toBeVisible();
    await expect(page.locator('.tabs button', { hasText: 'Roots' })).toBeVisible();

    // Filter input exists
    await expect(page.locator('.filter-input')).toBeVisible();

    // Virtual scroll viewport should have rendered some rows
    await expect(page.locator('.list-row').first()).toBeVisible({ timeout: 10000 });
  });

  test('switching tabs updates the displayed list', async ({ page }) => {
    await page.goto('/words');
    await page.waitForLoadState('networkidle');

    await page.locator('.tabs button', { hasText: 'Roots' }).click();
    await expect(page.locator('.tabs button.active', { hasText: 'Roots' })).toBeVisible();

    // Roots show "N lemmas" in row-meta
    await expect(page.locator('.list-row .row-meta').first()).toContainText('lemmas');
  });
});

test.describe('Lemma page', () => {
  test('should render the lemma قالَ with paradigm + classical lexicons', async ({ page }) => {
    // قالَ → percent-encoded path component
    await page.goto('/words/lemmas/' + encodeURIComponent('قالَ'));
    await page.waitForLoadState('networkidle');

    // Header renders the lemma in large Arabic
    await expect(page.locator('.lemma-title')).toContainText('قال', { timeout: 15000 });

    // Paradigm section should be present (it's a verb)
    await expect(page.locator('.paradigm h2')).toBeVisible();
    await expect(page.locator('.paradigm-group')).toHaveCount(3, { timeout: 5000 }); // past/present/imperative

    // Cross-references list has Wiktionary + QAC
    await expect(page.locator('.cross-refs a', { hasText: 'Wiktionary' })).toBeVisible();
  });

  test('classical_definitions accordion expands and renders sanitized body', async ({ page }) => {
    await page.goto('/words/lemmas/' + encodeURIComponent('قالَ'));
    await page.waitForLoadState('networkidle');

    const classicalSection = page.locator('.classical');
    // The section may not be present if no classical entries — only assert when it is.
    if (await classicalSection.count()) {
      const firstHeader = page.locator('.classical-entry .accordion-header').first();
      await firstHeader.click();

      // Expanded body should contain Arabic text (after sanitization).
      const expandedBody = page.locator('.classical-entry .accordion-body').first();
      await expect(expandedBody).toBeVisible();

      // Verify no <script> tag leaked through sanitizer
      const scripts = await expandedBody.locator('script').count();
      expect(scripts).toBe(0);
    }
  });
});

test.describe('Surface page', () => {
  test('should show occurrence count + paths + lemma link', async ({ page }) => {
    await page.goto('/words/' + encodeURIComponent('قَالَ'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.surface-title')).toContainText('قَالَ', { timeout: 15000 });
    await expect(page.locator('.surface-stats')).toContainText('times');

    // Lemma link is a router link to /words/lemmas/...
    const lemmaLink = page.locator('.morphology-grid .lemma-link');
    await expect(lemmaLink).toBeVisible();
    const href = await lemmaLink.getAttribute('href');
    expect(href).toContain('/words/lemmas/');
  });

  test('occurrence paths use app-path-link', async ({ page }) => {
    await page.goto('/words/' + encodeURIComponent('قَالَ'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.path-list app-path-link').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Root page', () => {
  test('should list lemmas for ق-_-ل', async ({ page }) => {
    // ق-_-ل (root q-w-l with weak-radical placeholder)
    await page.goto('/words/roots/' + encodeURIComponent('ق-_-ل'));
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.root-title')).toContainText('ق-_-ل', { timeout: 15000 });
    await expect(page.locator('.lemma-list .lemma-link').first()).toBeVisible();
  });
});

test.describe('Word-by-word lazy-load in hadith view', () => {
  test('toggling word-by-word on a v4 hadith renders clickable cards', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for verse text to render
    const verseText = page.locator('app-verse-text').first();
    await expect(verseText).toBeVisible({ timeout: 15000 });

    // The word-by-word toggle button (matIcon grid_view / view_stream).
    // It should be present even on v4 hadiths (no inlined word_analysis).
    const wordToggle = verseText.locator('button.ai-toggle-btn[matTooltip*="word"]').first();
    if (await wordToggle.count() === 0) {
      // Selector fallback — match by mat-icon content.
      const fallback = verseText.locator('button.ai-toggle-btn:has(mat-icon:text("grid_view"))').first();
      if (await fallback.count()) {
        await fallback.click();
      }
    } else {
      await wordToggle.click();
    }

    // Word cards should render inside the grid
    await expect(page.locator('.word-analysis-grid .word-card').first()).toBeVisible({ timeout: 5000 });

    // Click the first word card → popup should appear
    await page.locator('.word-analysis-grid .word-card').first().click();
    const popup = page.locator('.word-popup');
    await expect(popup).toBeVisible();
    // The "Full word page" link should be in the popup, pointing to /words/...
    await expect(popup.locator('a.word-popup-link')).toBeVisible();
    const href = await popup.locator('a.word-popup-link').getAttribute('href');
    expect(href).toContain('/words/');
  });
});
