import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

let lastBody: Readable | undefined;
vi.mock('undici', () => ({
  request: vi.fn(async () => {
    lastBody = Readable.from([Buffer.from('remote-'), Buffer.from('bytes')]);
    return { body: lastBody };
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
    expect(state.source).toBe(raw);
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
});
