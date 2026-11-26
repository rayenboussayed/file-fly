import { CLS_REQ } from 'nestjs-cls';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CLS_FILE_SCAN, CLS_SOURCE_STREAM } from '@/constants/cls.js';

/**
 * Default mocked environment, restored before/after every test.
 * @returns The default mocked CLAMAV_* environment values.
 */
const defaultEnv = () => ({
  CLAMAV_HOST: '127.0.0.1',
  CLAMAV_MAX_BYTES: 1024,
  CLAMAV_PORT: 3310,
  CLAMAV_TIMEOUT_MS: 1000,
});

/** @returns A clean scan verdict, as `_processResult` would produce it. */
const freshScanResult = () => ({
  file: null,
  isInfected: false as boolean | null,
  viruses: [] as string[],
});

/**
 * The mocked environment; tests may mutate it, `beforeEach`/`afterEach`
 * restore the defaults.
 * @returns The stable mocked environment object.
 */
function env() {
  if (!mocks.env) throw new Error('environment mock not initialized yet');
  return mocks.env;
}

const mocks = vi.hoisted(() => ({
  env: undefined as Record<string, unknown> | undefined,
  initCalls: 0,
  initError: undefined as Error | undefined,
  scanError: undefined as Error | undefined,
  scanResult: {
    file: null,
    isInfected: false as boolean | null,
    viruses: [] as string[],
  },
  scanStreamBytes: 0,
  scanStreamCalls: [] as Readable[],
  scanStreamError: undefined as unknown,
}));

vi.mock('jutilities/lazy', () => {
  /**
   * Test double honouring the `jutilities/lazy` contract: memoize by
   * (function source, arguments); drop the entry when a memoized promise
   * rejects so the next call retries. A fresh store is created per `lazy()`
   * call (i.e. per fresh module graph of the service), because the real
   * implementation keeps a process-wide store that would leak memoized
   * state across tests.
   */
  return {
    lazy:
      <T extends (...args: never[]) => unknown>(fn: T): T => {
        // Key by argument identity, not JSON: Symbols stringify to `null` and
        // would collide (every CLS accessor would share one cache entry).
        const NULL_ARGS = {};
        const store = new Map<unknown, unknown>();
        return ((...args: Parameters<T>) => {
          let key: unknown;
          if (args.length === 0) {
            key = NULL_ARGS;
          } else if (args.length === 1) {
            key = args[0];
          } else {
            key = args;
          }
          if (store.has(key)) return store.get(key);
          const result = fn(...args);
          store.set(key, result);
          if (result instanceof Promise) {
            const cleanup = () => store.delete(key);
            return (async () => {
              try {
                return await result;
              } catch (error) {
                cleanup();
                throw error;
              }
            })();
          }
          return result;
        }) as T;
      },
  };
});

vi.mock('clamscan', () => {
  class MockNodeClam {
    /**
     * Mock `init`: counts calls, rejects when an init error is armed.
     * @returns The initialized instance (`this`).
     */
    async init() {
      mocks.initCalls += 1;
      if (mocks.initError) throw mocks.initError;
      return this;
    }

    /**
     * Mock `scanStream`: behaves like the real one, attaching to the passed
     * stream, counting the bytes that reach clamd, and settling on `end`/`error`.
     * @param stream - The (byte counter) stream to scan.
     * @returns The configured scan verdict, or a rejection.
     */
    scanStream(stream: Readable) {
      mocks.scanStreamCalls.push(stream);
      mocks.scanStreamBytes = 0;
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          mocks.scanStreamBytes += chunk.byteLength;
        });
        stream.on('end', () => {
          if (mocks.scanError) reject(mocks.scanError);
          else resolve(mocks.scanResult);
        });
        stream.on('error', (error: unknown) => {
          mocks.scanStreamError = error;
          reject(error);
        });
      });
    }
  }
  return { default: MockNodeClam };
});

vi.mock('@/environment.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/environment.js')>();
  // Stable object across re-imports so tests can flip env vars at will.
  mocks.env ??= { ...actual.environment, ...defaultEnv() };
  return { ...actual, environment: mocks.env };
});

/**
 * Asserts that an error carries the shape of an HTTP exception.
 * @param error - The value thrown by the scan.
 * @returns The exception's status/response accessors.
 */
function asHttpException(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'getStatus' in error &&
    'getResponse' in error &&
    typeof (error as { getStatus: unknown }).getStatus === 'function' &&
    typeof (error as { getResponse: unknown }).getResponse === 'function'
  ) {
    return error as {
      getResponse: () => unknown;
      getStatus: () => number;
    };
  }
  throw error;
}

/**
 * Builds a fresh branch stream carrying the given number of bytes.
 * @param bytes - The payload size in bytes.
 * @returns A readable branch.
 */
function branchOf(bytes: number) {
  return Readable.from([Buffer.alloc(bytes, 1)]);
}

