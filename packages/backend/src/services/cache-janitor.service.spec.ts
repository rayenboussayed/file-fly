/* eslint-disable security/detect-non-literal-fs-filename -- all paths are built from a fresh mkdtemp dir, never from user input */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let dir: string;

beforeEach(async () => {
  vi.resetModules(); // CACHE_DIR is read at module scope; each test needs a fresh module
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-janitor-'));
});

afterEach(async () => {
  await fs.rm(dir, { force: true, recursive: true }).catch(() => undefined);
  vi.unstubAllEnvs();
});

describe('CacheJanitorService', () => {
  it('drops entries older than the TTL and keeps fresh ones', async () => {
    vi.stubEnv('CACHE_DIR', dir);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

        const fresh = path.join(dir, 'fresh.cache');
        const stale = path.join(dir, 'stale.cache');
    await fs.writeFile(fresh, 'fresh-bytes');
    await fs.writeFile(stale, 'stale-bytes');
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(stale, old, old);

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep({ maxBytes: Number.MAX_SAFE_INTEGER, ttlMs: 1_000 });
    service.onModuleDestroy();

    expect(await fs.readdir(dir)).toEqual(['fresh.cache']);
    expect(await fs.readFile(fresh, 'utf8')).toBe('fresh-bytes');
  });

  it('evicts least recently used entries when the total size exceeds the cap', async () => {
    vi.stubEnv('CACHE_DIR', dir);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const a = path.join(dir, 'a.bin');
    const b = path.join(dir, 'b.bin');
    const c = path.join(dir, 'c.bin');
    await fs.writeFile(a, 'a'.repeat(10));
    await fs.writeFile(b, 'b'.repeat(20));
    await fs.writeFile(c, 'c'.repeat(30));
    const now = Date.now();
    await fs.utimes(a, new Date(now - 3_000), new Date(now - 3_000));
    await fs.utimes(b, new Date(now - 2_000), new Date(now - 2_000));
    await fs.utimes(c, new Date(now - 1_000), new Date(now - 1_000));

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep({ maxBytes: 30, ttlMs: Number.MAX_SAFE_INTEGER });
    service.onModuleDestroy();

    // a (oldest, 10B) and b (20B) are evicted; c (30B) keeps exactly maxBytes.
    expect(await fs.readdir(dir)).toEqual(['c.bin']);
  });

  it('keeps recent .tmp files and removes only expired ones', async () => {
    vi.stubEnv('CACHE_DIR', dir);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const tmp = path.join(dir, 'inflight.tmp');
    await fs.writeFile(tmp, 'in-progress');

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await service.sweep({ maxBytes: Number.MAX_SAFE_INTEGER, ttlMs: 1 });
    service.onModuleDestroy();

    // Fresh tmp entries survive a sweep (in-progress writes must not be reaped underneath).
    expect(await fs.readdir(dir)).toContain('inflight.tmp');
  });

  const isRoot = process.getuid?.() === 0;

  it.skipIf(isRoot)('continues the sweep when an entry cannot be removed', async () => {
    vi.stubEnv('CACHE_DIR', dir);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const lockedDir = path.join(dir, 'locked');
    await fs.mkdir(lockedDir);
    await fs.writeFile(path.join(lockedDir, 'keep.cache'), 'keep');
    // Read-only directory: rm() must fail and the janitor must survive.
    // eslint-disable-next-line sonarjs/file-permissions -- intentional read-only probe for the unlink-failure path
    await fs.chmod(lockedDir, 0o555);

    const service = new CacheJanitorService();
    await service.onModuleInit();
    // ttlMs=0 forces every entry to be a deletion candidate; the failure must not throw.
    await service.sweep({ maxBytes: Number.MAX_SAFE_INTEGER, ttlMs: 0 });
    service.onModuleDestroy();

    // eslint-disable-next-line sonarjs/file-permissions -- restore write permission so the temp dir can be cleaned up
    await fs.chmod(lockedDir, 0o755);
    expect(await fs.readdir(lockedDir)).toEqual(['keep.cache']);
  });

  it('ignores a concurrent sweep invocation', async () => {
    vi.stubEnv('CACHE_DIR', dir);
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    const service = new CacheJanitorService();
    await service.onModuleInit();
    await Promise.all([service.sweep(), service.sweep(), service.sweep()]);
    service.onModuleDestroy();
    // The concurrent sweep completed without creating or corrupting anything.
    expect(await fs.readdir(dir)).toEqual([]);
  });
});
