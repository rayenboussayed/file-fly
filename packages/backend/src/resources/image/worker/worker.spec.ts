import { Readable, Writable } from 'node:stream';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalStdin = process.stdin;
const originalStdout = process.stdout;

/**
 * Creates a tiny synthetic JPEG for worker stdin.
 * @returns The encoded JPEG bytes.
 */
const createTinyJpeg = async (): Promise<Buffer> => sharp({
  create: { background: { b: 30, g: 60, r: 90 }, channels: 3, height: 16, width: 24 },
})
  .jpeg()
  .toBuffer();

const stubStdin = (bytes: Buffer) => {
  Object.defineProperty(process, 'stdin', { value: Readable.from([bytes]), writable: true });
};

const stubStdout = (): Buffer[] => {
  const chunks: Buffer[] = [];
  const stdout = new Writable({
    write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      chunks.push(Buffer.from(chunk as Buffer));
      callback();
    },
  });
  Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
  return chunks;
};

const waitForWorker = (ms = 4000) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Imports the image worker fresh with the given workerData.
 * @param workerData - the worker payload (operation).
 */
const importWorker = async (workerData: Record<string, unknown>) => {
  vi.resetModules();
  vi.doMock('node:worker_threads', () => ({ workerData }));
  await import('./index.js');
};

describe('image worker', () => {
  beforeEach(async () => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
    stubStdin(await createTinyJpeg());
  });

  afterEach(() => {
    Object.defineProperties(process, {
      stdin: { value: originalStdin, writable: true },
      stdout: { value: originalStdout, writable: true },
    });
    vi.unstubAllEnvs();
  });

  it('metadata emits the sharp metadata JSON', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'jpeg', operation: 'metadata' });
    await waitForWorker();
    const out = Buffer.concat(chunks).toString('utf8');
    const parsed = JSON.parse(out) as { format: string; height: number; width: number; };
    expect(parsed.width).toBe(24);
    expect(parsed.height).toBe(16);
    expect(parsed.format).toBe('jpeg');
  }, 30_000);

  it('stats emits the sharp stats JSON', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'jpeg', operation: 'stats' });
    await waitForWorker();
    const out = Buffer.concat(chunks).toString('utf8');
    const parsed = JSON.parse(out) as { channels: Array<{ mean: number }> };
    expect(parsed.channels.length).toBeGreaterThan(0);
  }, 30_000);

  it('ignores unknown operations without writing bytes', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'jpeg', operation: 'not-a-thing' });
    await waitForWorker(500);
    expect(Buffer.concat(chunks)).toHaveLength(0);
  }, 30_000);
});
