import { test, expect } from '@playwright/test';

test.describe('i18n Key Leak Prevention (FIX-06)', () => {
  const RAW_KEY_PATTERN = /\b(annotation|bookmark|pwa|nav|search|settings|footer|translation)\.\w+/;

  test('should not show raw i18n keys for Arabic language', async ({ page }) => {
    await page.goto('/books?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(RAW_KEY_PATTERN);
  });

  test('should not show raw i18n keys for Farsi language', async ({ page }) => {
    await page.goto('/books?lang=fa');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(RAW_KEY_PATTERN);
  });

  test('should not show raw i18n keys for French language', async ({ page }) => {
    await page.goto('/books?lang=fr');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(RAW_KEY_PATTERN);
  });

  test('should not show raw i18n keys on chapter content page for non-English', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(RAW_KEY_PATTERN);
  });
});

test.describe('Fresh Session Language (FIX-02)', () => {
  test('should apply ?lang=fa on fresh session', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/books?lang=fa');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify RTL direction is set (Farsi is RTL)
    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');
  });

  test('should apply ?lang=ar on fresh session', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/books?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const dir = await page.locator('html').getAttribute('dir');
    expect(dir).toBe('rtl');

    // Footer should contain Arabic text
    const footer = page.locator('#footer');
    await expect(footer).toContainText('\u062D\u0648\u0644');  // "About" in Arabic
  });
});

test.describe('Undefined References Prevention (FIX-03)', () => {
  test('should not show "undefined undefined" in references for Farsi', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=fa');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('undefined undefined');
  });

  test('should not show "undefined undefined" in references for Arabic', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=ar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('undefined undefined');
  });

  test('should not show "undefined" in breadcrumbs for non-English language', async ({ page }) => {
    await page.goto('/books/al-kafi:1:1:1?lang=fa');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const breadcrumbText = await page.locator('.crumb-holder').textContent();
    expect(breadcrumbText).not.toContain('undefined');
  });
});
