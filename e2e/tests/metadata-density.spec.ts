import { test, expect } from '@playwright/test';

test.describe('Verse Card Metadata Density', () => {
  test('should show primary actions (detail link, bookmark) inline', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    await expect(firstCard).toBeVisible();

    // Detail link and bookmark should be visible
    const detailLink = firstCard.locator('.verse-detail-link');
    await expect(detailLink).toBeVisible();

    const bookmarkBtn = firstCard.locator('.bookmark-icon-btn');
    await expect(bookmarkBtn).toBeVisible();
  });

  test('should show overflow menu with secondary actions', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();
    const moreBtn = firstCard.locator('.more-actions-btn');
    await expect(moreBtn).toBeVisible();

    // Click the more button to open menu
    await moreBtn.click();

    // Menu should appear with items
    const menu = page.locator('.mat-mdc-menu-panel');
    await expect(menu).toBeVisible();

    // Should have menu items for link, note, share image
    const menuItems = menu.locator('button[mat-menu-item], a[mat-menu-item]');
    const count = await menuItems.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should hide secondary metadata by default and show on expand', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    const firstCard = page.locator('mat-card').first();

    // Secondary metadata should be hidden by default
    const secondaryMetadata = firstCard.locator('.secondary-metadata');
    await expect(secondaryMetadata).not.toBeVisible();

    // Click the expand button
    const expandBtn = firstCard.locator('.metadata-toggle-btn');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    // Secondary metadata should now be visible
    await expect(secondaryMetadata).toBeVisible();

    // Should show reference info
    await expect(secondaryMetadata).toContainText('Reference');
  });

  test('should show grading badges inline on hadith cards', async ({ page }) => {
    // Al-Kafi has graded hadiths
    await page.goto('/#/books/al-kafi:1:2:1?lang=en');
    await page.waitForLoadState('networkidle');

    const gradingChips = page.locator('.grading-chip');
    const count = await gradingChips.count();

    // If there are grading chips, they should be visible without expanding
    if (count > 0) {
      await expect(gradingChips.first()).toBeVisible();
    }
  });
});
