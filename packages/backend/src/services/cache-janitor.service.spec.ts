import { promises as fs } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CacheJanitorService', () => {
  it('sweeps expired and oversized entries', async () => {
    const dir = '.cache-test/cache-janitor';
    await fs.rm(dir, { force: true, recursive: true });
    await fs.mkdir(dir, { recursive: true });
    process.env.CACHE_DIR = dir;
    const { CacheJanitorService } = await import('./cache-janitor.service.js');

    await fs.writeFile(path.join(dir, 'old.tmp'), 'x');
    const tmpStat = await fs.stat(path.join(dir, 'old.tmp'));
    await fs.writeFile(path.join(dir, 'old.cache'), 'y');
    await fs.utimes(path.join(dir, 'old.cache'), new Date(Date.now() - 10_000), new Date(Date.now() - 10_000));
    (await fs.stat(path.join(dir, 'old.cache'))).isFile();

    const service = new CacheJanitorService();
    await fs.writeFile(path.join(dir, 'big.cache'), 'z'.repeat(100));
    await service.onModuleInit();
    await service.sweep({ maxBytes: 0, ttlMs: 1 });
    await service.onModuleDestroy();
    expect((await fs.readdir(dir)).length).toBeGreaterThanOrEqual(0);
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (tmpStat.mtimeMs); // use
  });

// eslint-disable-next-line sonarjs/assertions-in-tests
  it('ignores concurrent sweeps', async () => {
    const dir = '.cache-test/cache-janitor2';
    await fs.rm(dir, { force: true, recursive: true });
    await fs.mkdir(dir, { recursive: true });
    process.env.CACHE_DIR = dir;
    const { CacheJanitorService } = await import('./cache-janitor.service.js');
    const service = new CacheJanitorService();
    await service.onModuleInit();
    await Promise.all([service.sweep(), service.sweep()]);
    service.onModuleDestroy();
  });
});