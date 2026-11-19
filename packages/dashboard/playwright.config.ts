import { defineConfig } from '@playwright/test';

import { BASE_URL } from './test/e2e/support/paths.js';

/**
 * Playwright e2e for the dashboard. Boots the built backend (serving the real
 * SPA at `/`) with a throwaway metrics tree and a fake clamd via global-setup,
 * seeds cheap traffic, and screenshots the routes into `docs/screenshots/`.
 * Not part of `npm run check` — regenerate with `npm run test:e2e -w file-fly-dashboard`.
 */
export default defineConfig({
  fullyParallel: false,
  globalSetup: './test/e2e/global-setup.ts',
  reporter: [['list']],
  testDir: './test/e2e',
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    viewport: { height: 900, width: 1440 },
  },
  workers: 1,
});
