import { test, expect } from '@playwright/test';

test.describe('Tooltips on icon buttons', () => {
  test('header font controls have tooltips', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Font A- button
    const decreaseBtn = page.locator('.font-controls button').first();
    await expect(decreaseBtn).toHaveAttribute('ng-reflect-message', /./);

    // Dark mode toggle
    const themeBtn = page.locator('.theme-toggle');
    await expect(themeBtn).toHaveAttribute('ng-reflect-message', /./);

    // Keyboard shortcuts button
    const shortcutsBtn = page.locator('.shortcuts-btn');
    await expect(shortcutsBtn).toHaveAttribute('ng-reflect-message', /./);
  });

  test('chapter content icons have tooltips', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // Verse detail link (open_in_new icon)
    const detailLink = page.locator('.verse-detail-link').first();
    await expect(detailLink).toHaveAttribute('ng-reflect-message', /./);

    // Bookmark button
    const bookmarkBtn = page.locator('.bookmark-icon-btn').first();
    await expect(bookmarkBtn).toHaveAttribute('ng-reflect-message', /./);

    // More actions button
    const moreBtn = page.locator('.more-actions-btn').first();
    await expect(moreBtn).toHaveAttribute('ng-reflect-message', /./);
  });

  test('verse detail page has back-to-chapter tooltip', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    // The back arrow icon in chapter-context
    const backIcon = page.locator('.chapter-link mat-icon').first();
    await expect(backIcon).toHaveAttribute('ng-reflect-message', /./);
  });

  test('search bar icons have tooltips', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Search tips button (visible when search is empty)
    const tipsBtn = page.locator('.search-tips-btn');
    await expect(tipsBtn).toHaveAttribute('ng-reflect-message', /./);
  });

  test('book tree clear search has tooltip', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Type in the book tree search to make clear button appear
    const searchInput = page.locator('.book-tree-container input[matInput]');
    await searchInput.fill('quran');
    await page.waitForTimeout(500);

    const clearBtn = page.locator('.book-tree-container button[mat-icon-button]');
    await expect(clearBtn).toHaveAttribute('ng-reflect-message', /./);
  });
});
