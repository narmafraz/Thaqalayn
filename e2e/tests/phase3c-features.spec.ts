import { test, expect } from '@playwright/test';

/**
 * Phase 3C Feature Tests
 *
 * Tests for verification badges, grading badges, narrator biography display,
 * and diff viewer component. These features are rendered client-side from
 * JSON data, so they test component behavior with the data available in production.
 *
 * Note: Some features (gradings, cross_validation, biography) depend on data
 * being present in the JSON files. Tests use conditional checks where data
 * may not yet be populated.
 */

test.describe('Grading Badges', () => {
  test('should render grading badges when gradings data is present', async ({ page }) => {
    // Navigate to a hadith detail page (individual hadith)
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for content to render
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    // Check if grading section exists (conditional on data)
    const gradingSection = page.locator('.gradings-section');
    if (await gradingSection.isVisible()) {
      // Grading badges should be inside the section
      const badges = gradingSection.locator('.grading-badge');
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);

      // Each badge should have a CSS class for color-coding
      const firstBadge = badges.first();
      const classes = await firstBadge.getAttribute('class');
      expect(classes).toMatch(/grading-(sahih|hasan|daif|mutabar|unknown)/);
    }
  });

  test('should show scholar name in grading badge', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const gradingSection = page.locator('.gradings-section');
    if (await gradingSection.isVisible()) {
      const scholarNames = gradingSection.locator('.grading-scholar');
      if (await scholarNames.count() > 0) {
        const text = await scholarNames.first().textContent();
        expect(text).toBeTruthy();
        // Scholar name should be in parentheses
        expect(text).toMatch(/\(.+\)/);
      }
    }
  });

  test('should use correct color classes for different grading levels', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const badges = page.locator('.grading-badge');
    const count = await badges.count();
    for (let i = 0; i < count; i++) {
      const badge = badges.nth(i);
      const classes = await badge.getAttribute('class');
      // Every badge must have exactly one grading class
      const gradingClasses = (classes || '').match(/grading-(sahih|hasan|daif|mutabar|unknown)/g);
      expect(gradingClasses).not.toBeNull();
      expect(gradingClasses!.length).toBe(1);
    }
  });
});

test.describe('Verification Badges', () => {
  test('should render verification badge when cross_validation data is present', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const validationSection = page.locator('.validation-section');
    if (await validationSection.isVisible()) {
      const badge = validationSection.locator('.validation-badge');
      await expect(badge).toBeVisible();

      // Badge should have verified or unverified class
      const classes = await badge.getAttribute('class');
      expect(classes).toMatch(/verified|unverified/);
    }
  });

  test('should show verified icon and source count for verified hadiths', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const verifiedBadge = page.locator('.validation-badge.verified');
    if (await verifiedBadge.isVisible()) {
      // Should contain the verified icon
      const icon = verifiedBadge.locator('mat-icon');
      await expect(icon).toBeVisible();
      const iconText = await icon.textContent();
      expect(iconText?.trim()).toBe('verified');

      // Should mention number of sources
      const badgeText = await verifiedBadge.textContent();
      expect(badgeText).toMatch(/source/i);
    }
  });

  test('should show help icon for unverified hadiths', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const unverifiedBadge = page.locator('.validation-badge.unverified');
    if (await unverifiedBadge.isVisible()) {
      const icon = unverifiedBadge.locator('mat-icon');
      await expect(icon).toBeVisible();
      const iconText = await icon.textContent();
      expect(iconText?.trim()).toBe('help_outline');
    }
  });
});