/**
 * Awaits a scan expected to reject and returns the thrown exception.
 * @param promise - The scan promise.
 * @returns The thrown HTTP exception.
 */
async function catchException(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return asHttpException(error);
  }
  throw new Error('expected scan to reject');
}

/**
 * Builds a fresh `AntiVirusService` wired to a real `NormalizedClsService`
 * over a stubbed `ClsService`, isolating the module graph per test.
 * @returns The service, the CLS backing map and the source-stream destroy spy.
 */
async function createService() {
  vi.resetModules();
  const { AntiVirusService } = await import('./anti-virus.service.js');
  const { NormalizedClsService } = await import(
    './normalized-cls.service.js'
  );
  const store = new Map<symbol, unknown>();
  const cls = {
    get: <T>(key: symbol) => store.get(key) as T,
    set: (key: symbol, value: unknown) => store.set(key, value),
  };
  const sourceDestroy = vi.fn();
  store.set(CLS_SOURCE_STREAM, { destroy: sourceDestroy });
  const normalizedCls = new NormalizedClsService(cls as never);
  const service = new AntiVirusService(normalizedCls);
  return { cls, normalizedCls, service, sourceDestroy, store };
}

/**
 * Points CLS at a request carrying the given content-length, or deletes it.
 * @param store - The CLS backing map.
 * @param contentLength - The header value; `undefined` removes the request stub.
 */
function stubRequest(
  store: Map<symbol, unknown>,
  contentLength: string | undefined,
) {
  if (contentLength === undefined) {
    store.delete(CLS_REQ);
    return;
  }
  store.set(CLS_REQ, { headers: { 'content-length': contentLength } });
}

