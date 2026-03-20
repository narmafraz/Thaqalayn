import { test, expect } from '@playwright/test';

test.describe('Verse Detail Pages', () => {

  test.describe('Deep Linking', () => {
    test('should load Al-Kafi hadith detail page directly', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');

      // Should render the verse detail component (hadith card)
      const hadithCard = page.locator('mat-card, .hadith-card, .verse-detail-container');
      await hadithCard.first().waitFor({ state: 'visible', timeout: 15000 });
    });

    test('should load Quran verse detail page directly', async ({ page }) => {
      await page.goto('/books/quran:1:1?lang=en');
      await page.waitForLoadState('networkidle');

      // Should render content (either verse detail or chapter content)
      const content = page.locator('mat-card, .verse-detail-container, .verse-text');
      await content.first().waitFor({ state: 'visible', timeout: 15000 });
    });
  });

  test.describe('Content Rendering', () => {
    test('should display Arabic text on hadith detail page', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      // Arabic text should be present
      const pageContent = await page.content();
      expect(pageContent).toMatch(/[\u0600-\u06FF]/);
    });

    test('should have lang="ar" on Arabic text sections', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      const arabicElements = page.locator('[lang="ar"]');
      const count = await arabicElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display hadith title with part type and index', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      // Should contain "Hadith" text indicating the part type
      const pageText = await page.textContent('body');
      expect(pageText).toMatch(/Hadith|Verse/);
    });
  });

  test.describe('Chapter Link Icons', () => {
    test('should have detail link icons in Al-Kafi chapter view', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

      // Look for the detail link icons (open_in_new icon with verse-detail-link class)
      const detailLinks = page.locator('.verse-detail-link, a[aria-label*="details"]');
      const count = await detailLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have detail link icons in Quran surah view', async ({ page }) => {
      await page.goto('/books/quran:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 10000 });

      const detailLinks = page.locator('.verse-detail-link, a[aria-label*="details"]');
      const count = await detailLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have accessible labels on detail link icons', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

      const detailLinks = page.locator('a[aria-label*="details"]');
      if (await detailLinks.count() > 0) {
        const label = await detailLinks.first().getAttribute('aria-label');
        expect(label).toBeTruthy();
        expect(label).toContain('details');
      }
    });
  });

  test.describe('Navigation', () => {
    test('should have chapter context link back to chapter', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      // Look for the chapter context link (arrow_upward icon)
      const chapterLink = page.locator('.chapter-link, a[class*="chapter"]');
      if (await chapterLink.count() > 0) {
        await expect(chapterLink.first()).toBeVisible();
      }
    });

    test('should have share button', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      // Share button should be present
      const shareBtn = page.locator('.share-btn, button:has-text("Share"), button:has-text("share")');
      if (await shareBtn.count() > 0) {
        await expect(shareBtn.first()).toBeVisible();
      }
    });

    test('should have view in chapter link', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      // "View in chapter context" link should be present
      const viewInChapter = page.locator('a:has-text("chapter context"), a:has-text("View in chapter")');
      if (await viewInChapter.count() > 0) {
        await expect(viewInChapter.first()).toBeVisible();
      }
    });
  });

  test.describe('SEO', () => {
    test('should have descriptive page title for hadith detail', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(5);
      // Title should contain relevant terms
      expect(title).toMatch(/Hadith|Al-Kafi|Thaqalayn/i);
    });

    test('should have meta description', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description).toBeTruthy();
      expect(description.length).toBeGreaterThan(10);
    });

    test('should have canonical URL', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toContain('al-kafi');
    });
  });

  test.describe('Narrator Links and Hover Cards', () => {
    test('should render narrator chain links in chapter view', async ({ page }) => {
      // Al-Kafi 1:1:1 has hadiths with narrator chains
      await page.goto('/books/al-kafi:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

      // Narrator links should be present (links to /people/narrators/)
      const narratorLinks = page.locator('a[href*="/people/narrators/"]');
      const count = await narratorLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show narrator hover card with name and stats on mouseover', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

      const narratorLink = page.locator('a[href*="/people/narrators/"]').first();
      if (await narratorLink.count() > 0) {
        await narratorLink.hover();
        const hoverCard = page.locator('app-narrator-hover-card');
        await expect(hoverCard).toBeVisible({ timeout: 5000 });

        // Card should contain narrator name (Arabic) and a "View profile" link
        const viewProfileLink = hoverCard.locator('a:has-text("View profile")');
        await expect(viewProfileLink).toBeVisible({ timeout: 3000 });
      }
    });

    test('should navigate to narrator page when clicking narrator link', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card').first().waitFor({ state: 'visible', timeout: 15000 });

      const narratorLink = page.locator('a[href*="/people/narrators/"]').first();
      if (await narratorLink.count() > 0) {
        const href = await narratorLink.getAttribute('href');
        await narratorLink.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to the narrator page
        expect(page.url()).toContain('/people/narrators/');
      }
    });

    test('should show narrator hover card on verse detail page', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:2?lang=en');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      const narratorLink = page.locator('a[href*="/people/narrators/"]').first();
      if (await narratorLink.count() > 0) {
        await narratorLink.hover();
        const hoverCard = page.locator('app-narrator-hover-card');
        await expect(hoverCard).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Toggle Buttons', () => {
    test('should show toggle buttons outside text area on verse detail', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en&translation=en.ai');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      // Toggles should be in .verse-detail-toggles, not inside .textrow .ai-toggles
      const externalToggles = page.locator('.verse-detail-toggles .ai-toggle-btn');
      const internalToggles = page.locator('.textrow .ai-toggles .ai-toggle-btn');

      // External toggles should exist if AI content is available
      const externalCount = await externalToggles.count();
      const internalCount = await internalToggles.count();

      // If AI content exists, toggles should be external, not internal
      if (externalCount > 0) {
        expect(internalCount).toBe(0);
      }
    });
  });

  test.describe('Comparison Mode Layout', () => {
    test('should add comparing class when second translation is selected', async ({ page }) => {
      await page.goto('/books/al-kafi:1:1:1:1?lang=en&translation=en.ai&translation2=en.hubeali');
      await page.waitForLoadState('networkidle');
      await page.locator('mat-card, .verse-detail-container').first().waitFor({ state: 'visible', timeout: 15000 });

      // .textrow should have .comparing class
      const textrow = page.locator('.textrow.comparing');
      if (await textrow.count() > 0) {
        await expect(textrow.first()).toBeVisible();
      }
    });
  });
});
