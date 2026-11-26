import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = () =>
  fs.readFileSync(path.join('assets', 'models', 'tiny.glb'));

describe('model worker', () => {
  const originalStdout = process.stdout;

  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  const runWorker = async (workerData: { operation: string; payload: { buffer: Buffer; query: { compress: 'draco' | 'meshopt' | 'none'; simplify: number; weld: boolean } } }) => {
    vi.resetModules();
    vi.doMock('node:worker_threads', () => ({ workerData }));
    const writes: Buffer[] = [];
    const { Writable } = await import('node:stream');
    const stdout = new Writable({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        writes.push(Buffer.from(chunk as Buffer));
        callback();
      },
      writev(_chunks: { chunk: unknown; encoding: BufferEncoding }[], callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => {});
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

    await import('./index.js');
    await new Promise((resolve) => {
      setTimeout(resolve, 4000);
    });
    return writes;
  };

  it('builds a valid GLB with meshopt compression', async () => {
    const writes = await runWorker({
      operation: 'optimize',
      payload: { buffer: fixture(), query: { compress: 'meshopt', simplify: 1, weld: true } },
    });
    const buffer = Buffer.concat(writes);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('glTF');
  }, 30_000);

  it('builds a valid GLB with draco compression', async () => {
    const writes = await runWorker({
      operation: 'optimize',
      payload: { buffer: fixture(), query: { compress: 'draco', simplify: 1, weld: false } },
    });
    const buffer = Buffer.concat(writes);
    expect(buffer.subarray(0, 4).toString('latin1')).toBe('glTF');
  }, 30_000);

  it('ignores unknown operations without writing bytes', async () => {
    const writes = await runWorker({
      operation: 'not-a-thing',
      payload: { buffer: fixture(), query: { compress: 'meshopt', simplify: 1, weld: true } },
    });
    expect(writes).toHaveLength(0);
  }, 30_000);
});
