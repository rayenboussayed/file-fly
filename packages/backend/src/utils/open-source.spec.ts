import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

let lastBody: Readable | undefined;
let lastRequestHeaders: Record<string, string | string[]> | undefined;
let mockResponseHeaders: Record<string, string> = {};
vi.mock('undici', () => ({
  request: vi.fn(async (_url: string, options?: { headers?: Record<string, string | string[]> }) => {
    lastRequestHeaders = options?.headers;
    lastBody = Readable.from([Buffer.from('remote-'), Buffer.from('bytes')]);
    return { body: lastBody, headers: mockResponseHeaders };
  }),
}));

import { openMediaSource } from './open-source.js';

interface Harness {
  cls: never;
  state: { bytesIn?: number; direction?: string; source?: unknown };
}

/**
 * Builds a CLS stub whose request is a GET carrying a source query.
 * @returns The stub and the backing state.
 */
const makeGetHarness = (): Harness => {
  const state: Harness['state'] = {};
  const cls = {
    bytesIn: () => ({
      get: () => state.bytesIn,
      set: (value: number) => { state.bytesIn = value; },
    }),
    request: () => ({
      headers: {},
      method: 'GET',
      query: { source: 'https://fixture.local/photo.jpg' },
      signal: new AbortController().signal,
    }),
    sourceDirection: () => ({
      get: () => state.direction,
      set: (value: string) => { state.direction = value; },
    }),
    sourceStream: () => ({
      get: () => state.source,
      set: (value: unknown) => { state.source = value; },
    }),
  } as never;
  return { cls, state };
};

/**
 * Reads a stream to EOF, returning its concatenated bytes.
 * @param stream - Stream to consume.
 * @returns The concatenated buffer.
 */
async function collect(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  await new Promise<void>((resolve, reject) => {
    stream.once('end', () => resolve());
    stream.once('error', reject);
  });
  return Buffer.concat(chunks);
}

/**
 * Builds a GET CLS stub with a custom source URL and request headers.
 * @param source - The user-supplied source URL under test.
 * @param headers - Headers a browser client might carry.
 * @returns The stub and the backing state.
 */
const makeGetHarnessWith = (source: string, headers: Record<string, string> = {}): Harness => {
  const state: Harness['state'] = {};
  const cls = {
    bytesIn: () => ({
      get: () => state.bytesIn,
      set: (value: number) => { state.bytesIn = value; },
    }),
    request: () => ({
      headers,
      method: 'GET',
      query: { source },
      signal: new AbortController().signal,
    }),
    sourceDirection: () => ({
      get: () => state.direction,
      set: (value: string) => { state.direction = value; },
    }),
    sourceStream: () => ({
      get: () => state.source,
      set: (value: unknown) => { state.source = value; },
    }),
  } as never;
  return { cls, state };
};

