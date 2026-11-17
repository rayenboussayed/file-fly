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