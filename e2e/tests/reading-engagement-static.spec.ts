import { test, expect } from '@playwright/test';

/**
 * Static surface tests for the reading-engagement feature set.
 * These don't require any user state — they verify the UI elements
 * render when the user is fresh / unauthenticated.
 *
 * Stateful flows (mark verses → badge earned, enroll in a plan →
 * ribbon shows) live in reading-engagement-flow.spec.ts so a flaky
 * Dexie / timing issue there doesn't take out the static checks.
 */
/** Helper: click a tab on the /bookmarks page. The tab nav uses role="tab" + aria-selected. */
async function selectBookmarksTab(page: import('@playwright/test').Page, label: RegExp): Promise<void> {
  await page.getByRole('tab', { name: label }).click();
  // Tab switch is synchronous in the template but Angular needs a beat for the
  // *ngIf-switched panel to render.
  await page.waitForTimeout(150);
}

test.describe('Reading-engagement static surfaces', () => {
  test('/bookmarks tab nav exposes the 5 expected tabs', async ({ page }) => {
    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');

    for (const label of [/progress/i, /plans/i, /badges/i, /saves/i, /settings/i]) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('Progress tab shows the goal config panel', async ({ page }) => {
    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /progress/i);

    // Goal config panel — visible regardless of state, prompts user to set a goal
    await expect(page.getByRole('heading', { name: /daily goal/i })).toBeVisible();
  });

  test('Plans tab shows the Quran-in-30-days catalogue entry', async ({ page }) => {
    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /plans/i);

    await expect(page.getByRole('heading', { name: /reading plans/i })).toBeVisible();
    await expect(page.getByText('The Quran in 30 Days')).toBeVisible();
    // "30 days · 6236 verses" stats line
    await expect(page.getByText(/30\s+days.+6236\s+verses/i)).toBeVisible();
  });

  test('Badges tab renders the catalogue with count chip + locked tiles', async ({ page }) => {
    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /badges/i);

    await expect(page.locator('app-badge-shelf .badge-shelf')).toBeVisible();
    // Count chip — `N / 41` (or whatever the catalogue size is)
    await expect(page.locator('.badge-count')).toBeVisible();
    await expect(page.locator('.badge-count')).toContainText(' / ');
    // At least one locked badge tile should be visible
    const lockedTiles = page.locator('.badge-card:not(.badge-earned)');
    await expect(lockedTiles.first()).toBeVisible();
  });

  test('Saves tab shows the empty bookmarks state', async ({ page }) => {
    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /saves/i);

    await expect(page.getByRole('heading', { name: /saved bookmarks/i })).toBeVisible();
  });

  test('badge catalogue shows all 5 category groups', async ({ page }) => {
    await page.goto('/bookmarks?lang=en');
    await page.waitForLoadState('networkidle');
    await selectBookmarksTab(page, /badges/i);

    const groups = page.locator('.badge-group');
    // Categories: milestone, streak, book, breadth, habit
    await expect(groups).toHaveCount(5);

    // Group titles, in render order
    const titles = groups.locator('.badge-group-title');
    const expected = ['MILESTONES', 'STREAKS', 'BOOK COMPLETION', 'BREADTH', 'READING HABITS'];
    for (let i = 0; i < expected.length; i++) {
      await expect(titles.nth(i)).toContainText(expected[i], { ignoreCase: true });
    }
  });

  test('verse-actions on a chapter page exposes the read-toggle button', async ({ page }) => {
    // Quran al-Fatiha (loads fast, only 7 verses)
    await page.goto('/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    // Allow lazy verse-detail loads to settle
    await page.waitForTimeout(2000);

    // The verse-actions footer on each verse card now has a read-toggle button
    // with `reading.markRead` aria-label. Match the first occurrence.
    const readButtons = page.locator('button.read-icon-btn');
    await expect(readButtons.first()).toBeVisible({ timeout: 10000 });
    // The icon should be the unmarked (outline) variant initially
    await expect(readButtons.first().locator('mat-icon')).toHaveText(/radio_button_unchecked/);
  });

  test('reading-sheet exposes the new reading-progress preferences', async ({ page }) => {
    await page.goto('/books?lang=en');
    await page.waitForLoadState('networkidle');

    // Open the settings sheet
    const trigger = page.locator('button.reading-sheet-trigger, button.mobile-reading-sheet-btn').first();
    await trigger.click();
    await page.waitForTimeout(500);

    // The Reading-progress section + mute toggle + banner toggle should all be present
    await expect(page.getByRole('heading', { name: /reading progress/i })).toBeVisible();
    await expect(page.getByLabel(/fade out verses i've read/i)).toBeVisible();
    await expect(page.getByLabel(/show daily reminder banner/i)).toBeVisible();
  });
});