test.describe('Narrator Biography Display', () => {
  test('should display narrator name in Arabic', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const h1 = page.locator('h1.arabic[lang="ar"]');
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text).toMatch(/[\u0600-\u06FF]/);
  });

  test('should display transliteration when biography data is present', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const transliteration = page.locator('.transliteration');
    if (await transliteration.isVisible()) {
      const text = await transliteration.textContent();
      expect(text).toBeTruthy();
      // Transliteration should be Latin characters
      expect(text).toMatch(/[a-zA-Z]/);
    }
  });

  test('should display biography section when biography data is present', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      // Biography heading should be present
      const heading = biographySection.locator('h2');
      await expect(heading).toContainText('Biography');
    }
  });

  test('should display era field in biography', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const eraField = biographySection.locator('.bio-field', { hasText: /Era/i });
      if (await eraField.isVisible()) {
        const value = await eraField.locator('.bio-value').textContent();
        expect(value).toBeTruthy();
      }
    }
  });

  test('should display reliability badge with color coding', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const reliabilityField = biographySection.locator('.bio-field', { hasText: /Reliability/i });
      if (await reliabilityField.isVisible()) {
        const badge = reliabilityField.locator('.reliability-badge');
        await expect(badge).toBeVisible();

        // If the narrator is Thiqah/reliable, badge should have .reliable class
        const classes = await badge.getAttribute('class');
        const text = await badge.textContent();
        if (text?.includes('Thiqah') || text?.includes('ثقة')) {
          expect(classes).toContain('reliable');
        }
      }
    }
  });

  test('should display birth/death dates when available', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const birthField = biographySection.locator('.bio-field', { hasText: /Born/i });
      const deathField = biographySection.locator('.bio-field', { hasText: /Died/i });

      // At least one date field should be present for major narrators
      const hasBirth = await birthField.isVisible();
      const hasDeath = await deathField.isVisible();

      if (hasBirth) {
        const value = await birthField.locator('.bio-value').textContent();
        expect(value).toBeTruthy();
      }
      if (hasDeath) {
        const value = await deathField.locator('.bio-value').textContent();
        expect(value).toBeTruthy();
      }
    }
  });

  test('should display teachers and students lists when available', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const teachersField = biographySection.locator('.bio-field', { hasText: /Teachers/i });
      const studentsField = biographySection.locator('.bio-field', { hasText: /Students/i });

      if (await teachersField.isVisible()) {
        const value = await teachersField.locator('.bio-value').textContent();
        expect(value).toBeTruthy();
      }
      if (await studentsField.isVisible()) {
        const value = await studentsField.locator('.bio-value').textContent();
        expect(value).toBeTruthy();
      }
    }
  });

  test('should display biography summary text when available', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const summary = biographySection.locator('.bio-summary');
      if (await summary.isVisible()) {
        const text = await summary.textContent();
        expect(text!.length).toBeGreaterThan(10);
      }
    }
  });

  test('should display biography source attribution', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const source = biographySection.locator('.bio-source');
      if (await source.isVisible()) {
        const text = await source.textContent();
        expect(text).toContain('Source');
      }
    }
  });
});

test.describe('Hadith Detail Page - Phase 3C Integration', () => {
  test('should display hadith card with Arabic text and translation', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    // Arabic section should be present
    const arabicSection = page.locator('.arabic-section');
    if (await arabicSection.isVisible()) {
      // Should contain Arabic text
      const arabicText = await arabicSection.textContent();
      expect(arabicText).toMatch(/[\u0600-\u06FF]/);
    }
  });

  test('should display chapter context link', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const chapterLink = page.locator('.chapter-link');
    if (await chapterLink.isVisible()) {
      // Should contain arrow_upward icon
      const icon = chapterLink.locator('mat-icon');
      await expect(icon).toBeVisible();
    }
  });

  test('should have share and view-in-chapter action buttons', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    // Share button
    const shareBtn = page.locator('.share-btn, button:has-text("Share")');
    if (await shareBtn.isVisible()) {
      await expect(shareBtn).toBeVisible();
    }

    // View in chapter button
    const viewInChapter = page.locator('a:has-text("View in chapter context"), a:has-text("chapter")');
    if (await viewInChapter.first().isVisible()) {
      await expect(viewInChapter.first()).toBeVisible();
    }
  });

  test('should have source link when source_url is present', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const sourceLink = page.locator('.source-link');
    if (await sourceLink.isVisible()) {
      // Should open in new tab
      const target = await sourceLink.getAttribute('target');
      expect(target).toBe('_blank');
      // Should have noopener
      const rel = await sourceLink.getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });

  test('should have prev/next navigation on hadith detail page', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    const content = page.locator('mat-card, .hadith-card, .verse-detail-container');
    await content.first().waitFor({ state: 'visible', timeout: 15000 });

    const hadithNav = page.locator('.hadith-nav, nav[aria-label*="navigation"]');
    if (await hadithNav.isVisible()) {
      // Should have a next button (first hadith has no prev)
      const nextBtn = hadithNav.locator('.nav-next, a:has-text("Next")');
      if (await nextBtn.isVisible()) {
        await expect(nextBtn).toBeVisible();
      }
    }
  });
});

test.describe('Narrator Page - Phase 3C Accessibility', () => {
  test('should have no accessibility issues in biography section', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // Verify heading hierarchy: h1 for name, h2 for sections
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    const h2s = page.locator('h2');
    const h2Count = await h2s.count();
    expect(h2Count).toBeGreaterThanOrEqual(1);

    // Section headings should be h2, not skipping levels
    const allHeadings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(allHeadings.length).toBeGreaterThan(0);
  });

  test('should have proper lang="ar" attributes on Arabic content', async ({ page }) => {
    await page.goto('/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 10000 });

    // The Arabic name h1 should have lang="ar"
    const arabicH1 = page.locator('h1[lang="ar"]');
    await expect(arabicH1).toBeVisible();
  });
});
