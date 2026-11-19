import sharp from 'sharp';
import { Readable, Writable } from 'node:stream';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImageProcessorType } from '../schema.js';

import { Processor } from './processor.js';

const originalStdin = process.stdin;
const originalStdout = process.stdout;

const stubStdio = async (input: Buffer): Promise<() => Promise<Buffer>> => {
  const chunks: Buffer[] = [];
  const stdout = new Writable({
    write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      chunks.push(Buffer.from(chunk as Buffer));
      callback();
    },
  });
  Object.defineProperty(process, 'stdin', { value: Readable.from([input]), writable: true });
  Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
  return async () => {
    // drain: close stdout by ending the transformer pipeline
    stdout.emit('finish');
    return Buffer.concat(chunks);
  };
};

const fixture = async (): Promise<Buffer> => {
  const pixels = Buffer.alloc(16 * 16 * 3, 0x7f);
  return sharp(pixels, { raw: { channels: 3, height: 16, width: 16 } }).png().toBuffer();
};

const payload = (overrides: Partial<ImageProcessorType>): ImageProcessorType =>
  ({ format: 'png', ...overrides }) as ImageProcessorType;

describe('Processor', () => {
  beforeEach(async () => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('round-trips a plain png transform', async () => {
    const input = await fixture();
    const drain = await stubStdio(input);
    await new Processor().process(payload({}));
    const out = await drain();
    expect(out.subarray(0, 4).toString('latin1')).toContain('\x89PNG');
  });

  it('applies the full flag matrix without failing', async () => {
    const input = await fixture();
    const drain = await stubStdio(input);
    await new Processor().process(
      payload({
        blur: 2,
        fit: 'cover',
        flop: true,
        flip: true,
        greyscale: true,
        kernel: 'nearest',
        median: 3,
        negate: true,
        normalize: true,
        position: 'centre',
        rotate: 90,
        sharpen: 2,
        threshold: 128,
        tint: { b: 10, g: 20, r: 30 },
        trim: true,
        width: 8,
        height: 8,
      }),
    );
    const out = await drain();
    expect(out.subarray(0, 4).toString('latin1')).toContain('\x89PNG');
  });

  it('encodes jpeg and webp outputs', async () => {
    const input = await fixture();
    const drainJpg = await stubStdio(input);
    await new Processor().process(payload({ format: 'jpeg', quality: 70 }));
    const jpg = await drainJpg();
    expect(jpg.subarray(0, 2).toString('hex')).toBe('ffd8');

    const drainWebp = await stubStdio(input);
    await new Processor().process(payload({ format: 'webp' }));
    const webp = await drainWebp();
    expect(webp.subarray(0, 4).toString('latin1')).toBe('RIFF');
  });

  it('rejects an invalid payload without writing output bytes', async () => {
    const input = await fixture();
    const chunks: Buffer[] = [];
    const stdout = new Writable({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        chunks.push(Buffer.from(chunk as Buffer));
        callback();
      },
    });
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

    await expect(
      new Processor().process({ format: 'definitely-not-a-format' } as never),
    ).rejects.toThrow();
    expect(chunks).toHaveLength(0);
  });
});
