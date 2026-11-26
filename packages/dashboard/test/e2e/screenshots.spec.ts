import { expect, type Page, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { SCREENSHOTS_DIR } from './support/paths.js';

/**
Inline stylesheet that freezes every animation/transition so screenshots are stable.
 */
const FREEZE_ANIMATIONS =
  '*,*::before,*::after{animation:none!important;transition:none!important}';

/**
 * Freezes animations on the current page. Charts and cards animate on mount;
 * screenshot bytes only stay comparable between runs once they are suppressed.
 * @param page - The page to freeze.
 */
async function freezeAnimations(page: Page): Promise<void> {
  await page.addStyleTag({ content: FREEZE_ANIMATIONS });
}

/**
 * The dashboard is a fixed-height Astryx app shell: the document itself never
 * scrolls (`html, body, #root { height: 100% }`); the `.astryx-layout-content`
 * region scrolls instead. `fullPage` screenshots therefore clip below the
 * fold. Grow the viewport until the scroller no longer overflows and capture
 * that instead.
 * @param page - The page to resize and capture.
 * @param file - Screenshot file name inside {@link SCREENSHOTS_DIR}.
 */
async function shootFullHeight(page: Page, file: string): Promise<void> {
  const content = page.locator('[class*="astryx-layout-content"]').first();
  // The fixed app shell reports the content's intrinsic height with one frame
  // of lag after the shell resizes; iterate until the scroller no longer overflows.
  const overflow = (): Promise<number> =>
    content.evaluate((element) => element.scrollHeight - element.clientHeight);
  for (let iteration = 0; iteration < 6; iteration += 1) {
    // Viewport growth must settle between iterations, so this loop is sequential by design.
    const delta = await overflow();
    if (delta <= 0) break;
    const base = page.viewportSize()?.height ?? 900;
    await page.setViewportSize({ height: base + Math.ceil(delta) + 16, width: 1440 });
    // Synchronised wait: the shell must absorb the extra height before the next measure.
    await page.waitForFunction(
      (previous) => {
        const element = document.querySelector('[class*="astryx-layout-content"]');
        return (
          element instanceof HTMLElement &&
          element.scrollHeight - element.clientHeight < previous
        );
      },
      delta,
    );
  }
  await expect
    .poll(overflow, { timeout: 2000 })
    .toBeLessThanOrEqual(0);
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, file) });
}

test.beforeAll(() => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- SCREENSHOTS_DIR is a repo-layout constant derived from import.meta.url
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

test('overview captures seeded metrics for the docs screenshot', async ({ page }) => {
  await page.goto('/');
  await freezeAnimations(page);

  await expect(page.getByRole('heading', { level: 2, name: 'Metrics' })).toBeVisible();
  await expect(page.getByText('Requests (all time)')).toBeVisible();
  // The seeded per-IP table must render instead of the empty state.
  await expect(page.getByRole('link', { name: '203.0.113.7' })).toBeVisible();
  await expect(page.getByRole('link', { name: '198.51.100.42' })).toBeVisible();
  // The per-route table renders below the fold; only resize once it exists in the DOM.
  await expect(page.getByRole('cell', { name: '/image' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '/virus-scan' })).toBeVisible();

  await shootFullHeight(page, 'dashboard-overview.png');
});

test('per-IP detail captures the seeded client drill-down', async ({ page }) => {
  await page.goto('/ip/203.0.113.7');
  await freezeAnimations(page);

  await expect(page.getByRole('heading', { level: 2, name: '203.0.113.7' })).toBeVisible();
  await expect(page.getByText('Share of bytes out')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to overview' })).toBeVisible();

  await shootFullHeight(page, 'dashboard-ip-detail.png');
});
