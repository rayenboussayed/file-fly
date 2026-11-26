import { expect, test } from '@playwright/test';

import { metricsSnapshotSchema } from '../../src/lib/api.js';
import { BASE_URL } from './support/paths.js';

test('the live /metrics payload satisfies the dashboard contract', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/metrics`);
  expect(response.ok()).toBe(true);

  const payload: unknown = await response.json();
  const parsed = metricsSnapshotSchema.safeParse(payload);
  // Zod issues embed the rejected value, which can be a client IP. Report only
  // field paths and messages so a drift is diagnosable without echoing data.
  const detail = parsed.error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
  expect(parsed.success, detail).toBe(true);
});
