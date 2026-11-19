import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  deferred: false,
  deferredResolvers: [] as Array<(value: unknown) => void>,
  failWarm: false,
}));

const BLOCKS_PAGE = {
  data: {
    blocks: [{ paragraphs: [{ lines: [{ confidence: 50, text: 'line\n' }] }] }],
    confidence: 50,
    text: 'line\n',
  },
} as const;

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async () => {
    if (hoisted.failWarm) throw new Error('tesseract preload exploded');
    return {
      recognize: vi.fn(async () => {
        if (hoisted.deferred) {
          return new Promise((resolve) => {
            hoisted.deferredResolvers.push(resolve);
          });
        }
        return BLOCKS_PAGE;
      }),
      reinitialize: vi.fn(async () => undefined),
      terminate: vi.fn(async () => undefined),
    };
  }),
  OEM: { LSTM_ONLY: 1 },
}));

const importService = async (env: Record<string, string>) => {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  return import('./tesseract.service.js');
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('TesseractService edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.failWarm = false;
    hoisted.deferred = false;
    hoisted.deferredResolvers.length = 0;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('preloads only valid language codes on module init', async () => {
    const { TesseractService } = await importService({ TESSERACT_PRELOAD: 'eng,fra,xx,not a lang' });
    // eslint-disable-next-line n/no-missing-import -- mocked above; no runtime resolution needed
    const { createWorker } = await import('tesseract.js');
    const service = new TesseractService();
    await service.onModuleInit();
    // warm() acquires the pool with the sorted valid set in one worker
    await flush();
    await flush();
    expect(createWorker).toHaveBeenCalledTimes(1);
    // The invalid codes are dropped from the preload list entirely.
    const args = vi.mocked(createWorker).mock.calls[0]?.[0];
    expect(args).toEqual(['eng', 'fra']);
    await service.onModuleDestroy();
  });

  it('swallows a preload failure and serves requests normally', async () => {
    hoisted.failWarm = true;
    const { TesseractService } = await importService({ TESSERACT_PRELOAD: 'eng' });
    const service = new TesseractService();
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    hoisted.failWarm = false;
    const result = await service.recognize(Buffer.from('img'), ['eng']);
    expect(result.text).toBe('line');
    await service.onModuleDestroy();
  });

  it('recycles slots after the configured number of jobs', async () => {
    const { TesseractService } = await importService({ TESSERACT_RECYCLE_JOBS: '1' });
    // eslint-disable-next-line n/no-missing-import -- mocked above; no runtime resolution needed
    const { createWorker } = await import('tesseract.js');
    const service = new TesseractService();
    await service.recognize(Buffer.from('img'), ['eng']);
    expect(createWorker).toHaveBeenCalledTimes(1);
    // First job exhausts the recycle budget: the second call must create a fresh worker.
    await service.recognize(Buffer.from('img'), ['eng']);
    expect(createWorker).toHaveBeenCalledTimes(2);
    await service.onModuleDestroy();
  });

  it('queues a waiter when the pool is saturated and hands off the slot', async () => {
    const { TesseractService } = await importService({ TESSERACT_POOL_SIZE: '1' });
    // eslint-disable-next-line n/no-missing-import -- mocked above; no runtime resolution needed
    const { createWorker } = await import('tesseract.js');
    const service = new TesseractService();

    hoisted.deferred = true;
    const first = service.recognize(Buffer.from('img'), ['eng']);
    await flush();
    await flush();
    expect(createWorker).toHaveBeenCalledTimes(1);

    // The pool is busy; this one waits in the waiters queue with ENG pool occupied by the first job.
    const second = service.recognize(Buffer.from('img'), ['fra']);
    await flush();
    await flush();
    // No free slot -> no new worker yet.
    expect(createWorker).toHaveBeenCalledTimes(1);

    // Release the first job; the waiter acquires the reinitialized slot.
    hoisted.deferred = false;
    for (const resolve of hoisted.deferredResolvers.splice(0)) {
      resolve(BLOCKS_PAGE);
    }
    await expect(first).resolves.toMatchObject({ langs: ['eng'] });
    await expect(second).resolves.toMatchObject({ langs: ['fra'] });
    // Still one worker: the second job reinitialized the idle slot instead of creating one.
    expect(createWorker).toHaveBeenCalledTimes(1);
    await service.onModuleDestroy();
  });
});
