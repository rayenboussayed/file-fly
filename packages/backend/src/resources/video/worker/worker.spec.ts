import fs from 'node:fs';
import path from 'node:path';
import { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tinyVideo = () =>
   
  fs.readFileSync(path.join('assets', 'videos', 'tiny.mp4'));

const originalStdin = process.stdin;
const originalStdout = process.stdout;

/**
 * Replaces process.stdin with a replay of the tiny fixture.
 * @param bytes
 */
/**
 * Replaces process.stdin with a replay of the fixture.
 * @param bytes - Bytes to replay (defaults to the tiny video fixture).
 */
const stubStdin = (bytes: Buffer = tinyVideo()) => {
  Object.defineProperty(process, 'stdin', { value: Readable.from([bytes]), writable: true });
};

/**
 * Replaces process.stdout with a sink; returns the collected chunks.
 * @returns The collected stdout chunks.
 */
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

const waitForWorker = (ms = 5000) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Imports the worker module fresh with the given workerData.
 * @param workerData - The worker payload (operation + inputFormat).
 */
const importWorker = async (workerData: Record<string, unknown>) => {
  vi.resetModules();
  vi.doMock('node:worker_threads', () => ({ workerData }));
  await import('./index.js');
};

describe('video worker', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0'); // run in-process; finishWorker is a no-op
    stubStdin();
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('metadata emits a parseable probe result', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'metadata' });
    await waitForWorker();
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[0] as string) as {
      duration: number;
      format: string;
      streams: Array<{ codec: number }>;
    };
    expect(parsed.format).toContain('mov');
    expect(parsed.duration).toBeGreaterThan(0);
    expect(parsed.streams.length).toBeGreaterThan(0);
  }, 30000);

  it('stats emits a parseable stats result', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'stats' });
    await waitForWorker();
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[0] as string) as {
      streams: Array<{ codec: number; height: number; width: number; }>;
    };
    expect(parsed.streams.some((stream) => stream.height === 120)).toBe(true);
  }, 30000);

  it('dna emits a PDQ hash sequence', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'dna' });
    await waitForWorker(10_000);
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[0] as string) as { algorithm: string; fps: number; frames: unknown[]; };
    expect(parsed.algorithm).toBe('vid-pdq');
    expect(parsed.fps).toBe(2);
    expect(parsed.frames.length).toBeGreaterThan(0);
  }, 30000);

  it('screenshot emits a multipart stream containing a JPEG frame', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'screenshot', payload: { frames: [0] } });
    await waitForWorker(10_000);
    const out = Buffer.concat(chunks);
    expect(out.length).toBeGreaterThan(100);
    // JPEG SOI marker must appear somewhere in the multipart stream.
    expect(out.includes(Buffer.from([0xff, 0xd8]))).toBe(true);
  }, 30000);

  it('processor transcodes to fragmented mp4', async () => {
    const chunks = stubStdout();
    await importWorker({
      inputFormat: 'mp4',
      operation: 'processor',
      payload: { bitrate: '512k', codec: 'h264', format: 'mp4' },
    });
    await waitForWorker(15_000);
    const out = Buffer.concat(chunks);
    expect(out.length).toBeGreaterThan(0);
    expect(out.subarray(0, 8).toString('latin1')).toContain('ftyp');
  }, 30000);

  it('audio extracts an mp3 stream from a video', async () => {
    const chunks = stubStdout();
    await importWorker({
      inputFormat: 'mp4',
      operation: 'audio',
      payload: { format: 'mp3' },
    });
    await waitForWorker(15_000);
    const out = Buffer.concat(chunks);
    expect(out.length).toBeGreaterThan(100);
    // MP3 starts with an ID3 tag or an MPEG frame sync.
    const magic = out.subarray(0, 3).toString('latin1');
    const second = out.at(1) ?? 0;
    const frameSync = out.at(0) === 0xff && (second & 0xe0) === 0xe0;
    expect(magic === 'ID3' || frameSync).toBe(true);
  }, 30000);

  it('ignores unknown operations without writing bytes', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'not-a-thing' });
    await waitForWorker(500);
    expect(Buffer.concat(chunks)).toHaveLength(0);
  }, 30000);
});