describe('openMediaSource', () => {
  it('meters remote download bytes as they flow', async () => {
    const { cls, state } = makeGetHarness();
    await openMediaSource(cls);
    expect(state.direction).toBe('download');
    const metered = state.source as Readable;
    expect(metered).toBeInstanceOf(Readable);
    const payload = await collect(metered);
    expect(payload.toString()).toBe('remote-bytes');
    expect(state.bytesIn).toBe('remote-bytes'.length);
  });

  it('turns a meter failure into a source failure consumers handle', async () => {
    const { cls, state } = makeGetHarness();
    await openMediaSource(cls);
    const meter = state.source as Readable;
    expect(lastBody).toBeDefined();
    meter.emit('error', new Error('meter exploded'));
    expect(lastBody?.destroyed).toBe(true);
  });

  it('is idempotent: a second call keeps the already-opened source', async () => {
    const { cls, state } = makeGetHarness();
    await openMediaSource(cls);
    const first = state.source;
    await openMediaSource(cls);
    expect(state.source).toBe(first);
  });

  it('sets the upload direction for POST bodies without a meter', async () => {
    const raw = new Readable({ read() { this.push(null); } });
    const state: { bytesIn?: number; direction?: string; source?: unknown } = {};
    const cls = {
      bytesIn: () => ({ get: () => state.bytesIn, set: (value: number) => { state.bytesIn = value; } }),
      request: () => ({ method: 'POST', raw }),
      sourceDirection: () => ({
        get: () => state.direction,
        set: (value: string) => { state.direction = value; },
      }),
      sourceStream: () => ({
        get: () => state.source,
        set: (value: unknown) => { state.source = value; },
      }),
    } as never;
    await openMediaSource(cls);
    expect(state.direction).toBe('upload');
    // Upload bodies are piped through a byte cap (independent of virus scanning).
    expect(state.source).toBeInstanceOf(Readable);
    expect(state.source).not.toBe(raw);
    expect(state.bytesIn).toBeUndefined();
  });

  it('leaves method-less requests untouched', async () => {
    const state: { bytesIn?: number; direction?: string; source?: unknown } = {};
    const cls = {
      bytesIn: () => ({ get: () => state.bytesIn, set: (value: number) => { state.bytesIn = value; } }),
      request: () => undefined,
      sourceDirection: () => ({
        get: () => state.direction,
        set: (value: string) => { state.direction = value; },
      }),
      sourceStream: () => ({
        get: () => state.source,
        set: (value: unknown) => { state.source = value; },
      }),
    } as never;
    await openMediaSource(cls);
    expect(state.direction).toBeUndefined();
    expect(state.source).toBeUndefined();
  });

  it('forwards only accept, accept-language and user-agent to the remote origin', async () => {
    const harness = makeGetHarnessWith('https://fixture.local/photo.jpg', {
      accept: 'image/*',
      'accept-language': 'en',
      authorization: 'Bearer top-secret',
      cookie: 'session=abc',
      'user-agent': 'fig-test',
      'x-api-key': 'key123',
      'x-forwarded-for': '203.0.113.9',
    });
    await openMediaSource(harness.cls);
    expect(lastRequestHeaders).toEqual({ accept: 'image/*', 'accept-language': 'en', 'user-agent': 'fig-test' });
  });

  it('rejects non-http(s) source URLs with 400', async () => {
    const { cls } = makeGetHarnessWith('file:///etc/passwd');
    const error: unknown = await openMediaSource(cls).catch((value: unknown) => value);
    expect(error).toMatchObject({ response: { code: 'SOURCE_SCHEME_NOT_ALLOWED' } });
  });

// eslint-disable-next-line sonarjs/no-clear-text-protocols -- the plaintext literals on this line are the egress guard's test subjects; they are never fetched
  it.each(['http://127.0.0.1/internal.jpg', 'http://10.0.0.8/x.jpg', 'http://192.168.1.9/x.jpg', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/x.jpg', 'http://localhost/x.jpg', 'https://printer.internal/x.jpg',
    'https://[::ffff:127.0.0.1]/internal.jpg',
    'https://[::ffff:10.0.0.8]/x.jpg',
    'https://[::ffff:169.254.169.254]/latest/meta-data',
    'https://[::ffff:172.16.0.1]/x.jpg',
    'https://[::ffff:192.168.1.9]/x.jpg',
    'https://[::ffff:198.18.0.1]/x.jpg',
    'https://[::ffff:100.64.0.1]/x.jpg',
    'https://[::ffff:0.0.0.0]/x.jpg',
    'https://[::127.0.0.1]/x.jpg',
    'https://[::a00:8]/x.jpg',
    'https://[64:ff9b::7f00:1]/x.jpg',
    'https://[64:ff9b::a9fe:a9fe]/x.jpg',
    'https://[64:ff9b:1::7f00:1]/x.jpg',
  ])(
    'refuses the private or internal literal %s',
    async (source) => {
      const { cls } = makeGetHarnessWith(source);
      const error: unknown = await openMediaSource(cls).catch((value: unknown) => value);
      expect(error).toMatchObject({ response: { code: 'SOURCE_HOST_NOT_ALLOWED' } });
    },
  );

  it.each([
    'https://[::ffff:203.0.113.7]/x.jpg',
    'https://[::cb00:7107]/x.jpg',
    'https://[64:ff9b::cb00:7107]/x.jpg',
    'https://[64:ff9b:1::cb00:7107]/x.jpg',
  ])('allows the public IPv4-embedded literal %s', async (source) => {
    const { cls, state } = makeGetHarnessWith(source);
    await openMediaSource(cls);
    expect(state.direction).toBe('download');
  });

  it('rejects a declared remote content-length over the cap before streaming', async () => {
    mockResponseHeaders = { 'content-length': '99999999999' };
    try {
      const { cls } = makeGetHarnessWith('https://fixture.local/huge.bin');
      const error: unknown = await openMediaSource(cls).catch((value: unknown) => value);
      expect(error).toMatchObject({ message: expect.stringContaining('exceeds') as string });
      expect(lastBody?.destroyed).toBe(true);
    } finally {
      mockResponseHeaders = {};
    }
  });

  it('rejects an upload whose declared content-length exceeds the cap', async () => {
    const state: { direction?: string; source?: unknown } = {};
    const cls = {
      bytesIn: () => ({ get: () => undefined, set: () => undefined }),
      request: () => ({ headers: { 'content-length': String(25 * 1024 * 1024 + 1) }, method: 'POST', raw: new Readable({ read() { this.push(null); } }) }),
      sourceDirection: () => ({ get: () => state.direction, set: (value: string) => { state.direction = value; } }),
      sourceStream: () => ({ get: () => state.source, set: (value: unknown) => { state.source = value; } }),
    } as never;
    const error: unknown = await openMediaSource(cls).catch((value: unknown) => value);
    expect(error).toMatchObject({ message: expect.stringContaining('exceeds') as string });
    expect(state.source).toBeUndefined();
  });

  it('lets an explicit EGRESS_ALLOWLIST fetch an otherwise-denied loopback host', async () => {
    vi.stubEnv('EGRESS_ALLOWLIST', '127.0.0.1');
    vi.resetModules();
    try {
      const { openMediaSource: open } = await import('./open-source.js');
      const harness = makeGetHarnessWith('http://127.0.0.1:8080/local.jpg');
      await open(harness.cls);
      expect(harness.state.direction).toBe('download');
      const offList = makeGetHarnessWith('http://127.0.0.2/local.jpg');
      const error: unknown = await open(offList.cls).catch((value: unknown) => value);
      expect(error).toMatchObject({ response: { code: 'SOURCE_HOST_NOT_ALLOWED' } });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('enforces EGRESS_ALLOWLIST when configured', async () => {
    vi.stubEnv('EGRESS_ALLOWLIST', 'cdn.example.com,fixture.local');
    vi.resetModules();
    try {
      const { openMediaSource: open } = await import('./open-source.js');
      const okHarness = makeGetHarnessWith('https://cdn.example.com/a.jpg');
      await open(okHarness.cls);
      expect(okHarness.state.direction).toBe('download');
      const subHarness = makeGetHarnessWith('https://img.cdn.example.com/a.jpg');
      await open(subHarness.cls);
      expect(subHarness.state.direction).toBe('download');
      const badHarness = makeGetHarnessWith('https://elsewhere.org/a.jpg');
      const error: unknown = await open(badHarness.cls).catch((value: unknown) => value);
      expect(error).toMatchObject({ response: { code: 'SOURCE_HOST_NOT_ALLOWED' } });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('caps an unsized upload mid-stream once it crosses the byte cap', async () => {
    vi.stubEnv('CLAMAV_MAX_BYTES', '1024');
    vi.resetModules();
    try {
      const { openMediaSource: open } = await import('./open-source.js');
      const raw = Readable.from([Buffer.alloc(2048, 1)]);
      const state: { source?: unknown } = {};
      const cls = {
        bytesIn: () => ({ get: () => undefined, set: () => undefined }),
        request: () => ({ headers: {}, method: 'POST', raw }),
        sourceDirection: () => ({ get: () => undefined, set: () => undefined }),
        sourceStream: () => ({ get: () => state.source, set: (value: unknown) => { state.source = value; } }),
      } as never;
      await open(cls);
      const capped = state.source as Readable;
      const error: unknown = await collect(capped).catch((value: unknown) => value);
      expect(error).toMatchObject({ message: expect.stringContaining('exceeds') as string });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
