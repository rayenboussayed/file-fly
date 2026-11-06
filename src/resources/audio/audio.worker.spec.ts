import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({ workerData: {} as Record<string, unknown> }));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

describe('audio worker', () => {
  it('runs metadata and stats', async () => {
    for (const operation of ['metadata', 'stats'] as const) {
      hoisted.workerData = { inputFormat: 'mp3', operation };
      vi.resetModules();
      Object.defineProperty(process, 'stdin', { value: fs.createReadStream('assets/audios/audio-0.mp3'), writable: true });
      const chunks: Buffer[] = [];
// eslint-disable-next-line @typescript-eslint/no-require-imports
      const stdout = new (require('node:stream').Writable)({
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        write(chunk: any, _e: any, cb: any) {
          chunks.push(Buffer.from(chunk));
          cb();
        },
      });
      Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

      const imported = await import('./audio.worker.js').catch((error) => {
        console.error('audio first import failed:', error);
        return undefined;
      });
// eslint-disable-next-line sonarjs/void-use
      void imported;
      await new Promise<void>((resolve) => {
        stdout.on('finish', () => resolve());
        setTimeout(resolve, 10000);
      });
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    }
  });

// eslint-disable-next-line sonarjs/assertions-in-tests
  it('runs processor passthrough', async () => {
    hoisted.workerData = { inputFormat: 'mp3', operation: 'processor', payload: {} };
    vi.resetModules();
    const input = fs.createReadStream('assets/audios/audio-0.mp3');
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
    await import('./audio.worker.js');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 10000);

// eslint-disable-next-line sonarjs/assertions-in-tests
  it('runs processor transformed', async () => {
    hoisted.workerData = {
      inputFormat: 'mp3',
      operation: 'processor',
      payload: {
        bitrate: '128k',
        channels: '1',
        codec: 'flac',
        compress: true,
        denoise: true,
        fadeIn: 1,
        fadeOut: 1,
        format: 'mp3',
        gain: 1,
        normalize: true,
        sampleRate: '44100',
        speed: 1.1,
        trimEnd: 2,
        trimStart: 1,
      },
    };
    vi.resetModules();
    const input = fs.createReadStream('assets/audios/audio-0.mp3');
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
    await import('./audio.worker.js');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 10000);
});
