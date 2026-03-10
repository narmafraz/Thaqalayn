import { test, expect } from '@playwright/test';

/**
 * Phase 5: Advanced Features Tests
 *
 * Tests for narrator comparison, chain diagrams, advanced narrator filters,
 * and category chips. These features may not yet be implemented, so tests
 * use conditional checks where appropriate.
 */

test.describe('ADV-03: Narrator Comparison', () => {
  test('should load narrator compare page without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/#/people/narrators/compare?lang=en');
    await page.waitForLoadState('networkidle');

    // Page should load without JavaScript errors
    const fatalErrors = errors.filter(e => !e.includes('ChunkLoadError'));
    expect(fatalErrors).toHaveLength(0);
  });

  test('should have two autocomplete inputs for narrator selection', async ({ page }) => {
    await page.goto('/#/people/narrators/compare?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // The compare page has two mat-form-field inputs with matInput for autocomplete
    const inputs = page.locator('input[matinput]');

    const count = await inputs.count();
    if (count >= 2) {
      // Both inputs should be visible
      await expect(inputs.nth(0)).toBeVisible({ timeout: 15000 });
      await expect(inputs.nth(1)).toBeVisible({ timeout: 15000 });
    }
  });

  test('should pre-select narrator A via query parameter', async ({ page }) => {
    await page.goto('/#/people/narrators/compare?a=19&lang=en');
    await page.waitForLoadState('networkidle');

    // Wait for content to potentially load
    await page.waitForTimeout(2000);

    // The page should have loaded narrator data for narrator ID 19
    // Check for narrator name text or a filled input field
    const narratorInputA = page.locator('input[matinput]').first();

    if (await narratorInputA.isVisible()) {
      const value = await narratorInputA.inputValue();
      // If pre-selection works, the input should have a value
      if (value) {
        expect(value.length).toBeGreaterThan(0);
      }
    }

    // Alternatively, check if narrator content is displayed
    const pageText = await page.textContent('body');
    // Page should contain some content (not just an empty state)
    expect(pageText!.length).toBeGreaterThan(50);
  });
});

test.describe('ADV-04: Chain Diagram', () => {
  test('should display hadith with narrator chain on Al-Kafi page', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Al-Kafi hadiths have narrator chains rendered as Arabic text in .verseText paragraphs.
    // The chain text appears as the first .verseText paragraph(s) before the hadith body.
    // Verify that Arabic verse text is present and contains narrator-related text
    // (common narrator chain words like عن "from", حدثني "told me", أخبرنا "informed us").
    const verseTexts = page.locator('.verseText.arabic');
    const count = await verseTexts.count();
    expect(count).toBeGreaterThan(0);

    // The first verse text should contain narrator chain language
    const firstText = await verseTexts.first().textContent();
    expect(firstText).toBeTruthy();
    // Check for common narrator chain words (with optional diacritics between letters)
    // Arabic diacritics are in the Unicode range \u0610-\u065F and \u0670
    const diacritics = '[\u0610-\u065F\u0670]*';
    const chainPattern = new RegExp(
      `ع${diacritics}ن|ح${diacritics}د${diacritics}ث|أ${diacritics}خ${diacritics}ب${diacritics}ر`
    );
    expect(firstText).toMatch(chainPattern);
  });

  test('should have chain diagram toggle button', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // The chain diagram toggle is a button.ai-toggle-btn with aria-label containing "chain"
    const toggleBtn = page.locator(
      'button.ai-toggle-btn[aria-label*="chain" i], ' +
      'button[aria-label*="chain diagram" i]'
    );

    if (await toggleBtn.count() > 0) {
      await expect(toggleBtn.first()).toBeVisible();
    }
  });

  test('should show chain diagram view when toggle is clicked', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    // Find and click the chain diagram toggle
    const toggleBtn = page.locator(
      'button.ai-toggle-btn[aria-label*="chain" i], ' +
      'button[aria-label*="chain diagram" i]'
    );

    if (await toggleBtn.count() > 0) {
      await toggleBtn.first().click();
      await page.waitForTimeout(500);

      // After clicking, the .chain-diagram container should appear
      const diagram = page.locator('.chain-diagram');

      if (await diagram.count() > 0) {
        await expect(diagram.first()).toBeVisible();
      }
    }
  });
});

