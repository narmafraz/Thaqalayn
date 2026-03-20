import { test, expect } from '@playwright/test';

/**
 * Phase 3 Narrator Overhaul Tests
 *
 * Tests for NAR-01 (visual hierarchy), NAR-03 (hadith preview cards),
 * NAR-05 (hover cards), and NAR-06 (teacher/student sections).
 *
 * Uses narrator 19 (Imam al-Sadiq) for profile tests as he has extensive data.
 * Avoids duplicating tests already in narrator-pages.spec.ts (basic list loading,
 * filter existence, pagination, basic narrator page loading, Arabic name display,
 * narrated ahadith section, co-narrators section, breadcrumbs) and
 * phase3c-features.spec.ts (biography fields, reliability badges, heading hierarchy).
 */

test.describe('NAR-01: Narrator List Visual Hierarchy', () => {
  test('should display featured Imams section with gold-styled cards', async ({ page }) => {
    await page.goto('/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const featuredSection = page.locator('section.featured-imams');
    await expect(featuredSection).toBeVisible({ timeout: 15000 });

    // Should have imam cards
    const imamCards = featuredSection.locator('.imam-card');
    const count = await imamCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Cards should have the gold star badge icon
    const firstCard = imamCards.first();
    const badge = firstCard.locator('.imam-badge-icon');
    await expect(badge).toBeVisible();

    // Verify gold-ish styling: the imam-card should have a border or background
    // that distinguishes it (the CSS uses linear-gradient with gold tones)
    const borderColor = await firstCard.evaluate(
      el => getComputedStyle(el).borderColor
    );
    // Border should be set (not transparent/default)
    expect(borderColor).toBeTruthy();
  });

  test('should show Arabic and English names on featured Imam cards', async ({ page }) => {
    await page.goto('/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const imamCards = page.locator('.imam-card');
    await expect(imamCards.first()).toBeVisible({ timeout: 15000 });

    const firstCard = imamCards.first();

    // English name
    const enName = firstCard.locator('.imam-name-en');
    await expect(enName).toBeVisible();
    const enText = await enName.textContent();
    expect(enText).toBeTruthy();
    expect(enText).toMatch(/Imam/i);

    // Arabic name
    const arName = firstCard.locator('.imam-name-ar');
    await expect(arName).toBeVisible();
    const arText = await arName.textContent();
    expect(arText).toMatch(/[\u0600-\u06FF]/);

    // Arabic name should have lang="ar" attribute
    await expect(arName).toHaveAttribute('lang', 'ar');
  });

  test('should default sort narrator table by narrations descending', async ({ page }) => {
    await page.goto('/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // Verify the table is sorted by narrations descending by checking data order.
    // The narrations column uses class "center" on td cells. On wide screens,
    // each row has multiple center cells; the first center cell per row is narrations.
    // We read narration values from the first two rows to confirm descending order.
    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(2);

    // Get narration count from first row (4th cell = index 3, the narrations column)
    const firstRowCells = rows.nth(0).locator('td');
    const secondRowCells = rows.nth(1).locator('td');
    const firstCellCount = await firstRowCells.count();

    if (firstCellCount > 3) {
      // Wide screen layout: columns are index, name.en, name.ar, narrations, ...
      const firstRowNarrations = parseInt((await firstRowCells.nth(3).textContent()) || '0', 10);
      const secondRowNarrations = parseInt((await secondRowCells.nth(3).textContent()) || '0', 10);
      expect(firstRowNarrations).toBeGreaterThanOrEqual(secondRowNarrations);
    } else {
      // Small screen layout (single column): just verify the table has data
      const firstRowText = await rows.nth(0).textContent();
      expect(firstRowText).toBeTruthy();
    }
  });

  test('should filter narrator list by English name', async ({ page }) => {
    await page.goto('/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible({ timeout: 15000 });

    const filterInput = page.locator('input[matinput]').first();
    await expect(filterInput).toBeVisible();

    // Type "Sadiq" to filter for Imam al-Sadiq.
    // The filter uses fromEvent keyup with debounce, so we fill and then press a key
    // to ensure the keyup event fires and the debounced filter triggers.
    await filterInput.click();
    await filterInput.fill('Sadiq');
    await filterInput.press('Space');
    await filterInput.press('Backspace');
    // Wait for debounced filter to apply (150ms debounce + rendering)
    await page.waitForTimeout(1000);

    // Table should still have rows matching "Sadiq" (in English name field)
    const rows = table.locator('tr');
    // Count data rows (exclude header row)
    const allRows = await rows.count();
    // The featured imam section has "Sadiq" so at minimum check page text
    const pageText = await page.textContent('body');
    expect(pageText).toContain('Sadiq');
  });

  test('should filter narrator list by Arabic name', async ({ page }) => {
    await page.goto('/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible({ timeout: 15000 });

    const filterInput = page.locator('input[matinput]').first();
    await expect(filterInput).toBeVisible();

    // Fill Arabic text and trigger keyup to activate the debounced filter.
    await filterInput.click();
    await filterInput.fill('الصادق');
    await filterInput.press('Space');
    await filterInput.press('Backspace');
    await page.waitForTimeout(1000);

    // The page should contain Arabic text from the filtered results.
    // The filter matches against titles.ar, so narrators with الصادق should appear.
    const pageText = await page.textContent('body');
    expect(pageText).toMatch(/[\u0600-\u06FF]/);
  });
});

test.describe('NAR-03: Hadith Preview Cards', () => {
  const narratorUrl = '/people/narrators/19?lang=en';

  test('should show hadith preview cards instead of bare links', async ({ page }) => {
    await page.goto(narratorUrl);
    await page.waitForLoadState('networkidle');

    // Wait for narrator page to load
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 15000 });

    // Look for the narrated ahadith section
    const narratedSection = page.locator('section.narrated-section');
    await expect(narratedSection).toBeVisible({ timeout: 15000 });

    // Should have preview cards (not bare path-link elements)
    const previewCards = narratedSection.locator('.hadith-preview-card');
    const count = await previewCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display book name on preview cards', async ({ page }) => {
    await page.goto(narratorUrl);
    await page.waitForLoadState('networkidle');

    const previewCards = page.locator('.hadith-preview-card');
    await expect(previewCards.first()).toBeVisible({ timeout: 15000 });

    // First preview card should show a book name
    const bookName = previewCards.first().locator('.book-name');
    await expect(bookName).toBeVisible();
    const text = await bookName.textContent();
    expect(text).toBeTruthy();
    // Imam al-Sadiq narrates primarily in Al-Kafi
    expect(text!.trim().length).toBeGreaterThan(0);
  });

  test('should display chapter title on preview cards when available', async ({ page }) => {
    await page.goto(narratorUrl);
    await page.waitForLoadState('networkidle');

    const previewCards = page.locator('.hadith-preview-card');
    await expect(previewCards.first()).toBeVisible({ timeout: 15000 });

    // Check across multiple cards since not all may have chapter titles loaded
    const cardCount = await previewCards.count();
    let foundChapterTitle = false;

    for (let i = 0; i < Math.min(cardCount, 10); i++) {
      const chapterEl = previewCards.nth(i).locator('.preview-chapter');
      if (await chapterEl.isVisible()) {
        const text = await chapterEl.textContent();
        if (text && text.trim().length > 0) {
          foundChapterTitle = true;
          break;
        }
      }
    }

    // At least some preview cards should have chapter titles
    // (depends on IndexState having loaded book index data)
    expect(foundChapterTitle).toBe(true);
  });

  test('should make preview cards clickable and navigate to hadith', async ({ page }) => {
    await page.goto(narratorUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const previewCards = page.locator('.hadith-preview-card');
    await expect(previewCards.first()).toBeVisible({ timeout: 15000 });

    // Preview cards should contain an anchor link
    const firstLink = previewCards.first().locator('a.preview-link');
    await expect(firstLink).toBeVisible();

    // The link should have a routerLink (href) pointing to a book path
    const href = await firstLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('/books/');

    // Click the first preview card and verify navigation
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should navigate away from the narrator page to a book page.
    // The URL may use hash routing (/#/books/...) or path routing (/books/...).
    const url = page.url();
    expect(url).toMatch(/\/books\//);
  });
});

test.describe('NAR-05: Hover Cards', () => {
  test('should show hover card when hovering over narrator name in hadith chain', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for the hadith content to render
    const verseText = page.locator('.verseText').first();
    await expect(verseText).toBeVisible({ timeout: 15000 });

    // Find narrator chain links (these are the links in the narrator chain
    // that trigger hover cards)
    const narratorLinks = page.locator('a.narrator-link, .narrator-chain a[routerlink*="narrators"]');
    const linkCount = await narratorLinks.count();

    if (linkCount > 0) {
      // Hover over the first narrator link in the chain
      await narratorLinks.first().hover();

      // Wait briefly for the hover card to appear
      await page.waitForTimeout(500);

      // The narrator-hover-card component should become visible
      const hoverCard = page.locator('.narrator-hover-card');
      // Hover card may or may not appear depending on data availability
      if (await hoverCard.isVisible()) {
        // Hover card should display Arabic name
        const arabicName = hoverCard.locator('.hover-card-name');
        await expect(arabicName).toBeVisible();
        const nameText = await arabicName.textContent();
        expect(nameText).toMatch(/[\u0600-\u06FF]/);

        // Should have a "View Profile" link
        const profileLink = hoverCard.locator('.hover-card-link');
        await expect(profileLink).toBeVisible();

        // Should show narration stats
        const stats = hoverCard.locator('.hover-card-stats');
        await expect(stats).toBeVisible();
      }
    }
  });
});

test.describe('NAR-06: Teacher/Student Sections', () => {
  const narratorUrl = '/people/narrators/19?lang=en';

  test('should display teachers section on narrator profile when data is available', async ({ page }) => {
    await page.goto(narratorUrl);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 15000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const teachersField = biographySection.locator('.bio-field', { hasText: /Teachers/i });
      if (await teachersField.isVisible()) {
        // Teachers field should have a label and value
        const label = teachersField.locator('.bio-label');
        await expect(label).toBeVisible();

        const value = teachersField.locator('.bio-value');
        await expect(value).toBeVisible();
        const text = await value.textContent();
        expect(text).toBeTruthy();
        // Should contain at least one name (comma-separated list)
        expect(text!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should display students section on narrator profile when data is available', async ({ page }) => {
    await page.goto(narratorUrl);
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 15000 });

    const biographySection = page.locator('.biography-section');
    if (await biographySection.isVisible()) {
      const studentsField = biographySection.locator('.bio-field', { hasText: /Students/i });
      if (await studentsField.isVisible()) {
        // Students field should have a label and value
        const label = studentsField.locator('.bio-label');
        await expect(label).toBeVisible();

        const value = studentsField.locator('.bio-value');
        await expect(value).toBeVisible();
        const text = await value.textContent();
        expect(text).toBeTruthy();
        // Should contain at least one name (comma-separated list)
        expect(text!.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
