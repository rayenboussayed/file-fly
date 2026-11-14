import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const importEnvironment = () => {
  vi.resetModules();
  return import('./environment.js');
};

describe('environment', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('falls back to defaults for unset/blank cache vars', async () => {
    // Blank means unset for every cache var; missing ones fall back as well.
    vi.stubEnv('CACHE_DIR', '');
    vi.stubEnv('CACHE_TTL_MS', '');
    vi.stubEnv('CACHE_MAX_BYTES', '');
    vi.stubEnv('CACHE_SWEEP_INTERVAL_MS', '');
    vi.stubEnv('CACHE_TMP_MAX_AGE_MS', '');
    vi.stubEnv('TESSERACT_DIR', '');
    const { environment } = await importEnvironment();

    expect(environment.CACHE_DIR).toBe(path.resolve('cache'));
    expect(environment.CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(environment.CACHE_MAX_BYTES).toBe(2 * 1024 ** 3);
    expect(environment.CACHE_SWEEP_INTERVAL_MS).toBe(10 * 60 * 1000);
    expect(environment.CACHE_TMP_MAX_AGE_MS).toBe(60 * 60 * 1000);
    expect(environment.TESSERACT_DIR).toBe(
      path.join(path.resolve('cache'), 'tesseract'),
    );
  });

  it('falls back for blank and invalid numeric values', async () => {
    vi.stubEnv('CACHE_TTL_MS', '   ');
    vi.stubEnv('CACHE_MAX_BYTES', 'lots');
    vi.stubEnv('CACHE_SWEEP_INTERVAL_MS', '-1');
    vi.stubEnv('CACHE_TMP_MAX_AGE_MS', '0');
    const { environment } = await importEnvironment();

    expect(environment.CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    expect(environment.CACHE_MAX_BYTES).toBe(2 * 1024 ** 3);
    expect(environment.CACHE_SWEEP_INTERVAL_MS).toBe(10 * 60 * 1000);
    expect(environment.CACHE_TMP_MAX_AGE_MS).toBe(60 * 60 * 1000);
  });

  it('accepts valid numeric values', async () => {
    vi.stubEnv('CACHE_TTL_MS', '5000');
    vi.stubEnv('CACHE_MAX_BYTES', '1234');
    vi.stubEnv('CACHE_SWEEP_INTERVAL_MS', '750');
    vi.stubEnv('CACHE_TMP_MAX_AGE_MS', '250');
    const { environment } = await importEnvironment();

    expect(environment.CACHE_TTL_MS).toBe(5000);
    expect(environment.CACHE_MAX_BYTES).toBe(1234);
    expect(environment.CACHE_SWEEP_INTERVAL_MS).toBe(750);
    expect(environment.CACHE_TMP_MAX_AGE_MS).toBe(250);
  });

  it('derives TESSERACT_DIR from a custom CACHE_DIR', async () => {
    vi.stubEnv('CACHE_DIR', '.cache-test/env-cache');
    const { environment } = await importEnvironment();

    expect(environment.CACHE_DIR).toBe('.cache-test/env-cache');
    expect(environment.TESSERACT_DIR).toBe(
      path.join('.cache-test/env-cache', 'tesseract'),
    );
  });

  it('honours an explicit TESSERACT_DIR', async () => {
    vi.stubEnv('CACHE_DIR', '.cache-test/env-cache');
    vi.stubEnv('TESSERACT_DIR', '.cache-test/env-lang');
    const { environment } = await importEnvironment();

    expect(environment.TESSERACT_DIR).toBe('.cache-test/env-lang');
  });

  it('falls back to the derived TESSERACT_DIR for a blank override', async () => {
    vi.stubEnv('CACHE_DIR', '.cache-test/env-cache');
    vi.stubEnv('TESSERACT_DIR', '   ');
    const { environment } = await importEnvironment();

    expect(environment.TESSERACT_DIR).toBe(
      path.join('.cache-test/env-cache', 'tesseract'),
    );
  });
});
