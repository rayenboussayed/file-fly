import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// eslint-disable-next-line n/no-unsupported-features/node-builtins -- node:sqlite is unflagged on Node >= 22.13 and targets Node 24/26
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type MetricsRecord, MetricsService } from './metrics.service.js';

const tempDirs: string[] = [];

const makeService = (overrides: Record<string, unknown> = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
  tempDirs.push(dir);
  return new MetricsService({
    dbPath: path.join(dir, 'metrics.db'),
    flushIntervalMs: 0,
    retentionDays: 35,
    ...overrides,
  });
};

/**
 * Convenience record with overridable fields.
 * @param overrides - Fields to override in the fixture record.
 * @returns A fully-populated record with defaults applied.
 */
const record = (overrides: Partial<MetricsRecord> = {}): MetricsRecord => ({
  bytesIn: 100,
  bytesOut: 200,
  durationMs: 12,
  filesIn: 1,
  filesOut: 1,
  ip: '127.0.0.1',
  route: '/image',
  status: 200,
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { force: true, recursive: true });
  }
});

describe('MetricsService open', () => {
  it('creates the directory and database file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'nested', 'metrics.db');
    const service = new MetricsService({ dbPath, flushIntervalMs: 0, retentionDays: 35 });
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- temp directory created by the test itself
    expect(fs.existsSync(dbPath)).toBe(true);
    expect(service.snapshot().metricsDisabled).toBe(false);
  });

  it('disables itself when the store cannot be opened', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
    tempDirs.push(dir);
    const blocker = path.join(dir, 'blocker');
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- temp directory created by the test itself
    fs.writeFileSync(blocker, 'file');
    const service = makeService({ dbPath: path.join(blocker, 'metrics.db') });
    expect(service.snapshot().metricsDisabled).toBe(true);
    expect(service.snapshot().totals.requests).toBe(0);
    expect(() => service.record(record())).not.toThrow();
    expect(() => service.flush()).not.toThrow();
    expect(() => service.onApplicationBootstrap()).not.toThrow();
    expect(() => service.onApplicationShutdown()).not.toThrow();
  });

  it('disables itself on an unsupported schema version', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'metrics.db');
    const db = new DatabaseSync(dbPath);
    db.exec('PRAGMA user_version = 99');
    db.close();
    const service = makeService({ dbPath });
    expect(service.snapshot().metricsDisabled).toBe(true);
  });

  it('starts the timers and sweeps on bootstrap when enabled', () => {
    const service = makeService({ flushIntervalMs: 1000 });
    service.onApplicationBootstrap();
    expect(service.snapshot().metricsDisabled).toBe(false);
    service.onApplicationShutdown();
  });

  it('does not create timers when the flush interval is 0', () => {
    const service = makeService({ flushIntervalMs: 0, retentionDays: 0 });
    service.onApplicationBootstrap();
    expect(service.snapshot().metricsDisabled).toBe(false);
    service.onApplicationShutdown();
  });

  it('persists across instances of the store', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'metrics.db');
    const first = makeService({ dbPath });
    first.record(record());
    first.onApplicationShutdown();
    const second = makeService({ dbPath });
    expect(second.snapshot().totals.requests).toBe(1);
    second.onApplicationShutdown();
  });
});

