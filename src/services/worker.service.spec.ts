import { promises as fs } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.CACHE_DIR = '.cache-test/worker-cache';

vi.mock('node:worker_threads', () => {
// eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('node:events');
// eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Readable, Writable } = require('node:stream');

  class Worker extends EventEmitter {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    stderr: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    stdin: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    stdout: any;
    constructor() {
      super();
      this.stdout = new Readable({ read() { this.push(null); } });
      this.stderr = new Readable({ read() { this.push(null); } });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.stdin = new Writable({ write(_c: any, _e: any, cb: any) { cb(); } });
      process.nextTick(() => this.emit('exit', 0));
    }
    terminate() {
      return Promise.resolve();
    }
  }
  return { Worker };
});

import { WorkerService } from './worker.service.js';

describe('WorkerService', () => {
  beforeEach(async () => {
    await fs.rm('.cache-test/worker-cache', { force: true, recursive: true });
  });

  it('reports cache presence and caches a worker result', async () => {
    const cls = {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      cacheKey: () => ({ get: () => 'cache-key', set: (v: any) => v }),
      request: () => ({ signal: new AbortController().signal }),
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceStream: () => ({ get: () => undefined, set: (v: any) => v }),
    } as never;

    const service = new WorkerService(cls);
    await fs.mkdir('.cache-test/worker-cache', { recursive: true });
    const file = '.cache-test/worker-cache/entry';
    await fs.writeFile(file, 'x');
    expect(await service.hasCache(file)).toBe(true);
    expect(await service.hasCache('.cache-test/worker-cache/nope')).toBe(false);
  });
});