describe('video worker processMedia matrix', () => {
  const runProcessor = async (payload: Record<string, unknown>) => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'processor', payload });
    await waitForWorker(15_000);
    return Buffer.concat(chunks);
  };

  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
    stubStdin();
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('transcodes to webm (non-mp4 container path)', async () => {
    const out = await runProcessor({ codec: 'vp9', format: 'webm' });
    // EBML magic
    expect(out.subarray(0, 4).toString('hex')).toBe('1a45dfa3');
  }, 30000);

  it('transcodes both video and audio tracks (opus encoder path)', async () => {
    const out = await runProcessor({
      audioBitrate: '128k',
      audioCodec: 'opus',
      codec: 'h264',
      format: 'matroska',
    });
    // EBML magic
    expect(out.subarray(0, 4).toString('hex')).toBe('1a45dfa3');
  }, 30000);

  it('transcodes only audio when video passes through', async () => {
    const out = await runProcessor({ audioBitrate: '128k', format: 'mp4' });
    expect(out.subarray(0, 8).toString('latin1')).toContain('ftyp');
  }, 30000);

  it('applies trim and fps filters through the full pipeline', async () => {
    const out = await runProcessor({
      format: 'mp4',
      fps: 5,
      trimEnd: 1,
      trimStart: 0.2,
    });
    expect(out.subarray(0, 8).toString('latin1')).toContain('ftyp');
  }, 30000);

  it('encodes with the vp9 encoder constant', async () => {
    const out = await runProcessor({
      codec: 'vp9',
      format: 'mp4',
    });
    expect(out.subarray(0, 8).toString('latin1')).toContain('ftyp');
  }, 30000);
});

describe('dna edge cases', () => {
  it('fails cleanly on an audio-only input (NO_VIDEO_STREAM)', async () => {
    vi.resetModules();
    vi.doMock('node:worker_threads', () => ({
      workerData: { inputFormat: 'mp3', operation: 'dna' },
    }));
    const chunks = stubStdout();
    stubStdin(fs.readFileSync(path.join('assets', 'audios', 'tiny.mp3')));
    await import('./index.js');
    await new Promise((resolve) => setImmediate(resolve));
    await waitForWorker(4000);
    // In in-process mode the worker swallows the error; the parent only sees
    // it through a non-zero exit code (standalone) or no bytes here.
    expect(Buffer.concat(chunks)).toHaveLength(0);
  }, 30000);
});

describe('dna trim fallback', () => {
  it('falls back to untrimmed bytes when the trim produces a sub-64px frame', async () => {
    const chunks = stubStdout();
    stubStdin(fs.readFileSync(path.join('assets', 'videos', 'tiny32.mp4')));
    vi.resetModules();
    vi.doMock('node:worker_threads', () => ({
      workerData: { inputFormat: 'mp4', operation: 'dna' },
    }));
    await import('./index.js');
    await new Promise((resolve) => setImmediate(resolve));
    await waitForWorker(4000);
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    const parsed = JSON.parse(lines[0] as string) as { algorithm: string; frames: unknown[] };
    expect(parsed.algorithm).toBe('vid-pdq');
    expect(parsed.frames.length).toBeGreaterThan(0);
  }, 30000);
});

describe('video worker processMedia passthrough', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
    stubStdin();
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('passes the input through untouched when no transcoding is requested', async () => {
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'processor', payload: { format: 'mp4' } });
    await waitForWorker(10_000);
    const out = Buffer.concat(chunks);
    expect(out.subarray(0, 8).toString('latin1')).toContain('ftyp');
  }, 30000);
});

describe('processMedia direct calls', () => {
  it('rejects an unsupported output format', async () => {
    stubStdin();
    stubStdout();
    const { processMedia } = await import('./processor.js');
    await expect(processMedia({ format: 'bogus' } as never)).rejects.toThrow('Streaming output does not support format: bogus');
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
  });

  it('defaults to fragmented mp4 when format is omitted', async () => {
    stubStdin();
    const chunks = stubStdout();
    await importWorker({ inputFormat: 'mp4', operation: 'processor', payload: {} });
    await waitForWorker(10_000);
    const out = Buffer.concat(chunks);
    expect(out.subarray(0, 8).toString('latin1')).toContain('ftyp');
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
  }, 30000);
});

describe('video worker screenshot edge cases', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
    stubStdin();
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdin', { value: originalStdin, writable: true });
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('fails cleanly when no frames are requested', async () => {
    const chunks = stubStdout();
    stubStdin();
    await importWorker({ inputFormat: 'mp4', operation: 'screenshot', payload: { frames: [] } });
    await waitForWorker(4000);
    expect(Buffer.concat(chunks)).toHaveLength(0);
  }, 30000);

  it('fails cleanly on an audio-only input (no video stream to decode)', async () => {
    const chunks = stubStdout();
    stubStdin(fs.readFileSync(path.join('assets', 'audios', 'tiny.mp3')));
    await importWorker({ inputFormat: 'mp3', operation: 'screenshot', payload: { frames: [0] } });
    await waitForWorker(4000);
    expect(Buffer.concat(chunks)).toHaveLength(0);
  }, 30000);
});
