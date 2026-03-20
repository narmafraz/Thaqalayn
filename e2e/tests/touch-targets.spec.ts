import { test, expect } from '@playwright/test';

test.describe('Touch Targets', () => {
  test('verse action buttons should have at least 44px touch targets', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/books/quran:1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check bookmark button
    const bookmarkBtn = page.locator('button.bookmark-icon-btn').first();
    if (await bookmarkBtn.isVisible()) {
      const box = await bookmarkBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    // Check note button
    const noteBtn = page.locator('button.note-icon-btn').first();
    if (await noteBtn.isVisible()) {
      const box = await noteBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    // Check share image button
    const shareBtn = page.locator('button.share-image-icon-btn').first();
    if (await shareBtn.isVisible()) {
      const box = await shareBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    // Check verse detail link
    const detailLink = page.locator('.verse-detail-link').first();
    if (await detailLink.isVisible()) {
      const box = await detailLink.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    // Check audio button (Quran-specific)
    const audioBtn = page.locator('button.audio-icon-btn').first();
    if (await audioBtn.isVisible()) {
      const box = await audioBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    // Check tafsir button (Quran-specific)
    const tafsirBtn = page.locator('button.tafsir-icon-btn').first();
    if (await tafsirBtn.isVisible()) {
      const box = await tafsirBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('verse action buttons should have 44px touch targets on hadith page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/books/al-kafi:1:1:1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check bookmark button on hadith page
    const bookmarkBtn = page.locator('button.bookmark-icon-btn').first();
    if (await bookmarkBtn.isVisible()) {
      const box = await bookmarkBtn.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
