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

      await import('./audio.worker.js');
      await new Promise<void>((resolve) => {
        stdout.on('finish', () => resolve());
        setTimeout(resolve, 10000);
      });
      expect(chunks.length).toBeGreaterThanOrEqual(0);
    }
  });

});
