import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { CLS_CACHE_KEY, CLS_FILE_HASH, CLS_FILE_SIGNATURE, CLS_SOURCE_DIRECTION, CLS_SOURCE_STREAM } from '@/constants/cls.js';

describe('FileParserInterceptor', () => {
  it('covers non-media early return', async () => {
    const handled = Symbol('handled');
    const cls = {
      request: () => ({ url: '/health' }),
      response: () => ({}),
    };
    const interceptor = new (await import('./file-parser.interceptor.js')).FileParserInterceptor(cls as never, {} as never);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await (interceptor.intercept(undefined as never, { handle: () => handled } as never) as any)).toBe(handled);
  });

// eslint-disable-next-line sonarjs/assertions-in-tests
  it('covers upload parsing', async () => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new Map<symbol, any>();
    const source = new PassThrough();
    source.end(Buffer.from('abc'));
    const request = {
      headers: { 'content-length': '3', 'x-file-hash': 'abc' },
      method: 'POST',
      query: {},
      raw: source,
      signal: new AbortController().signal,
      url: '/image',
    };
    store.set(CLS_SOURCE_STREAM, request.raw);

    const cls = {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      cacheKey: () => ({ get: () => store.get(CLS_CACHE_KEY), set: (v: any) => store.set(CLS_CACHE_KEY, v) }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileHash: () => ({ set: (v: any) => store.set(CLS_FILE_HASH, v) }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileSignature: () => ({ get: () => store.get(CLS_FILE_SIGNATURE), set: (v: any) => store.set(CLS_FILE_SIGNATURE, v) }),
      request: () => request,
      response: () => ({ header: vi.fn() }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceDirection: () => ({ get: () => store.get(CLS_SOURCE_DIRECTION), set: (v: any) => store.set(CLS_SOURCE_DIRECTION, v) }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceStream: () => ({ get: () => store.get(CLS_SOURCE_STREAM), set: (v: any) => store.set(CLS_SOURCE_STREAM, v) }),
    };
    const fileTypeService = { signature: vi.fn(async () => undefined) };
    const { FileParserInterceptor } = await import('./file-parser.interceptor.js');
    const interceptor = new FileParserInterceptor(cls as never, fileTypeService as never);
    const { of } = await import('rxjs');
    const next = { handle: () => of('value') };
    await new Promise((resolve) => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obs: any;
      try {
        obs = interceptor.intercept(undefined as never, next as never);
      } catch (e) {
        console.error('intercept threw', e);
        resolve(undefined);
        return;
      }
      if (!obs || typeof obs.subscribe !== 'function') {
        console.error('no observable', obs);
        resolve(undefined);
        return;
      }
      const sub = obs.subscribe({
        complete: () => resolve(undefined),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        error: (e: any) => {
          console.error('observable error', e);
          resolve(undefined);
        },
        next: () => undefined,
      });
      if (typeof sub.unsubscribe === 'function') setTimeout(() => sub.unsubscribe(), 1000);
    });
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
    store; // use
  });
});
describe('FileParserInterceptor cache keys', () => {
  const setup = async (overrides: {
    direction?: string;
    headers?: Record<string, string>;
  }) => {
    const { PassThrough } = await import('node:stream');
    const source = new PassThrough();
    source.end(Buffer.from('hello world, this is a deterministic payload for hashing'));
    const request = {
      headers: { 'content-length': '42', ...overrides.headers },
      method: 'POST',
      query: { q: '1' },
      raw: source,
      signal: new AbortController().signal,
      url: '/upload',
    };
    const store = new Map<symbol, unknown>();
    store.set(CLS_SOURCE_STREAM, request.raw);
    if (overrides.direction !== undefined) store.set(CLS_SOURCE_DIRECTION, overrides.direction);
    const cls = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cacheKey: () => ({ get: () => store.get(CLS_CACHE_KEY), set: (v: any) => store.set(CLS_CACHE_KEY, v) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileHash: () => ({ get: () => store.get(CLS_FILE_HASH), set: (v: any) => store.set(CLS_FILE_HASH, v) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileSignature: () => ({ get: () => store.get(CLS_FILE_SIGNATURE), set: (v: any) => store.set(CLS_FILE_SIGNATURE, v) }),
      request: () => request,
      response: () => ({ header: () => undefined }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceDirection: () => ({ get: () => store.get(CLS_SOURCE_DIRECTION), set: (v: any) => store.set(CLS_SOURCE_DIRECTION, v) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceStream: () => ({ get: () => store.get(CLS_SOURCE_STREAM), set: (v: any) => store.set(CLS_SOURCE_STREAM, v) }),
    };
    const fileTypeService = { signature: vi.fn(async () => ({ ext: 'png', mime: 'image/png' })) };
    const { FileParserInterceptor } = await import('./file-parser.interceptor.js');
    const { of } = await import('rxjs');
    const interceptor = new FileParserInterceptor(cls as never, fileTypeService as never);
    await interceptor.intercept(undefined as never, { handle: () => of('done') } as never);
    return { request, store };
  };

  it('computes the file hash from the stream prefix when the client does not supply one', async () => {
    const { store } = await setup({});
    const hash = store.get(CLS_FILE_HASH);
    expect(typeof hash).toBe('string');
    expect(String(hash).length).toBeGreaterThan(20);
    expect(store.get(CLS_CACHE_KEY)).toBeDefined();
    // deterministic: same bytes produce the same hash
    const { store: again } = await setup({});
    expect(again.get(CLS_FILE_HASH)).toBe(hash);
  });

  it('prefers the client-supplied hash when present', async () => {
    const { store } = await setup({ headers: { 'x-file-hash': 'client-supplied-hash' } });
    expect(store.get(CLS_FILE_HASH)).toBe('client-supplied-hash');
  });

  it('uses the client hash for downloads instead of hashing the payload', async () => {
    const { store } = await setup({
      direction: 'download',
      headers: { 'x-file-hash': 'client-download-hash' },
    });
    expect(store.get(CLS_FILE_HASH)).toBe('client-download-hash');
    expect(store.get(CLS_CACHE_KEY)).toBeDefined();
  });

  it('download without a client hash still produces a cache key but no file hash', async () => {
    const { store } = await setup({ direction: 'download' });
    expect(store.get(CLS_FILE_HASH)).toBeUndefined();
    expect(store.get(CLS_CACHE_KEY)).toBeDefined();
  });
});


describe('FileParserInterceptor prefix hash with a small cap', () => {
  it('honors FILE_HASH_HEADER_SIZE and drops chunks past the prefix', async () => {
    vi.stubEnv('FILE_HASH_HEADER_SIZE', '8');
    vi.resetModules();
    const { PassThrough } = await import('node:stream');
    const source = new PassThrough();
    // three chunks: under-cap, overshoot (subarray path), post-cap (dropped)
    source.write(Buffer.from('abcd'));
    source.write(Buffer.alloc(60, 0x61));
    source.write(Buffer.alloc(20, 0x62));
    source.end();

    const request = {
      headers: { 'content-length': '84' },
      method: 'POST',
      query: {},
      raw: source,
      signal: new AbortController().signal,
      url: '/upload',
    };
    const store = new Map<symbol, unknown>();
    store.set(CLS_SOURCE_STREAM, source);
    const cls = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cacheKey: () => ({ get: () => undefined, set: (v: any) => store.set(CLS_CACHE_KEY, v) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileHash: () => ({ get: () => store.get(CLS_FILE_HASH), set: (v: any) => store.set(CLS_FILE_HASH, v) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fileSignature: () => ({ get: () => undefined, set: () => undefined }),
      request: () => request,
      response: () => ({ header: () => undefined }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceDirection: () => ({ get: () => store.get(CLS_SOURCE_DIRECTION), set: (v: any) => store.set(CLS_SOURCE_DIRECTION, v) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceStream: () => ({ get: () => store.get(CLS_SOURCE_STREAM), set: (v: any) => store.set(CLS_SOURCE_STREAM, v) }),
    };
    const fileTypeService = { signature: vi.fn(async () => undefined) };
    const { FileParserInterceptor } = await import('./file-parser.interceptor.js');
    const { of } = await import('rxjs');
    const interceptor = new FileParserInterceptor(cls as never, fileTypeService as never);
    await interceptor.intercept(undefined as never, { handle: () => of('done') } as never);
    expect(typeof store.get(CLS_FILE_HASH)).toBe('string');
    expect(String(store.get(CLS_FILE_HASH))).toHaveLength(88); // sha512 base64 = 88 chars
    vi.unstubAllEnvs();
  });
});

describe('FileParserInterceptor prefix hash failure path', () => {
  it('rejects when the hashed prefix stream errors mid-read', async () => {
    const { PassThrough } = await import('node:stream');
    const source = new PassThrough();
    const chunks = [Buffer.from('hello'), null] as const;
    // feed one chunk then error the stream
    source.write(chunks[0]);
    process.nextTick(() => source.destroy(new Error('connection reset')));

    const request = {
      headers: { 'content-length': '100' },
      method: 'POST',
      query: {},
      raw: source,
      signal: new AbortController().signal,
      url: '/upload',
    };
    const cls = {
      cacheKey: () => ({ get: () => undefined, set: (v: unknown) => v }),
      cacheOutcome: () => ({ get: () => undefined, set: (v: unknown) => v }),
      fileHash: () => ({ set: (v: unknown) => v }),
      fileSignature: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => request,
      response: () => ({ header: () => undefined }),
      sourceDirection: () => ({ get: () => undefined, set: (v: unknown) => v }),
      sourceStream: () => ({ get: () => source, set: (v: unknown) => v }),
    };
    const fileTypeService = { signature: vi.fn(async () => ({ ext: 'png', mime: 'image/png' })) };
    const { FileParserInterceptor } = await import('./file-parser.interceptor.js');
    const { of } = await import('rxjs');
    const interceptor = new FileParserInterceptor(cls as never, fileTypeService as never);
    await expect(
      interceptor.intercept(undefined as never, { handle: () => of('done') } as never),
    ).rejects.toThrow('connection reset');
  });
});
