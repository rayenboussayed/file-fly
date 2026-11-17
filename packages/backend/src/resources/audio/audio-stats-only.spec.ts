import fs from 'node:fs';
import { describe, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({ workerData: {} as Record<string, unknown> }));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

describe('audio stats only', () => {
// eslint-disable-next-line sonarjs/assertions-in-tests
  it('case', async () => {
    hoisted.workerData = { inputFormat: 'mp3', operation: 'stats' };
    vi.resetModules();
    const input = fs.createReadStream('assets/audios/audio-0.mp3');
    Object.defineProperty(process, 'stdin', { value: input, writable: true });
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const w = new (require('node:stream').Writable)({
      write(_c: unknown, _e: BufferEncoding, cb: (e?: Error | null) => void) {
        cb();
      },
    });
    Object.defineProperty(process, 'stdout', { value: w, writable: true });
    await import('./worker/index.js');
// eslint-disable-next-line promise/param-names
    await new Promise((r) => setTimeout(r, 1000));
  });
});
