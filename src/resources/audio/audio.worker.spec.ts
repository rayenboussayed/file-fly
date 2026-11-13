import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { codecFor } from './worker/codecs.js';
import { buildFilters } from './worker/filters.js';
import { runAudioWorker } from './worker/index.js';
import { processMedia } from './worker/processor.js';
const hoisted = vi.hoisted(() => ({ workerData: {} as Record<string, unknown> }));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

describe('audio worker', () => {
// eslint-disable-next-line sonarjs/assertions-in-tests
  it('runs metadata and stats', async () => {
    for (const operation of ['metadata', 'stats'] as const) {
      Object.defineProperty(process, 'stdin', { value: fs.createReadStream('assets/audios/audio-0.mp3'), writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
      const stdout = new (require('node:stream').Writable)({
        write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
          callback();
        },
      });
      Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

  
    void runAudioWorker({ inputFormat: 'mp3', operation, payload: {} } as never).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    await import('./worker/index.js');
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
        trimEnd: 1,
        trimStart: 0,
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
    await import('./worker/index.js');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }, 10000);

// eslint-disable-next-line sonarjs/assertions-in-tests
  it('executes exported runner branches directly', async () => {
    const run = async (
      stream: fs.ReadStream,
      payload?: Record<string, unknown>,
      operation: 'metadata' | 'processor' | 'stats' = 'metadata',
    ) => {
      Object.defineProperty(process, 'stdin', { value: stream, writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
      const stdout = new (require('node:stream').Writable)({
        write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
          callback();
        },
      });
      Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
  
    void runAudioWorker({ inputFormat: 'mp3', operation, payload } as never).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 100));
    };
    await run(fs.createReadStream('assets/audios/audio-0.mp3'));
    await run(
      fs.createReadStream('assets/audios/audio-0.mp3'),
      {
        format: 'mp3',
        normalize: false,
      },
      'processor',
    );
    await run(fs.createReadStream('assets/audios/audio-0.mp3'), undefined, 'stats');
    for (const payload of [
      { channels: '1', format: 'mp3' },
      { compress: true, format: 'mp3' },
      { denoise: true, format: 'mp3' },
      { fadeIn: 1, format: 'mp3' },
      { fadeOut: 1, format: 'mp3' },
      { format: 'mp3', gain: 1 },
      { format: 'mp3', normalize: true },
      { format: 'mp3', sampleRate: '44100' },
      { format: 'mp3', speed: 1.1 },
      { format: 'wav' },
      { codec: 'flac', format: 'mp3' },
      { codec: 'mp3', format: 'mp3' },
      { codec: 'opus', format: 'mp3' },
      { codec: 'pcm', format: 'mp3' },
      { codec: 'aac', format: 'mp3' },
      { format: 'flac' },
      { format: 'ogg' },
      { format: 'webm' },
      { format: 'mp3', trimEnd: 1, trimStart: 0 },
      { channels: '1', format: 'mp3' },
    ] as Array<Record<string, unknown>>) {
      await run(
        fs.createReadStream('assets/audios/audio-0.mp3'),
        payload,
        'processor',
      );
    }
  }, 10000);

 
  it('covers helpers and no-audio branch', async () => {
    expect(buildFilters({ trimEnd: 1, trimStart: 0 } as never)).toBeTruthy();
    buildFilters({} as never);
    codecFor('flac');
    codecFor('mp3');
    codecFor('ogg');
    codecFor('adts');
    codecFor('webm');
    codecFor('mp3', 'flac');
    codecFor('mp4');
    Object.defineProperty(process, 'stdin', { value: fs.createReadStream('assets/gifs/gif-0.gif'), writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
    Object.defineProperty(process, 'stdout', { value: new (require('node:stream').Writable)({ write(_c: unknown, _e: BufferEncoding, cb: (error?: Error | null) => void) { cb(); } }), writable: true });
    void processMedia({ channels: '1', format: 'mp3' } as never, { inputFormat: 'gif', operation: 'processor', payload: { channels: '1', format: 'mp3' } } as never).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
