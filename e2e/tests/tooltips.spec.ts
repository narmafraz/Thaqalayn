import { test, expect, Page, Locator } from '@playwright/test';

// matTooltip is verified behaviourally: hover the trigger and assert the
// overlay (.mat-mdc-tooltip) appears with text. (Angular 19+ no longer emits
// the `ng-reflect-message` debug attribute these tests previously relied on.)
async function expectTooltipOnHover(page: Page, trigger: Locator) {
  await trigger.waitFor({ state: 'visible', timeout: 10000 });
  await trigger.hover();
  const tooltip = page.locator('.mat-mdc-tooltip').first();
  await expect(tooltip).toBeVisible({ timeout: 2000 });
  const text = (await tooltip.textContent())?.trim() ?? '';
  expect(text.length).toBeGreaterThan(0);
  // Move away so the overlay dismisses before the next assertion.
  await page.mouse.move(0, 0);
  await expect(page.locator('.mat-mdc-tooltip')).toHaveCount(0, { timeout: 2000 });
}

test.describe('Tooltips on icon buttons', () => {
  test('header font controls have tooltips', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    await expectTooltipOnHover(page, page.locator('.font-controls button').first());
    await expectTooltipOnHover(page, page.locator('.theme-toggle'));
    await expectTooltipOnHover(page, page.locator('.shortcuts-btn'));
  });

  test('chapter content icons have tooltips', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    // First verse card lazy-loads near the top of the chapter.
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

    await expectTooltipOnHover(page, page.locator('.verse-detail-link').first());
    await expectTooltipOnHover(page, page.locator('.bookmark-icon-btn').first());
    await expectTooltipOnHover(page, page.locator('.action-icon-btn').first());
  });

  test('verse detail page has back-to-chapter tooltip', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // The tooltip lives on the back-arrow icon inside the chapter link.
    await expectTooltipOnHover(page, page.locator('.chapter-link mat-icon').first());
  });

  test('search bar icons have tooltips', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    await expectTooltipOnHover(page, page.locator('.search-tips-btn'));
  });

  test('book tree clear search has tooltip', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Type in the book tree search to make the clear button appear.
    const searchInput = page.locator('.book-tree-container input').first();
    await searchInput.fill('quran');
    await page.waitForTimeout(500);

    await expectTooltipOnHover(page, page.locator('.book-tree-container button[mat-icon-button]').first());
  });
});