describe('AntiVirusService', () => {
  beforeEach(() => {
    mocks.initError = undefined;
    mocks.initCalls = 0;
    mocks.scanError = undefined;
    mocks.scanResult = freshScanResult();
    mocks.scanStreamBytes = 0;
    mocks.scanStreamCalls = [];
    mocks.scanStreamError = undefined;
    if (mocks.env) Object.assign(mocks.env, defaultEnv());
  });

  afterEach(() => {
    // Restore the environment the other tests (and suites) rely on.
    if (mocks.env) Object.assign(mocks.env, defaultEnv());
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('enabled() is true when host and port are set, false otherwise', async () => {
    const { service } = await createService();
    expect(service.enabled()).toBe(true);

    env().CLAMAV_HOST = undefined;
    expect(service.enabled()).toBe(false);
    env().CLAMAV_HOST = defaultEnv().CLAMAV_HOST;
    expect(service.enabled()).toBe(true);

    env().CLAMAV_PORT = undefined;
    expect(service.enabled()).toBe(false);
    env().CLAMAV_PORT = defaultEnv().CLAMAV_PORT;
    expect(service.enabled()).toBe(true);
  });

  it('returns the clean result, stores it in CLS and replays the body downstream', async () => {
    const { cls, service, store } = await createService();
    stubRequest(store, '10');
    const branch = branchOf(10);

    const result = await service.scan({ stream: branch });

    expect(result).toEqual({ isInfected: false, viruses: [] });
    expect(cls.get(CLS_FILE_SCAN)).toEqual({
      isInfected: false,
      viruses: [],
    });
    // The pipeline reads a replayed Readable instead of the consumed request stream.
    const replayed = cls.get(CLS_SOURCE_STREAM);
    expect(replayed).toBeInstanceOf(Readable);
    const replayChunks: Buffer[] = [];
    for await (const chunk of replayed as Readable) {
      replayChunks.push(Buffer.from(chunk as Buffer));
    }
    expect(Buffer.concat(replayChunks)).toEqual(Buffer.alloc(10, 1));
    expect(mocks.initCalls).toBe(1);
    expect(mocks.scanStreamCalls).toHaveLength(1);
  });

  it('rejects with 422 on an infected payload, destroys the branch and records the verdict on CLS', async () => {
    const { cls, service, sourceDestroy, store } = await createService();
    stubRequest(store, '10');
    mocks.scanResult = {
      file: null,
      isInfected: true,
      viruses: ['Test.Virus'],
    };
    const branch = branchOf(10);
    const destroySpy = vi.spyOn(branch, 'destroy');

    const error = await catchException(service.scan({ stream: branch }));

    expect(error.getStatus()).toBe(422);
    expect(error.getResponse()).toEqual({
      message: 'File is infected with: Test.Virus',
      viruses: ['Test.Virus'],
    });
    expect(destroySpy).toHaveBeenCalled();
    // clamd consumed the branch, so EOF was reached: source is left alone.
    expect(sourceDestroy).not.toHaveBeenCalled();
    expect(cls.get(CLS_FILE_SCAN)).toEqual({ isInfected: true, viruses: ['Test.Virus'] });
  });

  it('rejects with 503 when initialization fails, destroys the branch and leaves CLS unset', async () => {
    const { cls, service, store } = await createService();
    stubRequest(store, '10');
    mocks.initError = new Error('clamd unreachable');
    const branch = branchOf(10);
    const destroySpy = vi.spyOn(branch, 'destroy');

    const error = await catchException(service.scan({ stream: branch }));

    expect(error.getStatus()).toBe(503);
    expect(destroySpy).toHaveBeenCalled();
    expect(cls.get(CLS_FILE_SCAN)).toBeUndefined();
  });

  it('rejects with 503 when the stream scan fails', async () => {
    const { cls, service, sourceDestroy, store } = await createService();
    stubRequest(store, '10');
    mocks.scanError = new Error('INSTREAM aborted');
    const branch = branchOf(10);
    const destroySpy = vi.spyOn(branch, 'destroy');

    const error = await catchException(service.scan({ stream: branch }));

    expect(error.getStatus()).toBe(503);
    expect(destroySpy).toHaveBeenCalled();
    // The mock consumed the branch to EOF before failing, so the shared
    // source is left intact.
    expect(sourceDestroy).not.toHaveBeenCalled();
    expect(cls.get(CLS_FILE_SCAN)).toBeUndefined();
  });

  it('rejects with 503 when the source errors mid-buffer', async () => {
    const { cls, service, store } = await createService();
    stubRequest(store, undefined); // unknown length
    // A branch that never ends on its own and errors on demand.
    const branch = new Readable({ read() {
      // stays idle until destroyed by the test
    } });
    const destroySpy = vi.spyOn(branch, 'destroy');

    const scanPromise = service.scan({ stream: branch });
    queueMicrotask(() => branch.destroy(new Error('source exploded')));
    const error = await catchException(scanPromise);

    expect(error.getStatus()).toBe(503);
    expect(destroySpy).toHaveBeenCalled();
    expect(cls.get(CLS_FILE_SCAN)).toBeUndefined();
  });

  it('rejects with 503 when clamd answers inconclusively (isInfected null)', async () => {
    const { cls, service, store } = await createService();
    stubRequest(store, '10');
    mocks.scanResult = { file: null, isInfected: null, viruses: [] };
    const branch = branchOf(10);
    const destroySpy = vi.spyOn(branch, 'destroy');

    const error = await catchException(service.scan({ stream: branch }));

    expect(error.getStatus()).toBe(503);
    expect(destroySpy).toHaveBeenCalled();
    expect(cls.get(CLS_FILE_SCAN)).toBeUndefined();
  });

  it('rejects with 413 for a known oversized content-length without contacting clamd', async () => {
    const { service, store } = await createService();
    stubRequest(store, '2048');
    const branch = branchOf(2048);
    const destroySpy = vi.spyOn(branch, 'destroy');

    const error = await catchException(service.scan({ stream: branch }));

    expect(error.getStatus()).toBe(413);
    expect(mocks.scanStreamCalls).toHaveLength(0);
    expect(mocks.initCalls).toBe(0);
    expect(destroySpy).toHaveBeenCalled();
  });

  it('aborts mid-stream at the cap when content-length is unknown', async () => {
    const { service, store } = await createService();
    stubRequest(store, undefined);
    expect(store.get(CLS_REQ)).toBeUndefined();
    const branch = branchOf(2048); // 2 KiB > 1024-byte test cap
    const destroySpy = vi.spyOn(branch, 'destroy');

    const error = await catchException(service.scan({ stream: branch }));

    expect(error.getStatus()).toBe(413);
    // The buffer aborted before clamd was contacted; the source was torn down.
    expect(mocks.scanStreamCalls).toHaveLength(0);
    expect(mocks.initCalls).toBe(0);
    expect(destroySpy).toHaveBeenCalled();
  });

  it('memoizes init per process, and retries after a rejected init', async () => {
    // Fresh module graph: first two clean scans must share a single init.
    const first = await createService();
    stubRequest(first.store, '10');
    await first.service.scan({ stream: branchOf(10) });
    await first.service.scan({ stream: branchOf(10) });
    expect(mocks.initCalls).toBe(1);

    // Fresh module graph: init rejects, and the entry is dropped — the next
    // scan re-initializes instead of serving the failed memoized entry.
    const second = await createService();
    stubRequest(second.store, '10');
    mocks.initError = new Error('clamd down');
    const error = await catchException(
      second.service.scan({ stream: branchOf(10) }),
    );
    expect(error.getStatus()).toBe(503);
    expect(mocks.initCalls).toBe(2);

    mocks.initError = undefined;
    await second.service.scan({ stream: branchOf(10) });
    expect(mocks.initCalls).toBe(3);
  });

  it('keeps the memoized client after a scan-status failure', async () => {
    const { service, store } = await createService();
    stubRequest(store, '10');

    mocks.scanError = new Error('boom');
    const error = await catchException(service.scan({ stream: branchOf(10) }));
    expect(error.getStatus()).toBe(503);
    mocks.scanError = undefined;
    await service.scan({ stream: branchOf(10) });
    expect(mocks.initCalls).toBe(1);
  });
});
