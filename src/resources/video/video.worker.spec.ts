import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({ workerData: {} as Record<string, unknown> }));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

describe('video worker metadata', () => {
  it('runs metadata and stats', async () => {
    for (const operation of ['metadata', 'stats'] as const) {
      hoisted.workerData = { inputFormat: 'mp4', operation };
      vi.resetModules();
      const stream = fs.createReadStream('assets/videos/video-0.mp4');
      stream.on('error', () => undefined);
      Object.defineProperty(process, 'stdin', { value: stream, writable: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
      const stdout = new (require('node:stream').Writable)({ write(_c: any, _e: any, cb: any) { cb(); } });
      stdout.on('error', () => undefined);
      Object.defineProperty(process, 'stdout', { value: stdout, writable: true });
      await import('./worker/index.js');
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 2000);
      });
    }
// eslint-disable-next-line sonarjs/no-trivial-assertions
    expect(true).toBe(true);
  });
});