import type { XlsxBuildType } from '@/resources/xlsx/schema.js';

import { XlsxService } from '@/resources/xlsx/xlsx.service.js';

import { settleHeap } from './helpers.js';

const ITERATIONS = 6;

const makeCls = (): unknown => ({
  cacheKey: () => ({ get: () => {}, set: () => {} }),
  cacheOutcome: () => ({ get: () => {}, set: () => {} }),
  request: () => {},
  sourceDirection: () => ({ set: () => {} }),
  sourceStream: () => ({ get: () => {}, set: () => {} }),
});

const makePayload = (): XlsxBuildType => ({
  sheets: [
    {
      rows: Array.from({ length: 120 }, (_, index) => [index, `row ${index}`, index * 1.5]),
    },
  ],
});

describe('xlsx build memory', () => {
  it('stays flat across repeated builds', async () => {
    const service = new XlsxService(makeCls() as never);
    const warmBytes = await service.build(makePayload());
    expect(warmBytes.length).toBeGreaterThan(0);
    await settleHeap();
    const before = process.memoryUsage();

    for (let i = 0; i < ITERATIONS; i += 1) {
      const bytes = await service.build(makePayload());
      expect(bytes.length).toBeGreaterThan(1024);
    }

    await settleHeap();
    const after = process.memoryUsage();
    expect(after.heapUsed - before.heapUsed).toBeLessThan(8 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  }, 120_000);
});
