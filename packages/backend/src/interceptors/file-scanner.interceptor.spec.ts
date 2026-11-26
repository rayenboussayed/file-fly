import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CLS_SOURCE_DIRECTION, CLS_SOURCE_STREAM } from '@/constants/cls.js';

const antiVirusMock = vi.hoisted(() => ({
  enabled: vi.fn(),
  scan: vi.fn(),
}));

vi.mock('@/services/anti-virus.service.js', () => ({
  AntiVirusService: class AntiVirusService {
    enabled = antiVirusMock.enabled;
    scan = antiVirusMock.scan;
  },
}));

describe('FileScannerInterceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes method-less requests through without scanning', async () => {
    const handled = Symbol('handled');
    const cls = {
      request: () => {},
      response: () => ({}),
    };
    const { FileScannerInterceptor } = await import('./file-scanner.interceptor.js');
    const interceptor = new FileScannerInterceptor(cls as never, antiVirusMock as never);
    const handle = vi.fn(() => handled);
    expect(await interceptor.intercept(undefined as never, { handle } as never)).toBe(handled);
    expect(handle).toHaveBeenCalledOnce();
    expect(antiVirusMock.scan).not.toHaveBeenCalled();
    expect(antiVirusMock.enabled).not.toHaveBeenCalled();
  });

  it('passes media through untouched when the scanner is disabled', async () => {
    const handled = Symbol('handled');
    antiVirusMock.enabled.mockReturnValue(false);
    const request = {
      headers: {},
      method: 'POST',
      query: {},
      raw: Readable.from(['bytes']),
      signal: new AbortController().signal,
      url: '/image',
    };
    const cls = {
      request: () => request,
      response: () => ({}),
    };
    const { FileScannerInterceptor } = await import('./file-scanner.interceptor.js');
    const interceptor = new FileScannerInterceptor(cls as never, antiVirusMock as never);
    const handle = vi.fn(() => handled);
    expect(await interceptor.intercept(undefined as never, { handle } as never)).toBe(handled);
    expect(handle).toHaveBeenCalledOnce();
    expect(antiVirusMock.scan).not.toHaveBeenCalled();
  });

   
  it('scans enabled clean media and reaches the next handler', async () => {
    antiVirusMock.enabled.mockReturnValue(true);
    antiVirusMock.scan.mockResolvedValue({ isInfected: false, viruses: [] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new Map<symbol, any>();
    const source = Readable.from(['bytes']);
    store.set(CLS_SOURCE_STREAM, source);

    const cls = {
      request: () => ({
        headers: { 'content-length': '5' },
        method: 'POST',
        query: {},
        raw: source,
        signal: new AbortController().signal,
        url: '/image',
      }),
      response: () => ({}),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceDirection: () => ({ get: () => store.get(CLS_SOURCE_DIRECTION), set: (v: any) => store.set(CLS_SOURCE_DIRECTION, v) }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceStream: () => ({ get: () => store.get(CLS_SOURCE_STREAM), set: (v: any) => store.set(CLS_SOURCE_STREAM, v) }),
    };
    const { FileScannerInterceptor } = await import('./file-scanner.interceptor.js');
    const interceptor = new FileScannerInterceptor(cls as never, antiVirusMock as never);
    const { of } = await import('rxjs');
    const handle = vi.fn(() => of('value'));
    await interceptor.intercept(undefined as never, { handle } as never);
    expect(handle).toHaveBeenCalledOnce();
    expect(antiVirusMock.scan).toHaveBeenCalledOnce();
    const [arg] = antiVirusMock.scan.mock.calls[0] as [{ stream: unknown }];
    expect(arg.stream).toBeInstanceOf(Readable);
  });

   
  it('propagates scan rejection and never reaches the next handler', async () => {
    antiVirusMock.enabled.mockReturnValue(true);
    const failure = new Error('infected');
    antiVirusMock.scan.mockRejectedValue(failure);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new Map<symbol, any>();
    const source = Readable.from(['bytes']);
    store.set(CLS_SOURCE_STREAM, source);

    const cls = {
      request: () => ({
        headers: { 'content-length': '5' },
        method: 'POST',
        query: {},
        raw: source,
        signal: new AbortController().signal,
        url: '/image',
      }),
      response: () => ({}),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceDirection: () => ({ get: () => store.get(CLS_SOURCE_DIRECTION), set: (v: any) => store.set(CLS_SOURCE_DIRECTION, v) }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceStream: () => ({ get: () => store.get(CLS_SOURCE_STREAM), set: (v: any) => store.set(CLS_SOURCE_STREAM, v) }),
    };
    const { FileScannerInterceptor } = await import('./file-scanner.interceptor.js');
    const interceptor = new FileScannerInterceptor(cls as never, antiVirusMock as never);
    const handle = vi.fn();
    await expect(interceptor.intercept(undefined as never, { handle } as never)).rejects.toBe(failure);
    expect(handle).not.toHaveBeenCalled();
  });

  it('throws an internal error when AV is enabled but no source is bound', async () => {
    antiVirusMock.enabled.mockReturnValue(true);
    const cls = {
      request: () => ({ headers: {}, method: 'POST', url: '/font/metadata' }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => {}, set: () => {} }),
    };
    const { FileScannerInterceptor } = await import('./file-scanner.interceptor.js');
    const interceptor = new FileScannerInterceptor(cls as never, antiVirusMock as never);
    await expect(
      interceptor.intercept(undefined as never, { handle: () => 'next' } as never),
    ).rejects.toMatchObject({ status: 500 });
    expect(antiVirusMock.scan).not.toHaveBeenCalled();
  });
});
