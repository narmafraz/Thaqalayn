import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 30000,
  retries: 1,
  use: {
    // Default to the local dev server: the suite deep-links directly to
    // verse/chapter/narrator URLs, which the dev server resolves via its
    // index.html SPA fallback. Requires the local stack running:
    //   ThaqalaynData: `py serve.py` (:8888)   +   Thaqalayn: `npm start` (:4200)
    // Target production explicitly with: BASE_URL=https://thaqalayn.netlify.app
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: [['html', { open: 'never' }], ['list']],
});
