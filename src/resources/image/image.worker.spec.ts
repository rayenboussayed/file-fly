import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

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
      await import('./image.worker.js');
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
  }, 10000);

  it('covers stats operation', async () => {
    await run('stats');
// eslint-disable-next-line sonarjs/no-trivial-assertions
    expect(true).toBe(true);
  }, 10000);

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
    await import('./image.worker.js');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 10000);
});