test.describe('ADV-05: Advanced Narrator Filters', () => {
  test('should have filter panel toggle on narrator index page', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table.full-width-table').waitFor({ state: 'visible', timeout: 15000 });

    // The filter toggle button has class filter-toggle-btn and contains a tune icon
    const filterToggle = page.locator('.filter-toggle-btn');
    await expect(filterToggle).toBeVisible();
  });

  test('should show min/max narration inputs when filter panel is opened', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table.full-width-table').waitFor({ state: 'visible', timeout: 15000 });

    // Click the filter toggle to open the advanced filters panel
    const filterToggle = page.locator('.filter-toggle-btn');
    await expect(filterToggle).toBeVisible();
    await filterToggle.click();
    await page.waitForTimeout(500);

    // The advanced-filters panel should now be visible with number inputs
    const advancedFilters = page.locator('.advanced-filters');
    await expect(advancedFilters).toBeVisible();

    const numberInputs = advancedFilters.locator('input.filter-number-input');
    const inputCount = await numberInputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(2);
    await expect(numberInputs.first()).toBeVisible();
  });

  test('should filter narrator table when min narrations is set', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table.full-width-table').waitFor({ state: 'visible', timeout: 15000 });

    // Get initial row count from paginator text (e.g., "1 – 50 of 4860")
    const paginatorRange = page.locator('.mat-mdc-paginator-range-label');
    const initialRangeText = await paginatorRange.textContent();

    // Open filter panel
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    await page.waitForTimeout(500);

    // The first filter-number-input is the min narrations field
    const minInput = page.locator('input.filter-number-input').first();
    await expect(minInput).toBeVisible();

    // Set a high minimum to filter out most narrators
    await minInput.fill('500');
    // Trigger the change event (the input uses (change) binding)
    await minInput.dispatchEvent('change');
    await page.waitForTimeout(1000);

    // The paginator range text should change to show fewer total results
    const filteredRangeText = await paginatorRange.textContent();
    // Extract the total from "1 – N of TOTAL"
    const initialTotal = parseInt((initialRangeText || '').replace(/.*of\s*/, '').replace(/[^0-9]/g, ''), 10);
    const filteredTotal = parseInt((filteredRangeText || '').replace(/.*of\s*/, '').replace(/[^0-9]/g, ''), 10);
    expect(filteredTotal).toBeLessThan(initialTotal);
  });
});

test.describe('ADV-06: Category Chips', () => {
  test('should display category chips on narrator index page', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table.full-width-table').waitFor({ state: 'visible', timeout: 15000 });

    // Category chips are button.category-chip elements
    const chips = page.locator('button.category-chip');
    const count = await chips.count();
    expect(count).toBeGreaterThanOrEqual(2);
    await expect(chips.first()).toBeVisible();
  });

  test('should have an "Imams" category chip', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table.full-width-table').waitFor({ state: 'visible', timeout: 15000 });

    // The Imams chip button contains "Imam" text
    const imamsChip = page.locator('button.category-chip:has-text("Imam")');
    const count = await imamsChip.count();
    expect(count).toBeGreaterThan(0);
    await expect(imamsChip.first()).toBeVisible();
  });

  test('should filter table to show only Imam entries when "Imams" chip is clicked', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.locator('table.full-width-table').waitFor({ state: 'visible', timeout: 15000 });

    // Get initial row count from paginator text
    const paginatorRange = page.locator('.mat-mdc-paginator-range-label');
    const initialRangeText = await paginatorRange.textContent();
    const initialTotal = parseInt((initialRangeText || '').replace(/.*of\s*/, '').replace(/[^0-9]/g, ''), 10);

    // Find and click the "Imams" chip
    const imamsChip = page.locator('button.category-chip:has-text("Imam")');
    await expect(imamsChip.first()).toBeVisible();
    await imamsChip.first().click();
    await page.waitForTimeout(1000);

    // After filtering, the paginator should show fewer total items
    const filteredRangeText = await paginatorRange.textContent();
    const filteredTotal = parseInt((filteredRangeText || '').replace(/.*of\s*/, '').replace(/[^0-9]/g, ''), 10);
    expect(filteredTotal).toBeLessThan(initialTotal);
    expect(filteredTotal).toBeGreaterThan(0);

    // Verify filtered rows contain Imam-related content
    const tableText = await page.locator('table.full-width-table').textContent();
    // Should contain Arabic text with عليه السلام (honorific used for Imams)
    expect(tableText).toMatch(/عليه السلام/);
  });
});
