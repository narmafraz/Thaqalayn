import { test, expect } from '@playwright/test';

test.describe('No Console Errors', () => {
  test('homepage should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/#/books?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('Quran page should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/#/books/quran:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('Al-Kafi page should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/#/books/al-kafi:1:1:1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('narrator list page should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/#/people/narrators/index?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('narrator detail page should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/#/people/narrators/1?lang=en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });
});
