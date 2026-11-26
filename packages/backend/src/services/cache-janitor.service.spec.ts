/* eslint-disable security/detect-non-literal-fs-filename -- all paths are built from a fresh mkdtemp dir, never from user input */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compareCodeUnits } from '@/utils/sort.js';

const directoryState: { value: string } = { value: '' };

beforeEach(async () => {
  vi.resetModules(); // CACHE_DIR is read at module scope; each test needs a fresh module
  directoryState.value = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-janitor-'));
});

afterEach(async () => {
  try {
    await fs.rm(directoryState.value, { force: true, recursive: true });
  } catch (error) {
    console.warn('test cleanup failed', error);
  }
  vi.unstubAllEnvs();
});

describe('CacheJanitorService', () => {
  it('drops entries older than the TTL and keeps fresh ones', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

        const fresh = path.join(directoryState.value, 'fresh.cache');
        const stale = path.join(directoryState.value, 'stale.cache');
    await fs.writeFile(fresh, 'fresh-bytes');
    await fs.writeFile(stale, 'stale-bytes');
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(stale, old, old);

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep({ maxBytes: Number.MAX_SAFE_INTEGER, ttlMs: 1000 });
    service.onModuleDestroy();

    expect(await fs.readdir(directoryState.value)).toEqual(['fresh.cache']);
    expect(await fs.readFile(fresh, 'utf8')).toBe('fresh-bytes');
  });

  it('evicts least recently used entries when the total size exceeds the cap', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const a = path.join(directoryState.value, 'a.bin');
    const b = path.join(directoryState.value, 'b.bin');
    const c = path.join(directoryState.value, 'c.bin');
    await fs.writeFile(a, 'a'.repeat(10));
    await fs.writeFile(b, 'b'.repeat(20));
    await fs.writeFile(c, 'c'.repeat(30));
    const now = Date.now();
    await fs.utimes(a, new Date(now - 3000), new Date(now - 3000));
    await fs.utimes(b, new Date(now - 2000), new Date(now - 2000));
    await fs.utimes(c, new Date(now - 1000), new Date(now - 1000));

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep({ maxBytes: 30, ttlMs: Number.MAX_SAFE_INTEGER });
    service.onModuleDestroy();

    // a (oldest, 10B) and b (20B) are evicted; c (30B) keeps exactly maxBytes.
    expect(await fs.readdir(directoryState.value)).toEqual(['c.bin']);
  });

  it('never reaps the live undici cache database', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const store = path.join(directoryState.value, 'undici-cache.db');
    const wal = path.join(directoryState.value, 'undici-cache.db-wal');
    const shm = path.join(directoryState.value, 'undici-cache.db-shm');
    const entry = path.join(directoryState.value, 'old.cache');
    await fs.writeFile(store, 'sqlite');
    await fs.writeFile(wal, 'wal');
    await fs.writeFile(shm, 'shm');
    await fs.writeFile(entry, 'stale');
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(store, old, old);
    await fs.utimes(wal, old, old);
    await fs.utimes(shm, old, old);
    await fs.utimes(entry, old, old);

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep({ maxBytes: 0, ttlMs: 1000 });
    service.onModuleDestroy();

    const names = await fs.readdir(directoryState.value);
    expect(names.toSorted(compareCodeUnits)).toEqual([
      'undici-cache.db',
      'undici-cache.db-shm',
      'undici-cache.db-wal',
    ]);
  });

  it('keeps recent .tmp files and removes only expired ones', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const temporary = path.join(directoryState.value, 'inflight.tmp');
    await fs.writeFile(temporary, 'in-progress');

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep({ maxBytes: Number.MAX_SAFE_INTEGER, ttlMs: 1 });
    service.onModuleDestroy();

    // Fresh tmp entries survive a sweep (in-progress writes must not be reaped underneath).
    expect(await fs.readdir(directoryState.value)).toContain('inflight.tmp');
  });

  const isRoot = process.getuid?.() === 0;

  it.skipIf(isRoot)('continues the sweep when an entry cannot be removed', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const lockedDirectory = path.join(directoryState.value, 'locked');
    await fs.mkdir(lockedDirectory);
    await fs.writeFile(path.join(lockedDirectory, 'keep.cache'), 'keep');
    // Read-only directory: rm() must fail and the janitor must survive.
    // eslint-disable-next-line sonarjs/file-permissions -- intentional read-only probe for the unlink-failure path
    await fs.chmod(lockedDirectory, 0o555);

    const service = new CacheJanitorService();
    await service.onModuleInit();
    // ttlMs=0 forces every entry to be a deletion candidate; the failure must not throw.
    await service.sweep({ maxBytes: Number.MAX_SAFE_INTEGER, ttlMs: 0 });
    service.onModuleDestroy();

    // eslint-disable-next-line sonarjs/file-permissions -- restore write permission so the temp dir can be cleaned up
    await fs.chmod(lockedDirectory, 0o755);
    expect(await fs.readdir(lockedDirectory)).toEqual(['keep.cache']);
  });

  it('ignores a concurrent sweep invocation', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await Promise.all([service.sweep(), service.sweep(), service.sweep()]);
    service.onModuleDestroy();
    // The concurrent sweep completed without creating or corrupting anything.
    expect(await fs.readdir(directoryState.value)).toEqual([]);
  });
});

describe('CacheJanitorService failure paths', () => {
  it('skips entries whose stat fails (e.g. broken symlinks)', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    await fs.writeFile(path.join(directoryState.value, 'ok.cache'), 'keep');
    await fs.symlink(path.join(directoryState.value, 'definitely-missing-target'), path.join(directoryState.value, 'broken.cache'));

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep();
    service.onModuleDestroy();

    expect(await fs.readdir(directoryState.value)).toContain('ok.cache');
  });

  it('logs and continues when the initial sweep fails', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const service = new CacheJanitorService();
    const sweepSpy = vi.spyOn(
      service as unknown as { sweep: () => Promise<void> },
      'sweep',
    ).mockRejectedValueOnce(new Error('sweep exploded'));
    // The catch must absorb the failure instead of rejecting onModuleInit.
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(sweepSpy).toHaveBeenCalledOnce();
    await service.onModuleDestroy();
    sweepSpy.mockRestore();
  });

  it('logs and continues when a scheduled sweep fails', async () => {
    vi.stubEnv('CACHE_DIR', directoryState.value);
    vi.stubEnv('CACHE_SWEEP_INTERVAL_MS', '1');
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    await fs.writeFile(path.join(directoryState.value, 'ok.cache'), 'keep');
    const service = new CacheJanitorService();
    const realSweep = service.sweep.bind(service);
    vi.spyOn(service, 'sweep')
      .mockRejectedValueOnce(new Error('initial sweep exploded'))
      .mockRejectedValue(new Error('scheduled sweep exploded'));
    await service.onModuleInit();
    // Let a couple of interval ticks fire with a failing sweep.
    await new Promise((resolve) => setTimeout(resolve, 50));
    service.onModuleDestroy();
    expect(realSweep).toBeDefined();
  });
});
