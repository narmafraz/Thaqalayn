import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end flows for reading-engagement features. Each test starts
 * with fresh browser storage (Playwright default) so Dexie state is
 * clean.
 *
 * These exercise the click-path: open a chapter → mark verses →
 * navigate to /bookmarks → click the relevant tab → verify the
 * chip/badge/history updated.
 */

async function selectBookmarksTab(page: Page, label: RegExp): Promise<void> {
  await page.getByRole('tab', { name: label }).click();
  await page.waitForTimeout(150);
}

test.describe('Reading-engagement flows', () => {
  test('manual read-mark on a verse shows ✓ icon and persists across reload', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    // Give lazy verse-detail loads time to settle.
    await page.waitForTimeout(2500);

    const readBtn = page.locator('button.read-icon-btn').first();
    await expect(readBtn).toBeVisible();
    // Start unmarked
    await expect(readBtn.locator('mat-icon')).toHaveText(/radio_button_unchecked/);

    await readBtn.click();
    // Allow the Dexie write to complete + view to update
    await page.waitForTimeout(400);
    await expect(readBtn.locator('mat-icon')).toHaveText(/check_circle/);

    // Reload to confirm persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    const readBtnAfter = page.locator('button.read-icon-btn').first();
    await expect(readBtnAfter.locator('mat-icon')).toHaveText(/check_circle/);
  });

  test('marking verses surfaces the streak chip and total chip on the Progress tab', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // Mark 3 verses
    const readBtns = page.locator('button.read-icon-btn');
    const count = Math.min(3, await readBtns.count());
    for (let i = 0; i < count; i++) {
      await readBtns.nth(i).click();
      await page.waitForTimeout(150);
    }

    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /progress/i);

    // Stats strip should now be visible with the 🔥 streak chip and 📖 total chip
    await expect(page.locator('.reading-stats-strip')).toBeVisible();
    await expect(page.locator('.streak-chip')).toBeVisible();
    await expect(page.locator('.total-chip')).toBeVisible();
    // Total value should be at least 3 (we marked exactly 3)
    const totalValue = page.locator('.total-chip .stat-chip-value');
    await expect(totalValue).toBeVisible();
    const text = (await totalValue.textContent())?.trim() ?? '0';
    expect(parseInt(text, 10)).toBeGreaterThanOrEqual(3);
  });

  test('reading-history section appears on the Progress tab after marking verses', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    await page.locator('button.read-icon-btn').first().click();
    await page.waitForTimeout(300);

    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /progress/i);

    await expect(page.getByRole('heading', { name: /reading history/i })).toBeVisible();
    // At least one day row should be rendered
    await expect(page.locator('.reading-history-day').first()).toBeVisible();
  });

  test('enrolling in the Quran-30-days plan creates a homepage ribbon', async ({ page }) => {
    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /plans/i);

    // Click "Start" on the Quran-in-30-days catalogue entry
    const startBtn = page.locator('.plan-catalogue-row').filter({ hasText: '30 Days' }).getByRole('button', { name: /start/i });
    await startBtn.click();
    await page.waitForTimeout(500);

    // After enrollment, the same row should show "Already started"
    const enrolledTag = page.getByText(/already started/i);
    await expect(enrolledTag).toBeVisible();

    // Navigate to homepage — ribbon should render at the top
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page.locator('.plan-ribbon')).toBeVisible();
    await expect(page.locator('.plan-ribbon-title')).toContainText(/30 Days/);
    await expect(page.locator('.plan-ribbon-title')).toContainText(/Day 1\s*\/\s*30/);
  });

  test('resetting a section wipes its read marks', async ({ page }) => {
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    // Mark a verse
    await page.locator('button.read-icon-btn').first().click();
    await page.waitForTimeout(300);

    // Go up one level to /books/quran — book-level chapter list with strip
    await page.goto('/books/quran?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);

    // Reset button should be in the book-progress-strip
    const resetBtn = page.locator('.book-progress-reset');
    if (await resetBtn.isVisible()) {
      // Accept the confirm() dialog
      page.once('dialog', d => d.accept());
      await resetBtn.click();
      await page.waitForTimeout(500);

      // Re-open the chapter — the verse should no longer be marked
      await page.goto('/books/quran:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2500);
      const readBtn = page.locator('button.read-icon-btn').first();
      await expect(readBtn.locator('mat-icon')).toHaveText(/radio_button_unchecked/);
    }
  });
});
