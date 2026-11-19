import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  callLogger: false,
  deferred: false,
  deferredResolvers: [] as Array<(value: unknown) => void>,
  failWarm: false,
  loggerCalls: [] as string[],
  reinitFails: false,
  terminateFails: false,
}));

const BLOCKS_PAGE = {
  data: {
    blocks: [{ paragraphs: [{ lines: [{ confidence: 50, text: 'line\n' }] }] }],
    confidence: 50,
    text: 'line\n',
  },
} as const;

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(async (_langs: string[], _oem: unknown, config?: { logger?: (info: unknown) => void }) => {
    if (hoisted.failWarm) throw new Error('tesseract preload exploded');
    if (hoisted.callLogger && config?.logger) {
      config.logger('boot');
      hoisted.loggerCalls.push('boot');
    }
    return {
      recognize: vi.fn(async () => {
        if (hoisted.deferred) {
          return new Promise((resolve) => {
            hoisted.deferredResolvers.push(resolve);
          });
        }
        return BLOCKS_PAGE;
      }),
      reinitialize: vi.fn(async () => {
        if (hoisted.reinitFails) throw new Error('reinitialize exploded');
        return undefined;
      }),
      terminate: vi.fn(async () => {
        if (hoisted.terminateFails) throw new Error('terminate exploded');
      }),
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
    hoisted.reinitFails = false;
    hoisted.terminateFails = false;
    hoisted.callLogger = false;
    hoisted.loggerCalls.length = 0;
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

describe('TesseractService line coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recognizes when blocks lack paragraphs and lines', async () => {
    const { TesseractService } = await importService({});
    // eslint-disable-next-line n/no-missing-import -- mocked above; no runtime resolution needed
    const { createWorker } = await import('tesseract.js');
    vi.mocked(createWorker).mockImplementationOnce(async () => ({
      recognize: vi.fn(async () => ({
        data: { blocks: [{ paragraphs: null }, {}], confidence: 90, text: 'x\n' },
      })) as never,
      reinitialize: vi.fn(async () => undefined),
      terminate: vi.fn(async () => undefined),
    }) as never);
    const service = new TesseractService();
    const result = await service.recognize(Buffer.from('img'), ['eng']);
    expect(result.lines).toEqual([]);
    await service.onModuleDestroy();
  });

  it('reuses an idle slot for repeat calls with the same languages', async () => {
    const { TesseractService } = await importService({});
    // eslint-disable-next-line n/no-missing-import -- mocked above; no runtime resolution needed
    const { createWorker } = await import('tesseract.js');
    const service = new TesseractService();
    await service.recognize(Buffer.from('img'), ['eng']);
    await service.recognize(Buffer.from('img'), ['eng']);
    expect(createWorker).toHaveBeenCalledTimes(1);
    await service.onModuleDestroy();
  });

  it('cleans up the worker when createWorker resolves after the timeout', async () => {
    vi.stubEnv('TESSERACT_TIMEOUT_MS', '20');
    const { TesseractService } = await importService({ TESSERACT_TIMEOUT_MS: '20' });
    // eslint-disable-next-line n/no-missing-import -- mocked above; no runtime resolution needed
    const { createWorker } = await import('tesseract.js');
    let resolveWorker: ((worker: unknown) => void) | undefined;
    vi.mocked(createWorker).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveWorker = resolve as never;
        }) as never,
    );
    const service = new TesseractService();
    const pending = service.recognize(Buffer.from('img'), ['eng']);
    // Let the timeout fire first.
    await expect(pending).rejects.toThrow();
    resolveWorker?.({
      recognize: vi.fn(),
      reinitialize: vi.fn(async () => undefined),
      terminate: vi.fn(async () => undefined),
    });
    // Give the cleanup .then() a chance to run.
    await new Promise((resolve) => setImmediate(resolve));
    await service.onModuleDestroy();
  });
});


describe('TesseractService retire paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.failWarm = false;
    hoisted.deferred = false;
    hoisted.reinitFails = false;
    hoisted.terminateFails = false;
    hoisted.callLogger = false;
    hoisted.loggerCalls.length = 0;
    hoisted.deferredResolvers.length = 0;
  });

  it('retires a slot whose reinitialize fails even when terminate rejects', async () => {
    const { TesseractService } = await importService({ TESSERACT_POOL_SIZE: '1' });
    const service = new TesseractService();
    await service.recognize(Buffer.from('img'), ['eng']);
    hoisted.reinitFails = true;
    hoisted.terminateFails = true;
    await expect(service.recognize(Buffer.from('img'), ['fra'])).rejects.toThrow('reinitialize exploded');
    // dispose for real: terminate rejects in the mock too, but destroy must not throw
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('wakes the next waiter when a retire happens mid-queue', async () => {
    const { TesseractService } = await importService({ TESSERACT_POOL_SIZE: '1' });
    const service = new TesseractService();

    hoisted.deferred = true;
    const first = service.recognize(Buffer.from('img'), ['eng']);
    await flush();
    await flush();
    // two queued waiters with *different* languages
    const second = service.recognize(Buffer.from('img'), ['fra']);
    const third = service.recognize(Buffer.from('img'), ['deu']);
    await flush();

    hoisted.deferred = false;
    hoisted.reinitFails = true; // second's reinitialize fails -> retire -> wakes third
    for (const resolve of hoisted.deferredResolvers.splice(0)) resolve(BLOCKS_PAGE);

    await expect(first).resolves.toMatchObject({ langs: ['eng'] });
    await expect(second).rejects.toThrow('reinitialize exploded');
    // third must not hang: retire() wakes it, it finds an empty pool and creates a new worker
    await expect(third).resolves.toMatchObject({ langs: ['deu'] });
    await service.onModuleDestroy();
  });

  it('passes a boot logger to the worker factory', async () => {
    hoisted.callLogger = true;
    const { TesseractService } = await importService({ TESSERACT_PRELOAD: 'eng' });
    const service = new TesseractService();
    await service.recognize(Buffer.from('img'), ['eng']);
    expect(hoisted.loggerCalls).toContain('boot');
    await service.onModuleDestroy();
  });
});
