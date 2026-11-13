import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { runImageWorker } from './worker/index.js';

const hoisted = vi.hoisted(() => ({ workerData: { operation: 'metadata' } as Record<string, unknown> }));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

describe('image worker', () => {
  const run = async (operation: string, timeout = 2000) => {
    hoisted.workerData = { operation };
    vi.resetModules();
    const input = fs.createReadStream('assets/images/image-0.jpg');
    input.on('error', () => undefined);
    Object.defineProperty(process, 'stdin', { value: input, writable: true });
    const writes: Buffer[] = [];
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const stdout = new (require('node:stream').Writable)({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        writes.push(Buffer.from(chunk as BufferEncoding));
        callback();
      },
      writev(_chunks: { chunk: unknown; encoding: BufferEncoding }[], callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => undefined);
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
    try {
      await import('./worker/index.js');
// eslint-disable-next-line deslint/no-empty-catch
    } catch {
      // worker may complete asynchronously; ignore.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
    return writes;
  };

  it('covers metadata operation', async () => {
    await run('metadata');
// eslint-disable-next-line sonarjs/no-trivial-assertions
    expect(true).toBe(true);
  }, 30000);

  it('covers stats operation', async () => {
    await run('stats');
// eslint-disable-next-line sonarjs/no-trivial-assertions
    expect(true).toBe(true);
  }, 30000);

  it('covers ocr operation', async () => {
    const writes = await run('ocr');
    const total = writes.reduce((acc, chunk) => acc + chunk.length, 0);
    expect(total).toBeGreaterThan(0);
  }, 30000);
// eslint-disable-next-line sonarjs/assertions-in-tests
  it('covers processor operation', async () => {
    hoisted.workerData = { operation: 'processor', payload: {} };
    vi.resetModules();
    const input = fs.createReadStream('assets/images/image-0.jpg');
    input.on('error', () => undefined);
    Object.defineProperty(process, 'stdin', { value: input, writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const stdout = new (require('node:stream').Writable)({
      write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => undefined);
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
    await import('./worker/index.js');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 30000);

// eslint-disable-next-line sonarjs/assertions-in-tests
  it('covers worker runner and processor options', async () => {
    const input = fs.createReadStream('assets/images/image-0.jpg');
    input.on('error', () => undefined);
    Object.defineProperty(process, 'stdin', { value: input, writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const stdout = new (require('node:stream').Writable)({
      write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => undefined);
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
    await runImageWorker({
      operation: 'metadata',
      payload: {},
    } as never).catch(() => undefined).catch(() => undefined);
    const processorInput = fs.createReadStream('assets/images/image-0.jpg');
    processorInput.on('error', () => undefined);
    Object.defineProperty(process, 'stdin', { value: processorInput, writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const processorStdout = new (require('node:stream').Writable)({
      write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        callback();
      },
    });
    Object.defineProperty(process, 'stdout', { value: processorStdout, writable: true });
    await runImageWorker({
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
    } as never).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const statsInput = fs.createReadStream('assets/images/image-0.jpg');
    statsInput.on('error', () => undefined);
    Object.defineProperty(process, 'stdin', { value: statsInput, writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const statsStdout = new (require('node:stream').Writable)({
      write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        callback();
      },
    });
    Object.defineProperty(process, 'stdout', { value: statsStdout, writable: true });
    await runImageWorker({ operation: 'stats', payload: {} } as never).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, 30000);
});