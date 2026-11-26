import { Readable, Writable } from 'node:stream';
import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';

// The worker module runs startImageWorker() at import time; with no operation
// in workerData the dispatch is a deterministic no-op. Tests below call
// runImageWorker explicitly with their own operation payload.
vi.mock('node:worker_threads', () => ({ workerData: {} }));

import { runImageWorker } from './worker/index.js';

/**
 * Creates a tiny synthetic JPEG (64x48, blue with a white 16x16 square): large
 * enough for every sharp operation in the worker, small enough to keep the
 * suite fast and deterministic.
 * @returns The encoded JPEG bytes.
 */
const createTinyJpeg = async (): Promise<Buffer> => {
  const square = await sharp({
    create: { background: { b: 255, g: 255, r: 255 }, channels: 3, height: 16, width: 16 },
  }).jpeg().toBuffer();
  return sharp({
    create: { background: { b: 200, g: 120, r: 20 }, channels: 3, height: 48, width: 64 },
  })
    .composite([{ input: square, left: 8, top: 8 }])
    .jpeg()
    .toBuffer();
};

/**
 * A capturing stdout Writable: `writes` accumulates chunks, `finished` resolves on `end`.
 * @returns The writes, the sink and the completion promise.
 */
const capturingStdout = () => {
  const writes: Buffer[] = [];
  const stdout = new Writable({
    write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      writes.push(Buffer.from(chunk as Buffer));
      callback();
    },
  });
  const finished = new Promise<void>((resolve) => {
    stdout.on('finish', resolve);
    stdout.on('error', resolve);
  });
  return { finished, stdout, writes };
};

/**
 * Points stdin/stdout at the tiny fixture and a capturing sink, then runs the worker with explicit data.
 * @param data - Worker-thread data (`operation` and optional payload) passed to the worker.
 * @returns The captured stdout chunks.
 */
const run = async (data: Record<string, unknown>) => {
  Object.defineProperty(process, 'stdin', { value: Readable.from(await createTinyJpeg()), writable: true });
  const cap = capturingStdout();
  Object.defineProperty(process, 'stdout', { value: cap.stdout, writable: true });
  await runImageWorker(data as never);
  await Promise.race([cap.finished, new Promise<void>((resolve) => { setTimeout(resolve, 30_000); })]);
  return cap.writes;
};

describe('image worker', () => {
  it('covers metadata operation', async () => {
    const writes = await run({ operation: 'metadata' });
    const parsed = JSON.parse(Buffer.concat(writes).toString('utf8')) as {
      format: string;
      height: number;
      width: number;
    };
    expect(parsed.width).toBe(64);
    expect(parsed.height).toBe(48);
    expect(parsed.format).toBe('jpeg');
  }, 30_000);

  it('covers stats operation', async () => {
    const writes = await run({ operation: 'stats' });
    const parsed = JSON.parse(Buffer.concat(writes).toString('utf8')) as {
      channels: Array<{ mean: number; stdev: number }>;
      entropy: number;
    };
    expect(parsed.channels.length).toBeGreaterThan(0);
    expect(typeof parsed.channels[0]?.mean).toBe('number');
    expect(typeof parsed.entropy).toBe('number');
  }, 30_000);

  it('covers processor operation and emits a jpeg', async () => {
    const writes = await run({ operation: 'processor', payload: { format: 'jpeg', height: 24, width: 32 } });
    expect(writes.length).toBeGreaterThan(0);
    expect(Buffer.concat(writes).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  }, 30_000);

  it('covers the worker runner and every processor option', async () => {
    const processorWrites = await run({
      operation: 'processor',
      payload: {
        background: '#fff',
        blur: 1,
        fit: 'cover',
        flip: true,
        flop: true,
        format: 'jpeg',
        greyscale: true,
        height: 32,
        kernel: 'lanczos3',
        median: 3,
        negate: true,
        normalize: true,
        position: 'centre',
        quality: 80,
        rotate: 90,
        sharpen: 1,
        threshold: 10,
        tint: '#f00',
        trim: true,
        width: 32,
        withoutEnlargement: true,
        withoutReduction: true,
      },
    });
    expect(processorWrites.length).toBeGreaterThan(0);
    expect(Buffer.concat(processorWrites).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));

    const statsWrites = await run({ operation: 'stats' });
    const parsed = JSON.parse(Buffer.concat(statsWrites).toString('utf8')) as {
      channels: unknown[];
    };
    expect(parsed.channels.length).toBeGreaterThan(0);
  }, 60_000);
});
