import { EventEmitter } from 'node:events';

const Emitter = EventEmitter;
import { describe, expect, it, vi } from 'vitest';

import { MetricsInterceptor } from './metrics.interceptor.js';

interface Stub {
  antiVirus: { enabled: () => boolean };
  cls: {
    bytesIn: () => { get: () => number | undefined };
    bytesOut: () => { get: () => number | undefined };
    cacheOutcome: () => { get: () => 'hit' | 'miss' | undefined };
    fileScan: () => { get: () => undefined | { isInfected: boolean } };
    sourceDirection: () => { get: () => 'download' | 'upload' | undefined };
  };
  context: never;
  metrics: {
    inflightDec: ReturnType<typeof vi.fn>;
    inflightInc: ReturnType<typeof vi.fn>;
    record: ReturnType<typeof vi.fn>;
  };
  raw: EventEmitter & { getHeader: () => string | undefined; statusCode: number };
  request: { ip: string };
}

/**
 * Minimal Fastify-ish request/reply and CLS stand-ins for the interceptor.
 * @param options - Fixture overrides; all optional.
 * @param options.routeUrl - Route template to expose on `routeOptions`; omit for an unmatched route.
 * @param options.headers - Request headers.
 * @param options.statusCode - Status code for the raw response.
 * @param options.responseContentLength - Value returned by `getHeader('content-length')`.
 * @param options.antiVirusEnabled - Whether the AV integration is configured; defaults to true.
 * @param options.bytesIn - Cumulative bytes-in counter stored on CLS.
 * @param options.bytesOut - Cumulative bytes-out counter stored on CLS.
 * @param options.files - `1` when a media source was opened, `0` otherwise.
 * @param options.cacheOutcome - Cache verdict stored on CLS.
 * @param options.fileScan - Virus-scan verdict stored on CLS.
 * @param options.fileScan.isInfected - True when ClamAV flagged the payload.
 * @returns The stub bundle (context, CLS, metrics mocks, raw).
 */
const makeStub = (options: {
  antiVirusEnabled?: boolean;
  bytesIn?: number;
  bytesOut?: number;
  cacheOutcome?: 'hit' | 'miss';
  files?: 0 | 1;
  fileScan?: { isInfected: boolean };
  headers?: Record<string, string | string[]>;
  responseContentLength?: string;
  routeUrl?: string;
  statusCode?: number;
} = {}): Stub => {
  const raw = new Emitter() as Stub['raw'];
  raw.statusCode = options.statusCode ?? 200;
  raw.getHeader = () => options.responseContentLength;

  const request = {
    headers: options.headers ?? {},
    ip: '127.0.0.1',
    routeOptions: options.routeUrl === undefined ? {} : { url: options.routeUrl },
  };
  const reply = { raw };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
  } as never;

  const cls: Stub['cls'] = {
    bytesIn: () => ({ get: () => options.bytesIn }),
    bytesOut: () => ({ get: () => options.bytesOut }),
    cacheOutcome: () => ({ get: () => options.cacheOutcome }),
    fileScan: () => ({ get: () => options.fileScan }),
    sourceDirection: () => ({ get: () => (options.files === 0 ? undefined : ('upload' as const)) }),
  };

  const metrics: Stub['metrics'] = {
    inflightDec: vi.fn(),
    inflightInc: vi.fn(),
    record: vi.fn(),
  };

  return {
    antiVirus: { enabled: () => options.antiVirusEnabled ?? true },
    cls,
    context,
    metrics,
    raw,
    request,
  };
};

const handler = { handle: () => 'next' } as never;

/**
 * Runs one request through the interceptor and returns the record passed to metrics.
 * @param stub - Stub bundle from `makeStub`.
 * @returns The argument passed to `metrics.record`.
 */
const fire = (stub: Stub) => {
  const interceptor = new MetricsInterceptor(
    stub.cls as never,
    stub.metrics as never,
    stub.antiVirus as never,
  );
  expect(interceptor.intercept(stub.context, handler)).toBe('next');
  stub.raw.emit('close');
  return stub.metrics.record.mock.calls[0]?.[0] as Record<string, unknown>;
};