describe('MetricsService record', () => {
  it('aggregates requests, bytes, files, errors and duration', () => {
    const service = makeService();
    service.record(record({ durationMs: 12 }));
    service.record(record({ durationMs: 18, status: 201 }));
    service.record(record({ bytesIn: 50, bytesOut: 25, durationMs: 30, status: 404 }));
    service.record(record({ durationMs: 5, status: 500 }));
    const snapshot = service.snapshot();
    expect(snapshot.totals.requests).toBe(4);
    expect(snapshot.totals.bytesIn).toBe(350);
    expect(snapshot.totals.bytesOut).toBe(625);
    expect(snapshot.totals.filesIn).toBe(4);
    expect(snapshot.totals.filesOut).toBe(4);
    expect(snapshot.totals.clientErrors).toBe(1);
    expect(snapshot.totals.serverErrors).toBe(1);
    expect(snapshot.totals.avgMs).toBe((12 + 18 + 30 + 5) / 4);
    service.onApplicationShutdown();
  });

  it('aggregates cache verdicts, scan verdicts and files flags', () => {
    const service = makeService();
    service.record(record({ cacheOutcome: 'hit', filesIn: 0, filesOut: 0 }));
    service.record(record({ cacheOutcome: 'hit' }));
    service.record(record({ cacheOutcome: 'miss' }));
    service.record(record({ scan: 'clean' }));
    service.record(record({ scan: 'infected' }));
    service.record(record({ scan: 'blocked' }));
    const snapshot = service.snapshot();
    expect(snapshot.totals.cacheHits).toBe(2);
    expect(snapshot.totals.cacheMisses).toBe(1);
    expect(snapshot.totals.cacheHitRate).toBeCloseTo(2 / 3);
    expect(snapshot.totals.scanClean).toBe(1);
    expect(snapshot.totals.scanInfected).toBe(1);
    expect(snapshot.totals.scanBlocked).toBe(1);
    expect(snapshot.totals.filesIn).toBe(5);
    expect(snapshot.totals.filesOut).toBe(5);
    service.onApplicationShutdown();
  });

  it('keeps per-IP counters sorted by bytes out', () => {
    const service = makeService();
    service.record(record({ bytesOut: 1000, ip: '127.0.0.1' }));
    service.record(record({ bytesOut: 9000, ip: '127.0.0.2' }));
    service.record(record({ bytesOut: 500, ip: '127.0.0.3' }));
    const snapshot = service.snapshot();
    expect(snapshot.perIp.map((entry) => entry.ip)).toEqual(['127.0.0.2', '127.0.0.1', '127.0.0.3']);
    expect(snapshot.perIp[0]?.bytesOut).toBe(9000);
    expect(snapshot.perIp[0]?.filesIn).toBe(1);
    service.onApplicationShutdown();
  });

  it('sorts perRoute by requests and reports latency percentiles', () => {
    const service = makeService();
    for (let index = 0; index < 40; index += 1) service.record(record({ durationMs: 10, route: '/image' }));
    for (let index = 0; index < 5; index += 1) service.record(record({ durationMs: 100, route: '/image' }));
    for (let index = 0; index < 5; index += 1) service.record(record({ durationMs: 3000, route: '/image' }));
    service.record(record({ durationMs: 10, route: '/audio' }));
    service.flush();
    const snapshot = service.snapshot();
    expect(snapshot.perRoute[0]?.route).toBe('/image');
    expect(snapshot.perRoute[0]?.requests).toBe(50);
    expect(snapshot.perRoute[0]?.p50).toBe(50);
    expect(snapshot.perRoute[0]?.p95).toBe(10_000);
    expect(snapshot.perRoute[0]?.p99).toBe(10_000);
    expect(snapshot.perRoute[0]?.avgMs).toBeCloseTo((40 * 10 + 5 * 100 + 5 * 3000) / 50);
    expect(snapshot.perRoute[1]?.route).toBe('/audio');
    service.onApplicationShutdown();
  });

  it('merges pending deltas into the snapshot without flushing', () => {
    const service = makeService();
    service.record(record({ bytesOut: 42 }));
    const snapshot = service.snapshot();
    expect(snapshot.totals.requests).toBe(1);
    expect(snapshot.totals.bytesOut).toBe(42);
    expect(snapshot.perRoute[0]?.requests).toBe(1);
    service.flush();
    const after = service.snapshot();
    expect(after.totals.requests).toBe(1);
    expect(after.totals.bytesOut).toBe(42);
    service.onApplicationShutdown();
  });

  it('zero-fills the last 24 hours series', () => {
    const service = makeService();
    const snapshot = service.snapshot();
    expect(snapshot.last24h).toHaveLength(25);
    expect(snapshot.last24h.every((point) => point.requests === 0)).toBe(true);
    service.onApplicationShutdown();
  });

  it('tracks and clamps the in-flight gauge', () => {
    const service = makeService();
    expect(service.snapshot().inFlight).toBe(0);
    service.inflightInc();
    service.inflightInc();
    expect(service.snapshot().inFlight).toBe(2);
    service.inflightDec();
    service.inflightDec();
    service.inflightDec();
    expect(service.snapshot().inFlight).toBe(0);
    service.onApplicationShutdown();
  });

  it('sweeps rows older than the retention window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'metrics.db');
    const first = makeService({ dbPath });
    first.record(record());
    first.flush();
    vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));
    const later = makeService({ dbPath });
    later.sweep();
    expect(later.snapshot().totals.requests).toBe(0);
    vi.useRealTimers();
    first.onApplicationShutdown();
    later.onApplicationShutdown();
  });

  it('does not sweep when retention is 0', () => {
    const service = makeService({ retentionDays: 0 });
    service.record(record());
    service.flush();
    service.sweep();
    expect(service.snapshot().totals.requests).toBe(1);
    service.onApplicationShutdown();
  });

  it('sweep is a no-op when the store is disabled', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
    tempDirs.push(dir);
    const blocker = path.join(dir, 'blocker');
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- temp directory created by the test itself
    fs.writeFileSync(blocker, 'file');
    const service = makeService({ dbPath: path.join(blocker, 'metrics.db') });
    expect(() => service.sweep()).not.toThrow();
    service.onApplicationShutdown();
  });

  it('drops and refills a full route delta buffer without crashing', () => {
    const service = makeService();
    const internal = service as never as { deltaRoute: Map<string, unknown> };
    for (let index = 0; index <= 10_000; index += 1) internal.deltaRoute.set(`k${String(index)}`, null);
    service.record(record());
    expect(internal.deltaRoute.size).toBe(6); // one cleared refill per counter name
    service.onApplicationShutdown();
  });

  it('drops and refills a full ip delta buffer without crashing', () => {
    const service = makeService();
    const internal = service as never as { deltaIp: Map<string, unknown> };
    for (let index = 0; index <= 10_000; index += 1) internal.deltaIp.set(`k${String(index)}`, null);
    service.record(record());
    expect(internal.deltaIp.size).toBe(5); // one cleared refill per counter name
    service.onApplicationShutdown();
  });

  it('drops and refills a full histogram delta buffer without crashing', () => {
    const service = makeService();
    const internal = service as never as { deltaHist: Map<string, unknown> };
    for (let index = 0; index <= 10_000; index += 1) internal.deltaHist.set(`k${String(index)}`, null);
    service.record(record());
    expect(internal.deltaHist.size).toBe(1);
    service.onApplicationShutdown();
  });

  it('opens an in-memory database', () => {
    const service = makeService({ dbPath: ':memory:' });
    service.record(record());
    expect(service.snapshot().totals.requests).toBe(1);
    service.onApplicationShutdown();
  });

  it('falls back to environment defaults without options', () => {
    // test/results is the unit run's disposable output root (gitignored, wiped by design).
    const dir = path.resolve('test/results/metrics');
    fs.rmSync(dir, { force: true, recursive: true });
    const service = new MetricsService();
    service.record(record());
    service.flush();
    expect(service.snapshot().totals.requests).toBe(1);
    expect(fs.existsSync(path.join(dir, 'metrics.db'))).toBe(true);
    service.onApplicationShutdown();
  });

  it('rolls back and keeps deltas when a flush fails', () => {
    const service = makeService();
    service.record(record());
    const internal = service as never as { deltaRoute: Map<string, unknown> };
    let logged = false;
    const loggerStub = service as never as { logger: { error: (message: string) => void } };
    loggerStub.logger.error = () => { logged = true; };
    internal.deltaRoute.set('poison|/image|2026-11-17T00', null);
    expect(() => service.flush()).toThrow();
    expect(logged).toBe(true);
    service.onApplicationShutdown();
  });

  it('logs and keeps timers running when the retention sweep fails', () => {
    const service = makeService({ flushIntervalMs: 1000, retentionDays: 35 });
    service.record(record());
    service.flush();
    const internal = service as never as { db?: { exec: (sql: string) => void } };
    internal.db?.exec('DROP TABLE metric_counter');
    expect(() => (service as never as { safeSweep: () => void }).safeSweep()).not.toThrow();
    service.onApplicationShutdown();
  });

  it('fires the flush and retention timers', () => {
    vi.useFakeTimers();
    const service = makeService({ flushIntervalMs: 1000, retentionDays: 35 });
    service.record(record());
    service.onApplicationBootstrap();
    vi.advanceTimersByTime(1001);
    expect(service.snapshot().totals.requests).toBe(1);
    vi.advanceTimersByTime(3_600_001);
    expect(service.snapshot().totals.requests).toBe(1);
    vi.useRealTimers();
    service.onApplicationShutdown();
  });

  it('aggregates persisted rows across buckets and days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-'));
    tempDirs.push(dir);
    const dbPath = path.join(dir, 'metrics.db');
    const first = makeService({ dbPath });
    first.record(record({ bytesIn: 10, bytesOut: 100, ip: '127.0.0.1' }));
    first.flush();
    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'));
    const second = makeService({ dbPath });
    second.record(record({ bytesIn: 20, bytesOut: 200, ip: '127.0.0.2' }));
    second.flush();
    const snapshot = second.snapshot();
    expect(snapshot.totals.requests).toBe(2);
    expect(snapshot.totals.bytesIn).toBe(30);
    expect(snapshot.totals.bytesOut).toBe(300);
    expect(snapshot.perIp.map((entry) => entry.ip).sort()).toEqual(['127.0.0.1', '127.0.0.2']);
    expect(snapshot.perRoute[0]?.route).toBe('/image');
    vi.useRealTimers();
    first.onApplicationShutdown();
    second.onApplicationShutdown();
  });

  it('caps durations above the largest histogram bucket', () => {
    const service = makeService();
    service.record(record({ durationMs: 10_000_000_000 }));
    service.flush();
    expect(service.snapshot().perRoute[0]?.p99).toBe(10_000);
    service.onApplicationShutdown();
  });

  it('percentile returns 0 for an empty histogram', () => {
    const service = makeService();
    const internals = service as never as {
      percentile: (leCounts: Map<number, number>, total: number, quantile: number) => number;
    };
    expect(internals.percentile(new Map(), 0, 0.5)).toBe(0);
    expect(internals.percentile(new Map([[0.5, 10]]), 10, 2)).toBe(10_000);
    service.onApplicationShutdown();
  });
});

  it('reports zeroed percentiles when only histogram rows are missing', () => {
    const service = makeService();
    service.record(record({ durationMs: 42 }));
    service.flush();
    const internals = service as never as {
      db: { exec: (sql: string) => void };
    };
    internals.db.exec('DELETE FROM metric_hist');
    const snapshot = service.snapshot();
    expect(snapshot.perRoute[0]?.p50).toBe(0);
    expect(snapshot.perRoute[0]?.p95).toBe(0);
    expect(snapshot.perRoute[0]?.p99).toBe(0);
    service.onApplicationShutdown();
  });

  it('reports avgMs 0 when the duration counter rows are missing', () => {
    const service = makeService();
    service.record(record({ durationMs: 42 }));
    service.flush();
    const internals = service as never as {
      db: { exec: (sql: string) => void };
    };
    internals.db.exec("DELETE FROM metric_counter WHERE name = 'duration'");
    const snapshot = service.snapshot();
    expect(snapshot.perRoute[0]?.avgMs).toBe(0);
    expect(snapshot.perRoute[0]?.requests).toBe(1);
    service.onApplicationShutdown();
  });
