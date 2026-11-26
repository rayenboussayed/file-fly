/* eslint-disable security/detect-non-literal-fs-filename */

import type { Stats } from 'node:fs';

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';

import {
  CACHE_DIR,
  CACHE_MAX_BYTES,
  CACHE_SWEEP_INTERVAL_MS,
  CACHE_TMP_MAX_AGE_MS,
  CACHE_TTL_MS,
  UNDICI_CACHE_FILE,
} from '@/constants/fs.js';

interface Entry {
  file: string;
  mtimeMs: number;
  size: number;
}

/** Sidecars such as `-wal` and `-shm` share the store's file name as a prefix. */
const UNDICI_CACHE_PREFIX = UNDICI_CACHE_FILE;

/** Continuous cache maintenance: TTL, size cap (least-recently-used first), orphan cleanup. */
@Injectable()
export class CacheJanitorService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(CacheJanitorService.name);
  private sweeping = false;
  private timer?: NodeJS.Timeout;

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async onModuleInit() {
    await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    try {
      await this.sweep();
    } catch (e) {
      this.logger.error(e);
    }
    this.timer = setInterval(() => {
      void (async () => {
        try {
          await this.sweep();
        } catch (e) {
          this.logger.error(e);
        }
      })();
    }, CACHE_SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  async sweep({
    maxBytes = CACHE_MAX_BYTES,
    ttlMs = CACHE_TTL_MS,
  }: { maxBytes?: number; ttlMs?: number } = {}) {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const now = Date.now();
      const live: Entry[] = [];

      const names = (await fs.promises.readdir(CACHE_DIR)).filter(
        (name) => !name.startsWith(UNDICI_CACHE_PREFIX),
      );
      for (const name of names) {
        const file = path.join(CACHE_DIR, name);
        const stat = await safeStat(file);
        if (!stat?.isFile()) continue;
        const age = now - stat.mtimeMs;

        // mtime is refreshed on every cache hit (and while a tmp is written)
        const limit = name.endsWith('.tmp')
          ? CACHE_TMP_MAX_AGE_MS
          : ttlMs;
        if (age > limit) {
          await this.remove(file);
        } else if (!name.endsWith('.tmp')) {
          live.push({ file, mtimeMs: stat.mtimeMs, size: stat.size });
        }
      }

      let total = live.reduce((sum, e) => sum + e.size, 0);
      live.sort((a, b) => a.mtimeMs - b.mtimeMs);
      for (const entry of live) {
        if (total <= maxBytes) break;
        if (await this.remove(entry.file)) total -= entry.size;
      }
    } finally {
      this.sweeping = false;
    }
  }

  private async remove(file: string) {
    try {
      await fs.promises.rm(file, { force: true });
      return true;
    } catch (error) {
      this.logger.warn(`cannot remove ${file}: ${String(error)}`);
      return false;
    }
  }
}

/**
 * Stats a file without throwing when it is missing.
 * @param file - Absolute path to stat.
 * @returns The stat result, or undefined when the file cannot be read.
 */
async function safeStat(file: string): Promise<Stats | undefined> {
  try {
    return await fs.promises.stat(file);
  } catch {
    void 0;
    return undefined;
  }
}