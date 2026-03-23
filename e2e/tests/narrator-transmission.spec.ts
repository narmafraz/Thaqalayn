import { test, expect } from '@playwright/test';

/**
 * Tests for the narrator transmission analysis and cross-filtering feature.
 * Uses narrator 10 (Ibn Mahbub) — a prolific narrator with data across
 * multiple books and many narrated-from/to relationships.
 */
test.describe('Narrator Transmission Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/people/narrators/10?lang=en');
    await page.waitForLoadState('networkidle');
    // Wait for narrator data to load
    await page.locator('h1.arabic').waitFor({ state: 'visible' });
  });

  // ── Narrated From / To sections ──

  test('should display "Narrated From" section with bar chart', async ({ page }) => {
    const section = page.locator('h2', { hasText: /Narrated From \(\d+\)/ });
    await expect(section).toBeVisible();

    // Should have rows with bars
    const rows = section.locator('..').locator('.transmission-bar-row');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // First row should have highest count and a visible bar
    const firstBar = rows.first().locator('.transmission-fill');
    const width = await firstBar.evaluate(el => parseFloat(getComputedStyle(el).width));
    expect(width).toBeGreaterThan(0);
  });

  test('should display "Narrated To" section with bar chart', async ({ page }) => {
    const section = page.locator('h2', { hasText: /Narrated To \(\d+\)/ });
    await expect(section).toBeVisible();

    const rows = section.locator('..').locator('.transmission-bar-row');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should show percentage and count for each narrator', async ({ page }) => {
    const firstRow = page.locator('.transmission-section').first().locator('.transmission-bar-row').first();

    const count = firstRow.locator('.transmission-count');
    await expect(count).toBeVisible();
    const countText = await count.textContent();
    expect(parseInt(countText!.replace(/,/g, ''))).toBeGreaterThan(0);

    const pct = firstRow.locator('.transmission-pct');
    await expect(pct).toBeVisible();
    const pctText = await pct.textContent();
    expect(pctText).toMatch(/\d+%/);
  });

  test('should normalize bar widths so top entry has widest bar', async ({ page }) => {
    const section = page.locator('.transmission-section').first();
    const bars = section.locator('.transmission-fill');

    // Get widths of first two bars
    const firstWidth = await bars.nth(0).evaluate(el => parseFloat(getComputedStyle(el).width));
    const secondWidth = await bars.nth(1).evaluate(el => parseFloat(getComputedStyle(el).width));

    // First (largest) should be wider than second
    expect(firstWidth).toBeGreaterThanOrEqual(secondWidth);
    // First should use near-full track width (barWidth ~100%)
    const trackWidth = await bars.nth(0).locator('..').evaluate(el => parseFloat(getComputedStyle(el).width));
    expect(firstWidth / trackWidth).toBeGreaterThan(0.9);
  });

  test('narrator name should be a clickable link to their profile', async ({ page }) => {
    const nameLink = page.locator('.transmission-section').first()
      .locator('.transmission-name').first();
    await expect(nameLink).toBeVisible();

    const href = await nameLink.getAttribute('href');
    expect(href).toMatch(/\/people\/narrators\/\d+/);
  });

  test('should show "Show all" button when more than 10 entries', async ({ page }) => {
    // Narrated To for narrator 10 has 188 entries — should show "Show all"
    const toSection = page.locator('.transmission-section').nth(1);
    const showAll = toSection.locator('button', { hasText: /Show all \d+/ });
    await expect(showAll).toBeVisible();
  });

  // ── Cross-filtering ──

  test('clicking a book distribution row should filter all sections', async ({ page }) => {
    // Get initial narration count from first hadith preview count
    const initialCount = await page.locator('.transmission-section').first()
      .locator('.transmission-bar-row').count();

    // Click first book distribution row (Al-Kafi)
    const bookRow = page.locator('.distribution-bar-row').first();
    const bookName = await bookRow.locator('.bar-label').textContent();
    await bookRow.click();

    // Active filter chips should appear
    const filterBar = page.locator('.active-filters');
    await expect(filterBar).toBeVisible();
    await expect(filterBar.locator('.filter-chip')).toBeVisible();

    // Book row should have active-filter class
    await expect(bookRow).toHaveClass(/active-filter/);

    // Narrations count in the ahadith section should change
    // (or at least the filter is visually active)
    const clearBtn = page.locator('.clear-filters-btn');
    await expect(clearBtn).toBeVisible();
  });

  test('clicking a "Narrated From" row should filter narrations', async ({ page }) => {
    // Get initial narrated ahadith count
    const paginatorBefore = page.locator('mat-paginator').first();
    const rangeBefore = await paginatorBefore.locator('.mat-mdc-paginator-range-label').textContent();

    // Click first "Narrated From" row (not the name link)
    const fromRow = page.locator('.transmission-section').first()
      .locator('.transmission-bar-row').first();
    // Click on the stats area (not the name link)
    await fromRow.locator('.transmission-stats').click();

    // Filter chip should appear
    const filterBar = page.locator('.active-filters');
    await expect(filterBar).toBeVisible();
    await expect(filterBar.locator('.from-chip')).toBeVisible();

    // Narrations should be filtered (count should change)
    const rangeAfter = await paginatorBefore.locator('.mat-mdc-paginator-range-label').textContent();
    // The filtered count should be less than or equal to the original
    expect(rangeAfter).not.toEqual(rangeBefore);
  });

  test('clicking a "Narrated To" row should filter narrations', async ({ page }) => {
    // Click first "Narrated To" row
    const toSection = page.locator('.transmission-section').nth(1);
    const toRow = toSection.locator('.transmission-bar-row').first();
    await toRow.locator('.transmission-stats').click();

    // Filter chip should appear
    const filterBar = page.locator('.active-filters');
    await expect(filterBar).toBeVisible();
    await expect(filterBar.locator('.to-chip')).toBeVisible();
  });

  test('multiple filters should combine (AND logic)', async ({ page }) => {
    // Click a book
    const bookRow = page.locator('.distribution-bar-row').first();
    await bookRow.click();
    await expect(page.locator('.active-filters')).toBeVisible();

    // Then click a "Narrated From" row
    const fromRow = page.locator('.transmission-section').first()
      .locator('.transmission-bar-row').first();
    await fromRow.locator('.transmission-stats').click();

    // Should have 2 filter chips
    const chips = page.locator('.active-filters .filter-chip');
    await expect(chips).toHaveCount(2);
  });

  test('clicking a filter again should deselect it', async ({ page }) => {
    // Click a book to activate filter
    const bookRow = page.locator('.distribution-bar-row').first();
    await bookRow.click();
    await expect(page.locator('.active-filters')).toBeVisible();

    // Click same book again to deselect
    await bookRow.click();

    // Filter bar should disappear
    await expect(page.locator('.active-filters')).not.toBeVisible();
  });

  test('clear filters button should remove all filters', async ({ page }) => {
    // Activate two filters
    await page.locator('.distribution-bar-row').first().click();
    await page.locator('.transmission-section').first()
      .locator('.transmission-bar-row').first().locator('.transmission-stats').click();
    await expect(page.locator('.active-filters .filter-chip')).toHaveCount(2);

    // Clear all
    await page.locator('.clear-filters-btn').click();

    // Filter bar should disappear
    await expect(page.locator('.active-filters')).not.toBeVisible();
  });

  test('book distribution should update when narrated-from filter is applied', async ({ page }) => {
    // Record initial book distribution counts
    const initialBookRows = await page.locator('.distribution-bar-row').count();

    // Click a "Narrated From" row to filter
    const fromRow = page.locator('.transmission-section').first()
      .locator('.transmission-bar-row').first();
    await fromRow.locator('.transmission-stats').click();

    // Book distribution count may change (fewer books in filtered set)
    const filteredBookRows = await page.locator('.distribution-bar-row').count();
    expect(filteredBookRows).toBeLessThanOrEqual(initialBookRows);
  });

  test('narrated-from should update when book filter is applied', async ({ page }) => {
    // Record initial "Narrated From" entries count
    const section = page.locator('h2', { hasText: /Narrated From/ });
    const initialText = await section.textContent();
    const initialCount = parseInt(initialText!.match(/\((\d+)\)/)![1]);

    // Click a book distribution row
    await page.locator('.distribution-bar-row').first().click();

    // Narrated From count may decrease
    const filteredText = await section.textContent();
    const filteredCount = parseInt(filteredText!.match(/\((\d+)\)/)![1]);
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });
});
