import { test, expect } from '@playwright/test';

test.describe('SEO - Legacy Hash URL Redirects', () => {
  test('should redirect old hash URL /#/books/quran:1 to /books/quran:1', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');

    // URL should no longer contain the hash
    const url = page.url();
    expect(url).not.toContain('#/');
    expect(url).toContain('/books/quran:1');

    // Content should still load correctly
    const titles = page.locator('.description.mat-elevation-z2');
    await expect(titles).toBeVisible();
    await expect(titles).toContainText('The Opening');
  });

  test('should redirect old hash URL /#/books/al-kafi:1:1:1 to /books/al-kafi:1:1:1', async ({ page }) => {
    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).not.toContain('#/');
    expect(url).toContain('/books/al-kafi:1:1:1');
  });

  test('should redirect old hash URL /#/people/narrators/1 to /people/narrators/1', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    expect(url).not.toContain('#/');
    expect(url).toContain('/people/narrators/1');
  });
});

test.describe('SEO - robots.txt', () => {
  test('should serve robots.txt at the root', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    const body = await response!.text();
    expect(body).toContain('User-agent');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap:');
  });
});

test.describe('SEO - Meta Tags', () => {
  test('should have meta description on homepage', async ({ page }) => {
    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(10);
  });

  test('should have Open Graph tags on Quran page', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDescription = await page.locator('meta[property="og:description"]').getAttribute('content');
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');

    expect(ogTitle).toBeTruthy();
    expect(ogDescription).toBeTruthy();
    expect(ogUrl).toBeTruthy();
    expect(ogUrl).toContain('/books/quran:1');
  });

  test('should have Open Graph tags on narrator page', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');

    expect(ogTitle).toBeTruthy();
    expect(ogUrl).toBeTruthy();
    expect(ogUrl).toContain('/people/narrators/1');
  });

  test('should have canonical URL on pages', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(canonical).toContain('/books/quran:1');
  });
});

test.describe('SEO - JSON-LD Structured Data', () => {
  test('should have JSON-LD on homepage', async ({ page }) => {
    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLdText).toBeTruthy();

    const jsonLd = JSON.parse(jsonLdText!);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('WebSite');
    expect(jsonLd.name).toBeTruthy();
  });

  test('should have JSON-LD with Book type on Quran page', async ({ page }) => {
    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLdText).toBeTruthy();

    const jsonLd = JSON.parse(jsonLdText!);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Book');
    expect(jsonLd.url).toContain('/books/quran:1');
  });

  test('should have JSON-LD with Person type on narrator page', async ({ page }) => {
    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLdText).toBeTruthy();

    const jsonLd = JSON.parse(jsonLdText!);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('Person');
    expect(jsonLd.url).toContain('/people/narrators/1');
  });

  test('should have JSON-LD with CollectionPage type on narrator list', async ({ page }) => {
    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLdText).toBeTruthy();

    const jsonLd = JSON.parse(jsonLdText!);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('CollectionPage');
  });
});
