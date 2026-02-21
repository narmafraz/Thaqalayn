import { test, expect } from '@playwright/test';

test.describe('Narrator Pages', () => {
  test('should load the narrator list page', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    // Should show a table of narrators
    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();

    // Should have narrator rows
    const rows = table.locator('tr[mat-row]');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('should display narrator names in Arabic', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table.full-width-table');
    await expect(table).toBeVisible();

    // Arabic text should be present
    const arabicCells = table.locator('.arabic');
    await expect(arabicCells.first()).toBeVisible();
    const text = await arabicCells.first().textContent();
    expect(text).toMatch(/[\u0600-\u06FF]/);
  });

  test('should have a filter input for searching narrators', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const filterInput = page.locator('input[placeholder="Filter"]');
    await expect(filterInput).toBeVisible();
  });

  test('should have pagination controls', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');

    const paginator = page.locator('mat-paginator');
    await expect(paginator).toBeVisible();
  });

  test('should navigate to individual narrator page', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    // Narrator page should display with Arabic name
    const title = page.locator('h1.arabic');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text).toMatch(/[\u0600-\u06FF]/);
  });

  test('should show narrated ahadith section on narrator page', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    const section = page.locator('h2', { hasText: 'Narrated Ahadith' });
    await expect(section).toBeVisible();
  });

  test('should show co-narrators section on narrator page', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    const section = page.locator('h2', { hasText: 'Co-Narrators' });
    await expect(section).toBeVisible();
  });

  test('should show breadcrumbs on narrator page', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    const crumbHolder = page.locator('.crumb-holder');
    await expect(crumbHolder).toContainText('Home');
    await expect(crumbHolder).toContainText('Narrators');
  });
});
