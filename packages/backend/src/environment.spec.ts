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
    vi.stubEnv('CACHE_TTL_MS', ' '.repeat(3));
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

  it('leaves CLAMAV_* unset and applies clamav defaults', async () => {
    // No CLAMAV_* vars stubbed: host/port stay undefined, size/timeout get defaults.
    vi.stubEnv('CLAMAV_HOST', undefined);
    vi.stubEnv('CLAMAV_PORT', undefined);
    vi.stubEnv('CLAMAV_MAX_BYTES', undefined);
    vi.stubEnv('CLAMAV_TIMEOUT_MS', undefined);
    const { environment } = await importEnvironment();

    expect(environment.CLAMAV_HOST).toBeUndefined();
    expect(environment.CLAMAV_PORT).toBeUndefined();
    expect(environment.CLAMAV_MAX_BYTES).toBe(25 * 1024 ** 2);
    expect(environment.CLAMAV_MAX_BYTES).toBe(26_214_400);
    expect(environment.CLAMAV_TIMEOUT_MS).toBe(60_000);
  });

  it('accepts valid CLAMAV_* values', async () => {
    vi.stubEnv('CLAMAV_HOST', 'clamd.test.invalid');
    vi.stubEnv('CLAMAV_PORT', '3310');
    vi.stubEnv('CLAMAV_TIMEOUT_MS', '1234');
    vi.stubEnv('CLAMAV_MAX_BYTES', '2048');
    const { environment } = await importEnvironment();

    expect(environment.CLAMAV_HOST).toBe('clamd.test.invalid');
    expect(environment.CLAMAV_PORT).toBe(3310);
    expect(environment.CLAMAV_TIMEOUT_MS).toBe(1234);
    expect(environment.CLAMAV_MAX_BYTES).toBe(2048);
  });

  it('rejects an invalid CLAMAV_PORT loudly', async () => {
    vi.stubEnv('CLAMAV_PORT', 'abc');
    await expect(importEnvironment()).rejects.toThrow();
  });

  it('rejects an out-of-range CLAMAV_PORT loudly', async () => {
    vi.stubEnv('CLAMAV_PORT', '70000');
    await expect(importEnvironment()).rejects.toThrow();
  });

  it('leaves LOG_LEVEL unset and accepts a valid level', async () => {
    vi.stubEnv('LOG_LEVEL', '');
    const unset = await importEnvironment();
    expect(unset.environment.LOG_LEVEL).toBeUndefined();

    vi.stubEnv('LOG_LEVEL', 'warn');
    const set = await importEnvironment();
    expect(set.environment.LOG_LEVEL).toBe('warn');
  });

  it('rejects an invalid LOG_LEVEL', async () => {
    vi.stubEnv('LOG_LEVEL', 'chatty');
    await expect(importEnvironment()).rejects.toThrow();
  });

  it('falls back to the derived TESSERACT_DIR for a blank override', async () => {
    vi.stubEnv('CACHE_DIR', '.cache-test/env-cache');
    vi.stubEnv('TESSERACT_DIR', ' '.repeat(3));
    const { environment } = await importEnvironment();

    expect(environment.TESSERACT_DIR).toBe(
      path.join('.cache-test/env-cache', 'tesseract'),
    );
  });
});

describe('environment CORS_ORIGIN', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is unset when only whitespace is given', async () => {
    vi.stubEnv('CORS_ORIGIN', ' '.repeat(3));
    const { environment } = await importEnvironment();
    expect(environment.CORS_ORIGIN).toBeUndefined();
  });

  it('parses a single origin string (docker-friendly default)', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com');
    const { environment } = await importEnvironment();
    expect(environment.CORS_ORIGIN).toEqual(['https://app.example.com']);
  });

  it('parses a comma-separated list of origins and trims whitespace', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com, https://dashboard.example.com ,https://admin.example.com');
    const { environment } = await importEnvironment();
    expect(environment.CORS_ORIGIN).toEqual([
      'https://app.example.com',
      'https://dashboard.example.com',
      'https://admin.example.com',
    ]);
  });

  it('drops empty segments from the list', async () => {
    vi.stubEnv('CORS_ORIGIN', 'https://app.example.com,, ');
    const { environment } = await importEnvironment();
    expect(environment.CORS_ORIGIN).toEqual(['https://app.example.com']);
  });

  it('rejects an invalid origin at boot', async () => {
    vi.stubEnv('CORS_ORIGIN', 'not-a-url');
    await expect(importEnvironment()).rejects.toThrow();
  });

  it('accepts both basic-auth credentials together', async () => {
    vi.stubEnv('AUTH_USERNAME', 'alice');
    vi.stubEnv('AUTH_PASSWORD', 's3cret');
    const { environment } = await importEnvironment();
    expect(environment.AUTH_USERNAME).toBe('alice');
    expect(environment.AUTH_PASSWORD).toBe('s3cret');
  });

  it('accepts basic auth being disabled', async () => {
    const { environment } = await importEnvironment();
    expect(environment.AUTH_USERNAME).toBeUndefined();
    expect(environment.AUTH_PASSWORD).toBeUndefined();
  });

  it('rejects boot when only AUTH_USERNAME is set', async () => {
    vi.stubEnv('AUTH_USERNAME', 'alice');
    vi.stubEnv('AUTH_PASSWORD', '');
    await expect(importEnvironment()).rejects.toThrow(/must be set together/u);
  });

  it('rejects boot when only AUTH_PASSWORD is set', async () => {
    vi.stubEnv('AUTH_USERNAME', '');
    vi.stubEnv('AUTH_PASSWORD', 's3cret');
    await expect(importEnvironment()).rejects.toThrow(/must be set together/u);
  });

  it('defaults OTEL_METRICS_PORT to 9464', async () => {
    vi.stubEnv('OTEL_TRACE_EXPORTER_URL', '');
    const { environment } = await importEnvironment();
    expect(environment.OTEL_METRICS_PORT).toBe(9464);
    expect(environment.OTEL_TRACE_EXPORTER_URL).toBeUndefined();
  });

  it('parses an OTLP traces endpoint and port', async () => {
    vi.stubEnv('OTEL_TRACE_EXPORTER_URL', 'http://localhost:4318/v1/traces');
    vi.stubEnv('OTEL_METRICS_PORT', '9999');
    const { environment } = await importEnvironment();
    expect(environment.OTEL_TRACE_EXPORTER_URL).toBe('http://localhost:4318/v1/traces');
    expect(environment.OTEL_METRICS_PORT).toBe(9999);
  });

  it('rejects an invalid OTEL_TRACE_EXPORTER_URL at boot', async () => {
    vi.stubEnv('OTEL_TRACE_EXPORTER_URL', 'not-a-url');
    await expect(importEnvironment()).rejects.toThrow();
  });
});
