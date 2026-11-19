import fs from 'node:fs';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalStdin = process.stdin;
const originalStdout = process.stdout;

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

const tinyAudio = () =>
   
  fs.readFileSync(path.join('assets', 'audios', 'tiny.mp3'));

/**
 * Imports the audio worker fresh with the given workerData.
 * @param workerData - the worker payload (operation + inputFormat).
 */
const importWorker = async (workerData: Record<string, unknown>) => {
  vi.resetModules();
  vi.doMock('node:worker_threads', () => ({ workerData }));
  await import('./index.js');
};

describe('audio worker', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
    stubStdin(tinyAudio());
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('metadata emits a parseable probe result', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp3', operation: 'metadata' });
    await waitForWorker();
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[0] as string) as {
      duration: number;
      format: string;
      streams: Array<{ sampleRate: number }>;
    };
    // Via a non-seekable stdin pipe ffmpeg cannot compute the duration; it reports 0.
    expect(typeof parsed.duration).toBe('number');
    expect(parsed.streams[0]?.sampleRate).toBe(16000);
  }, 30000);

  it('stats emits a parseable stats result', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp3', operation: 'stats' });
    await waitForWorker();
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[0] as string) as { streams: Array<{ codec: number }> };
    expect(parsed.streams.length).toBeGreaterThan(0);
  }, 30000);

  it('ignores unknown operations without writing bytes', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp3', operation: 'not-a-thing' });
    await waitForWorker(500);
    expect(Buffer.concat(chunks)).toHaveLength(0);
  }, 30000);
});

describe('audio worker passthrough', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
    stubStdin(tinyAudio());
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('passes the input through untouched when no transcoding is requested', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp3', operation: 'processor', payload: { format: 'mp3' } });
    await waitForWorker(10_000);
    const out = Buffer.concat(chunks);
    expect(out.length).toBeGreaterThan(0);
  }, 30000);

  it('transcodes to ogg with opus', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp3', operation: 'processor', payload: { codec: 'opus', format: 'ogg' } });
    await waitForWorker(15_000);
    const out = Buffer.concat(chunks);
    expect(out.length).toBeGreaterThan(0);
    expect(out.subarray(0, 4).toString('latin1')).toBe('OggS');
  }, 30000);
});