describe('MetricsInterceptor', () => {
  it('records a completed request with CLS-provided values', () => {
    const stub = makeStub({
      bytesIn: 123,
      bytesOut: 456,
      cacheOutcome: 'hit',
      routeUrl: '/image',
    });
    fire(stub);
    expect(stub.metrics.inflightInc).toHaveBeenCalledTimes(1);
    expect(stub.metrics.record).toHaveBeenCalledTimes(1);
    const record = stub.metrics.record.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(record).toMatchObject({
      bytesIn: 123,
      bytesOut: 456,
      cacheOutcome: 'hit',
      filesIn: 1,
      filesOut: 1,
      ip: '127.0.0.1',
      route: '/image',
      status: 200,
    });
    expect(typeof record.durationMs).toBe('number');
    expect(stub.metrics.inflightDec).toHaveBeenCalledTimes(1);
  });

  it('ignores /metrics and /health routes entirely', () => {
    for (const route of ['/metrics', '/health']) {
      const stub = makeStub({ routeUrl: route });
      const interceptor = new MetricsInterceptor(
    stub.cls as never,
    stub.metrics as never,
    stub.antiVirus as never,
  );
      expect(interceptor.intercept(stub.context, handler)).toBe('next');
      stub.raw.emit('close');
      expect(stub.metrics.inflightInc).not.toHaveBeenCalled();
      expect(stub.metrics.record).not.toHaveBeenCalled();
      expect(stub.metrics.inflightDec).not.toHaveBeenCalled();
    }
  });

  it('falls back to content-length headers when CLS byte counts are absent', () => {
    const stub = makeStub({
      bytesIn: undefined,
      bytesOut: undefined,
      headers: { 'content-length': '999' },
      responseContentLength: '256',
      routeUrl: '/signature',
    });
    const record = fire(stub);
    expect(record.bytesIn).toBe(999);
    expect(record.bytesOut).toBe(256);
    expect(record.filesOut).toBe(0);
  });

  it('defaults to zero bytes when neither CLS nor headers know', () => {
    const stub = makeStub({ bytesIn: undefined, bytesOut: undefined, routeUrl: '/virus-scan', statusCode: 503 });
    const record = fire(stub);
    expect(record.bytesIn).toBe(0);
    expect(record.bytesOut).toBe(0);
    expect(record.scan).toBeUndefined();
  });

  it('parses multi-value content-length headers defensively', () => {
    const stub = makeStub({
      bytesIn: undefined,
      bytesOut: undefined,
      headers: { 'content-length': ['512', '512'] },
      routeUrl: '/signature',
    });
    expect(fire(stub).bytesIn).toBe(512);
    const garbage = makeStub({
      bytesIn: undefined,
      bytesOut: undefined,
      headers: { 'content-length': 'abc' },
      routeUrl: '/signature',
    });
    expect(fire(garbage).bytesIn).toBe(0);
  });

  it('classifies scanner rejections and virus-scan verdicts', () => {
    for (const [status, scan] of [[413, 'blocked'], [422, 'blocked'], [500, undefined]] as const) {
      const stub = makeStub({ routeUrl: '/image', statusCode: status });
      expect(fire(stub).scan).toBe(scan);
    }
    const disabled = makeStub({ antiVirusEnabled: false, routeUrl: '/image', statusCode: 422 });
    expect(fire(disabled).scan).toBeUndefined();
    expect(fire(makeStub({ fileScan: { isInfected: false }, routeUrl: '/image', statusCode: 201 })).scan).toBe('clean');
    expect(fire(makeStub({ fileScan: { isInfected: true }, routeUrl: '/image', statusCode: 422 })).scan).toBe('infected');
  });

  it('falls back to unmatched when the route has no url', () => {
    expect(fire(makeStub({ routeUrl: undefined })).route).toBe('unmatched');
  });

  it('counts non-file responses and non-media sources', () => {
    const stub = makeStub({ bytesOut: undefined, files: 0, routeUrl: '/audio/metadata' });
    const record = fire(stub);
    expect(record.filesIn).toBe(0);
    expect(record.filesOut).toBe(0);
  });
});
