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
import type { Readable } from 'node:stream';

import { createHash } from 'node:crypto';
import { Readable as NodeReadable } from 'node:stream';

describe('WorkerService coverage branches', () => {
  beforeEach(async () => {
    await fs.rm('.cache-test/worker-cache', { force:true, recursive:true }).catch(() => undefined);
    await fs.mkdir('.cache-test/worker-cache', { recursive: true });
  });

  it('returns a worker without cache key, branch handling, and file branches', async () => {
    const source = new NodeReadable({ read() { this.push(null); } });
    const cls = {
      cacheKey: () => ({ get: () => undefined, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => source, set: (v: unknown) => v }),
    } as never;
    const service = new WorkerService(cls);
    const result = await service.createWorker('./m.js', { workerData: { a: 1 } });
    expect(result).toBeTruthy();
    await fs.rm('.cache-test/worker-cache', { force:true, recursive:true }).catch(()=>undefined);
    await fs.mkdir('.cache-test/worker-cache', { recursive: true });
    const baseKey = 'base-key';
    // trigger a cache hit using a real entry with deterministic path
    const digest = createHash('sha256').update(baseKey).update('\0').update('./m.js').update('\0').update(JSON.stringify(null)).digest('hex');
    const cachePath = `${process.env.CACHE_DIR}/${digest}`;
// eslint-disable-next-line security/detect-non-literal-fs-filename
    await fs.writeFile(cachePath, 'cached');
    const cls2 = {
      cacheKey: () => ({ get: () => baseKey, set: (v: unknown) => v }),
      request: () => ({ signal: new AbortController().signal }),
      sourceStream: () => ({ get: () => new NodeReadable({ read() { this.push(null); } }), set: (v: unknown) => v }),
    } as never;
    const service2 = new WorkerService(cls2);
    const cached = await service2.createWorker('./m.js');
    (cached as Readable).destroy();
    await fs.rm(cachePath, { force:true }).catch(()=>undefined);
  }, 15000);
});
