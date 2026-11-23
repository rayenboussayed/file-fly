import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line n/no-unsupported-features/node-builtins -- node:sqlite is unflagged on Node >= 22.13 and targets Node 24/26
import { DatabaseSync } from 'node:sqlite';

import { environment, isProduction } from '@/environment.js';

/** Current schema version; kept in sync with the DDL below. */
const SCHEMA_VERSION = 1;

/**
 * Latency histogram upper bounds, in seconds; 999999 is the open-ended bucket.
 * @remarks Chosen to stay readable on a linear axis for a media service.
 */
const HISTOGRAM_LE = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 10, 999_999] as const;

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS metric_counter (
  name TEXT NOT NULL,
  route TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (name, route, bucket)
) STRICT;
CREATE TABLE IF NOT EXISTS metric_counter_ip (
  name TEXT NOT NULL,
  ip TEXT NOT NULL,
  bucket TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (name, ip, bucket)
) STRICT;
CREATE TABLE IF NOT EXISTS metric_hist (
  route TEXT NOT NULL,
  bucket TEXT NOT NULL,
  le REAL NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (route, bucket, le)
) STRICT;
`;

/**
 * Indexes for the retention sweep (bucket prefix) and the name-keyed rollups.
 * Idempotent so an existing version-1 database gains them on the next open.
 */
const INDEX_DDL = `
CREATE INDEX IF NOT EXISTS idx_metric_counter_bucket ON metric_counter (bucket);
CREATE INDEX IF NOT EXISTS idx_metric_counter_name_bucket ON metric_counter (name, bucket);
CREATE INDEX IF NOT EXISTS idx_metric_counter_ip_bucket ON metric_counter_ip (bucket);
CREATE INDEX IF NOT EXISTS idx_metric_hist_bucket ON metric_hist (bucket);
`;

/** Per-IP counters over the retained window. */
export interface MetricsPerIp {
  bytesIn: number;
  bytesOut: number;
  filesIn: number;
  filesOut: number;
  ip: string;
  requests: number;
}

/** One recorded request, already normalized by the interceptor. */
export interface MetricsRecord {
  /** Bytes received for the request (upload body or downloaded source). */
  bytesIn: number;
  /** Bytes written to the client. */
  bytesOut: number;
  /** Cache outcome for media routes, when one occurred. */
  cacheOutcome?: 'hit' | 'miss';
  /** Wall-clock duration from handler entry to response close. */
  durationMs: number;
  /** 1 when the request carried a media file (upload or remote fetch). */
  filesIn: 0 | 1;
  /** 1 when the response streamed a file out of the service. */
  filesOut: 0 | 1;
  /** Client IP as seen by Fastify (socket unless `TRUST_PROXY=true`). */
  ip: string;
  /** Route template (e.g. `/image`), or `unmatched` outside routing. */
  route: string;
  /** Verification outcome, when one occurred. */
  scan?: 'blocked' | 'clean' | 'infected';
  /** HTTP status code sent to the client. */
  status: number;
}

/** Per-route statistics with latency percentiles over the retained window. */
export interface MetricsRouteStat {
  avgMs: number;
  bytesOut: number;
  errors: number;
  p50: number;
  p95: number;
  p99: number;
  requests: number;
  route: string;
}

/** One hourly data point for the last 24 hours. */
export interface MetricsSeriesPoint {
  /** ISO hour bucket (`YYYY-MM-DDTHH`). */
  bucket: string;
  bytesIn: number;
  bytesOut: number;
  errors: number;
  requests: number;
}

/** Constructor options; every field defaults to the environment schema in production. */
export interface MetricsServiceOptions {
  /** Database path, or `:memory:`. Defaults to `<METRICS_DIR>/metrics.db`. */
  dbPath?: string;
  /** Flush interval in milliseconds. `0` disables the interval (tests). Defaults to `METRICS_FLUSH_INTERVAL_MS`. */
  flushIntervalMs?: number;
  /** Retention in days for all buckets. `0` disables sweeps; defaults to `METRICS_RETENTION_DAYS`. */
  retentionDays?: number;
}

/** Everything the dashboard renders, in one payload. */
export interface MetricsSnapshot {
  generatedAt: string;
  /** Currently open requests, tracked live (never persisted). */
  inFlight: number;
  /** One point per hour for the last 24 hours, zero-filled. */
  last24h: MetricsSeriesPoint[];
  /** True when the SQLite store failed to open; all persisted counters read zero. */
  metricsDisabled: boolean;
  /** Top 50 IPs by bytes out over the retained window. */
  perIp: MetricsPerIp[];
  /** Per-route statistics over the retained window. */
  perRoute: MetricsRouteStat[];
  /** Current calendar day (UTC). */
  today: MetricsTotals;
  /** Retained window (default 35 days). */
  totals: MetricsTotals;
  uptimeSeconds: number;
}

/** Aggregated counters for one time window. */
export interface MetricsTotals {
  /** Mean response time in milliseconds. */
  avgMs: number;
  bytesIn: number;
  bytesOut: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
  /** 4xx responses. */
  clientErrors: number;
  filesIn: number;
  filesOut: number;
  /** Total completed requests. */
  requests: number;
  scanBlocked: number;
  scanClean: number;
  scanInfected: number;
  /** 5xx responses. */
  serverErrors: number;
}

interface DeltaCounter {
  bucket: string;
  bytes: number;
  count: number;
  name: string;
  route: string;
}

interface DeltaCounterIp {
  bucket: string;
  bytes: number;
  count: number;
  ip: string;
  name: string;
}

interface DeltaHist {
  bucket: string;
  count: number;
  le: number;
  route: string;
}

const isoHour = (date: Date): string => date.toISOString().slice(0, 13);
const isoDay = (date: Date): string => date.toISOString().slice(0, 10);
const hourAgo = (hours: number): string => isoHour(new Date(Date.now() - hours * 3_600_000));
const dayAgo = (days: number): string => isoDay(new Date(Date.now() - days * 86_400_000));

/** Bounded delta buffers: a persistently failing store drops counts rather than grow memory without limit. */
const MAX_DELTA_KEYS = 10_000;

const zeroTotals = (): MetricsTotals => ({
  avgMs: 0,
  bytesIn: 0,
  bytesOut: 0,
  cacheHitRate: 0,
  cacheHits: 0,
  cacheMisses: 0,
  clientErrors: 0,
  filesIn: 0,
  filesOut: 0,
  requests: 0,
  scanBlocked: 0,
  scanClean: 0,
  scanInfected: 0,
  serverErrors: 0,
});

/** Parameter type accepted by `StatementSync.all()`, derived from `DatabaseSync`. */
type SqlParam = ReturnType<DatabaseSync['prepare']>['all'] extends (
  namedParameters: Record<string, infer _N>,
  ...anonymousParameters: infer A
) => unknown
  ? A extends readonly unknown[]
    ? A[number]
    : never
  : never;

/**
 * Runs a prepared statement and returns every row typed as `T`.
 *
 * node:sqlite types `StatementSync.all()` as `Record<string, SQLOutputValue>[]`,
 * which is not assignable to a row-specific shape without an intermediate
 * `unknown`, so the single cast below is unavoidable.
 * @param db - Open SQLite database.
 * @param sql - SQL text to prepare (passed through verbatim).
 * @param params - Bound parameters for the statement.
 * @returns All result rows as `T[]`.
 */

/**
 * Persistent, coalesced metrics store.
 *
 * Writes never happen on the request path: `record()` bumps in-memory delta
 * maps, and a timer (created in `onApplicationBootstrap`) drains them into a
 * single transaction every `flushIntervalMs`. Reads merge pending deltas over
 * the persisted rows, so the payload is always fresh. A failed store logs and
 * disables itself; media serving is never affected.
 */
@Injectable()
export class MetricsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private db?: DatabaseSync;
  private readonly dbPath: string;
  private readonly deltaHist = new Map<string, DeltaHist>();
  private readonly deltaIp = new Map<string, DeltaCounterIp>();

  private readonly deltaRoute = new Map<string, DeltaCounter>();
  private disabled = false;
  private readonly flushIntervalMs: number;
  private flushTimer?: NodeJS.Timeout;
  private inflight = 0;
  private readonly logger = new Logger(MetricsService.name);
  private readonly retentionDays: number;
  private retentionTimer?: NodeJS.Timeout;
  private statements?: {
    hist: ReturnType<DatabaseSync['prepare']>;
    ip: ReturnType<DatabaseSync['prepare']>;
    route: ReturnType<DatabaseSync['prepare']>;
  };

  // @Optional(): the interface emits Object as its design paramtype, which
  // Nest would otherwise try to resolve as a provider.
  constructor(@Optional() options: MetricsServiceOptions = {}) {
    this.dbPath = options.dbPath ?? path.join(environment.METRICS_DIR, 'metrics.db');
    this.retentionDays = options.retentionDays ?? environment.METRICS_RETENTION_DAYS;
    this.flushIntervalMs = options.flushIntervalMs ?? environment.METRICS_FLUSH_INTERVAL_MS;
    try {
      this.open();
    } catch (error) {
      this.disabled = true;
      this.logger.error(`metrics disabled: ${String(error)}`);
    }
  }

  /**
   * Drains all pending deltas into a single transaction.
   */
  flush(): void {
    const db = this.db;
    if (!db) return;
    if (this.deltaRoute.size === 0 && this.deltaIp.size === 0 && this.deltaHist.size === 0) return;

    let began = false;
    try {
      db.exec('BEGIN IMMEDIATE');
      began = true;
      if (!this.statements) {
        this.statements = {
          hist: db.prepare(
            'INSERT INTO metric_hist (route, bucket, le, count) VALUES (?, ?, ?, ?) ON CONFLICT(route, bucket, le) DO UPDATE SET count = count + excluded.count',
          ),
          ip: db.prepare(
            'INSERT INTO metric_counter_ip (name, ip, bucket, count, bytes) VALUES (?, ?, ?, ?, ?) ON CONFLICT(name, ip, bucket) DO UPDATE SET count = count + excluded.count, bytes = bytes + excluded.bytes',
          ),
          route: db.prepare(
            'INSERT INTO metric_counter (name, route, bucket, count, bytes) VALUES (?, ?, ?, ?, ?) ON CONFLICT(name, route, bucket) DO UPDATE SET count = count + excluded.count, bytes = bytes + excluded.bytes',
          ),
        };
      }
      const { hist: upsertHist, ip: upsertIp, route: upsertRoute } = this.statements;
      for (const row of this.deltaRoute.values()) upsertRoute.run(row.name, row.route, row.bucket, row.count, row.bytes);
      for (const row of this.deltaIp.values()) upsertIp.run(row.name, row.ip, row.bucket, row.count, row.bytes);
      for (const row of this.deltaHist.values()) upsertHist.run(row.route, row.bucket, row.le, row.count);
      db.exec('COMMIT');
      this.deltaRoute.clear();
      this.deltaIp.clear();
      this.deltaHist.clear();
    } catch (error) {
      if (began) db.exec('ROLLBACK');
      // Deltas are kept so the next flush can retry them.
      this.logger.error(`metrics flush failed: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Decrements the live in-flight counter.
   */
  inflightDec(): void {
    this.inflight = Math.max(0, this.inflight - 1);
  }

  /**
   * Increments the live in-flight counter.
   */
  inflightInc(): void {
    this.inflight += 1;
  }

  /**
   * Starts the flush and retention timers; never in unit tests.
   */
  onApplicationBootstrap(): void {
    if (this.disabled) return;
    if (!isProduction && !environment.METRICS_TOKEN) {
      this.logger.warn('METRICS_TOKEN is not set; /metrics is open in development');
    }
    if (this.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => { this.safeFlush(); }, this.flushIntervalMs);
      this.flushTimer.unref();
    }
    if (this.retentionDays > 0) {
      this.retentionTimer = setInterval(() => { this.safeSweep(); }, 3_600_000);
      this.retentionTimer.unref();
      this.safeSweep();
    }
  }

  /**
   * Stops timers, flushes the last deltas and closes the database.
   */
  onApplicationShutdown(): void {
    clearInterval(this.flushTimer);
    clearInterval(this.retentionTimer);
    this.safeFlush();
    this.close();
  }

  /**
   * Records one completed request.
   * @param record - Normalized request data from the interceptor.
   */
  record(record: MetricsRecord): void {
    if (this.disabled) return;
    const now = new Date();
    const hourBucket = isoHour(now);
    const dayBucket = isoDay(now);
    const duration = Math.round(record.durationMs);
    this.bumpPair('requests', record.route, record.ip, 0, 1, hourBucket, dayBucket);
    this.bumpPair('bytes_in', record.route, record.ip, record.bytesIn, 1, hourBucket, dayBucket);
    this.bumpPair('bytes_out', record.route, record.ip, record.bytesOut, 1, hourBucket, dayBucket);
    if (record.filesIn) this.bumpPair('file_in', record.route, record.ip, 0, 1, hourBucket, dayBucket);
    if (record.filesOut) this.bumpPair('file_out', record.route, record.ip, 0, 1, hourBucket, dayBucket);
    if (record.status >= 500) this.bumpPair('server_errors', record.route, record.ip, 0, 1, hourBucket, dayBucket);
    else if (record.status >= 400) this.bumpPair('client_errors', record.route, record.ip, 0, 1, hourBucket, dayBucket);
    if (record.cacheOutcome) this.bumpPair(record.cacheOutcome === 'hit' ? 'cache_hit' : 'cache_miss', record.route, record.ip, 0, 1, hourBucket, dayBucket);
    if (record.scan) this.bumpPair(`scan_${record.scan}`, record.route, record.ip, 0, 1, hourBucket, dayBucket);
    this.bumpRoute('duration', record.route, duration, 1, hourBucket);
    this.bumpHist(record.route, duration, hourBucket);
  }

  /**
   * Builds the aggregated payload the dashboard consumes. Persisted rows are
   * key-scoped and pending deltas are merged on every call, so the live fields
   * stay current without a cache layer that could go stale between polls.
   * @returns The current snapshot.
   */
  snapshot(): MetricsSnapshot {
    const base: MetricsSnapshot = {
      generatedAt: new Date().toISOString(),
      inFlight: this.inflight,
      last24h: [],
      metricsDisabled: this.disabled,
      perIp: [],
      perRoute: [],
      today: zeroTotals(),
      totals: zeroTotals(),
      uptimeSeconds: process.uptime(),
    };
    const db = this.db;
    if (!db) return base;

    base.totals = this.totals(db, '1970-01-01T00');
    base.today = this.totals(db, `${isoDay(new Date())}T00`);
    base.last24h = this.series24h(db);
    base.perIp = this.perIp(db);
    base.perRoute = this.perRoute(db);
    return base;
  }

  /**
   * Deletes hourly/daily rows older than `retentionDays`.
   * @param retentionDays - Days to keep; rows older than this are deleted.
   */
  sweep(retentionDays = this.retentionDays): void {
    const db = this.db;
    if (!db || retentionDays <= 0) return;
    db.prepare('DELETE FROM metric_counter WHERE bucket < ?').run(hourAgo(retentionDays * 24));
    db.prepare('DELETE FROM metric_counter_ip WHERE bucket < ?').run(dayAgo(retentionDays));
    db.prepare('DELETE FROM metric_hist WHERE bucket < ?').run(hourAgo(retentionDays * 24));
  }

  private applyHistograms(
    db: DatabaseSync,
    byRoute: Map<string, MetricsRouteStat & { durationCount: number; durationMs: number; }>,
  ): void {
    const rows = allRows<{ count: number; le: number; route: string; }>(db, 'SELECT route, le, SUM(count) count FROM metric_hist GROUP BY route, le');
    const hist = new Map<string, Map<number, number>>();
    const add = (route: string, le: number, count: number) => {
      const bucket = hist.get(route) ?? new Map<number, number>();
      bucket.set(le, (bucket.get(le) ?? 0) + count);
      hist.set(route, bucket);
    };
    for (const row of rows) add(row.route, row.le, row.count);
    for (const row of this.deltaHist.values()) add(row.route, row.le, row.count);
    for (const [route, stat] of byRoute) {
      const leCounts = hist.get(route) ?? new Map<number, number>();
      const total = [...leCounts.values()].reduce((sum, count) => sum + count, 0);
      stat.p50 = this.percentile(leCounts, total, 0.5);
      stat.p95 = this.percentile(leCounts, total, 0.95);
      stat.p99 = this.percentile(leCounts, total, 0.99);
    }
  }

  private applyRow(totals: MetricsTotals, name: string, count: number, bytes: number): void {
    switch (name) {
      case 'bytes_in': totals.bytesIn += bytes; break;
      case 'bytes_out': totals.bytesOut += bytes; break;
      case 'cache_hit': totals.cacheHits += count; break;
      case 'cache_miss': totals.cacheMisses += count; break;
      case 'client_errors': totals.clientErrors += count; break;
      case 'file_in': totals.filesIn += count; break;
      case 'file_out': totals.filesOut += count; break;
      case 'requests': totals.requests += count; break;
      case 'scan_blocked': totals.scanBlocked += count; break;
      case 'scan_clean': totals.scanClean += count; break;
      case 'scan_infected': totals.scanInfected += count; break;
      case 'server_errors': totals.serverErrors += count; break;
    }
  }

  private bumpHist(route: string, durationMs: number, bucket: string): void {
    const le = HISTOGRAM_LE.find((bound) => durationMs / 1000 <= bound) ?? 999_999;
    const key = `${route}|${bucket}|${le}`;
    if (this.deltaHist.size >= MAX_DELTA_KEYS && !this.deltaHist.has(key)) {
      this.deltaHist.clear();
      this.logger.warn('metrics histogram delta buffer full; dropping pending counts');
    }
    const current = this.deltaHist.get(key) ?? { bucket, count: 0, le, route };
    current.count += 1;
    this.deltaHist.set(key, current);
  }

  private bumpIp(name: string, ip: string, bytes: number, count: number, bucket: string): void {
    const key = `${name}|${ip}|${bucket}`;
    if (this.deltaIp.size >= MAX_DELTA_KEYS && !this.deltaIp.has(key)) {
      this.deltaIp.clear();
      this.logger.warn('metrics ip delta buffer full; dropping pending counts');
    }
    const current = this.deltaIp.get(key) ?? { bucket, bytes: 0, count: 0, ip, name };
    current.count += count;
    current.bytes += bytes;
    this.deltaIp.set(key, current);
  }

  private bumpPair(
    name: string,
    route: string,
    ip: string,
    bytes: number,
    count: number,
    hourBucket: string,
    dayBucket: string,
  ): void {
    this.bumpRoute(name, route, bytes, count, hourBucket);
    this.bumpIp(name, ip, bytes, count, dayBucket);
  }

  private bumpRoute(name: string, route: string, bytes: number, count: number, bucket: string): void {
    const key = `${name}|${route}|${bucket}`;
    if (this.deltaRoute.size >= MAX_DELTA_KEYS && !this.deltaRoute.has(key)) {
      this.deltaRoute.clear();
      this.logger.warn('metrics route delta buffer full; dropping pending counts');
    }
    const current = this.deltaRoute.get(key) ?? { bucket, bytes: 0, count: 0, name, route };
    current.count += count;
    current.bytes += bytes;
    this.deltaRoute.set(key, current);
  }

  private close(): void {
    this.db?.close();
    this.db = undefined;
    this.statements = undefined;
  }

  private open(): void {
    if (this.dbPath === ':memory:') {
      this.db = new DatabaseSync(':memory:');
    } else {
      /* eslint-disable-next-line security/detect-non-literal-fs-filename -- METRICS_DIR is operator-controlled env config, not request input */
      fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
      this.db = new DatabaseSync(this.dbPath, { timeout: 2000 });
    }
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.db.exec('PRAGMA busy_timeout = 2000');
    const raw = this.db.prepare('PRAGMA user_version').get() as { user_version: number };
    const version = Number(raw.user_version);
    if (version === 0) {
      this.db.exec(SCHEMA_DDL);
      this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    } else if (version !== SCHEMA_VERSION) {
      this.db.close();
      this.db = undefined;
      throw new Error(`unsupported metrics schema version: ${String(version)}`);
    }
    try {
      this.db.exec(INDEX_DDL);
    } catch (error) {
      // Index creation is an optimization. A read-only file or a lock must not
      // turn a working store into a disabled one; the key scans still work.
      this.logger.warn(`metrics indexes unavailable: ${String(error)}`);
    }
  }

  private percentile(leCounts: Map<number, number>, total: number, quantile: number): number {
    if (total === 0) return 0;
    const target = Math.ceil(total * quantile);
    let cumulative = 0;
    for (const [le, count] of [...leCounts.entries()].sort((a, b) => a[0] - b[0])) {
      cumulative += count;
      if (cumulative >= target) return Math.round(Math.min(le, 10) * 1000);
    }
    return 10_000;
  }

  private perIp(db: DatabaseSync): MetricsPerIp[] {
    const topIps = allRows<{ ip: string }>(
      db,
      "SELECT ip FROM metric_counter_ip WHERE name = 'bytes_out' GROUP BY ip ORDER BY SUM(bytes) DESC LIMIT 50",
    );
    const candidates = new Set<string>(topIps.map((row) => row.ip));
    for (const row of this.deltaIp.values()) candidates.add(row.ip);
    if (candidates.size === 0) return [];
    const filter = [...candidates].map(() => '?').join(',');
    // eslint-disable-next-line deslint/no-sql-injection -- the interpolated segment is placeholder marks only (?,?,…); every value binds via parameters
    const sql = `SELECT ip, name, SUM(count) count, SUM(bytes) bytes FROM metric_counter_ip WHERE ip IN (${filter}) GROUP BY ip, name`;
    const rows = allRows<{ bytes: number; count: number; ip: string; name: string; }>(db, sql, ...candidates);
    const byIp = new Map<string, MetricsPerIp>();
    const ensure = (ip: string): MetricsPerIp => {
      const current = byIp.get(ip) ?? { bytesIn: 0, bytesOut: 0, filesIn: 0, filesOut: 0, ip, requests: 0 };
      byIp.set(ip, current);
      return current;
    };
    const assign = (name: string, row: { bytes: number; count: number; }, target: MetricsPerIp) => {
      if (name === 'requests') target.requests += row.count;
      else if (name === 'bytes_in') target.bytesIn += row.bytes;
      else if (name === 'bytes_out') target.bytesOut += row.bytes;
      else if (name === 'file_in') target.filesIn += row.count;
      else if (name === 'file_out') target.filesOut += row.count;
    };
    for (const row of rows) assign(row.name, row, ensure(row.ip));
    for (const row of this.deltaIp.values()) assign(row.name, row, ensure(row.ip));
    return [...byIp.values()].sort((a, b) => b.bytesOut - a.bytesOut).slice(0, 50);
  }

  private perRoute(db: DatabaseSync): MetricsRouteStat[] {
    const rows = allRows<{ bytes: number; count: number; name: string; route: string; }>(
      db,
      'SELECT route, name, SUM(count) count, SUM(bytes) bytes FROM metric_counter WHERE name IN (\'requests\', \'bytes_out\', \'client_errors\', \'server_errors\', \'duration\') GROUP BY route, name',
    );
    const byRoute = new Map<string, MetricsRouteStat & { durationCount: number; durationMs: number; }>();
    const ensure = (route: string) => {
      const current = byRoute.get(route) ?? { avgMs: 0, bytesOut: 0, durationCount: 0, durationMs: 0, errors: 0, p50: 0, p95: 0, p99: 0, requests: 0, route };
      byRoute.set(route, current);
      return current;
    };
    const assign = (name: string, row: { bytes: number; count: number; }, target: MetricsRouteStat & { durationCount: number; durationMs: number; }) => {
      if (name === 'requests') target.requests += row.count;
      else if (name === 'bytes_out') target.bytesOut += row.bytes;
      else if (name === 'client_errors' || name === 'server_errors') target.errors += row.count;
      else if (name === 'duration') {
        target.durationMs += row.bytes;
        target.durationCount += row.count;
      }
    };
    for (const row of rows) assign(row.name, row, ensure(row.route));
    for (const row of this.deltaRoute.values()) assign(row.name, row, ensure(row.route));
    this.applyHistograms(db, byRoute);
    return [...byRoute.values()]
      .map(({ durationCount, durationMs, ...stat }) => ({ ...stat, avgMs: durationCount === 0 ? 0 : durationMs / durationCount }))
      .sort((a, b) => b.requests - a.requests);
  }

  private safeFlush(): void {
    try {
      this.flush();
    } catch (error) {
      // Deltas survive; the next interval retries. Logged for operators.
      this.logger.warn(`metrics flush failed, will retry next interval: ${String(error)}`);
    }
  }

  private safeSweep(): void {
    try {
      this.sweep();
    } catch (error) {
      this.logger.error(`metrics retention sweep failed: ${String(error)}`);
    }
  }

  private series24h(db: DatabaseSync): MetricsSeriesPoint[] {
    const from = hourAgo(24);
    const rows = allRows<{ bucket: string; bytes: number; count: number; name: string; }>(
      db,
      'SELECT bucket, name, SUM(count) count, SUM(bytes) bytes FROM metric_counter WHERE bucket >= ? AND name IN (\'requests\', \'bytes_in\', \'bytes_out\', \'client_errors\', \'server_errors\') GROUP BY bucket, name',
      from,
    );
    const groups = new Map<string, MetricsSeriesPoint>();
    const assign = (bucket: string, name: string, count: number, bytes: number) => {
      let point = groups.get(bucket);
      if (!point) {
        point = { bucket, bytesIn: 0, bytesOut: 0, errors: 0, requests: 0 };
        groups.set(bucket, point);
      }
      if (name === 'requests') point.requests += count;
      else if (name === 'bytes_in') point.bytesIn += bytes;
      else if (name === 'bytes_out') point.bytesOut += bytes;
      else point.errors += count;
    };
    for (const row of rows) assign(row.bucket, row.name, row.count, row.bytes);
    for (const row of this.deltaRoute.values()) {
      if (row.bucket >= from) assign(row.bucket, row.name, row.count, row.bytes);
    }
    const points: MetricsSeriesPoint[] = [];
    for (let offset = 24; offset >= 0; offset -= 1) {
      const bucket = hourAgo(offset);
      points.push(groups.get(bucket) ?? { bucket, bytesIn: 0, bytesOut: 0, errors: 0, requests: 0 });
    }
    return points.sort((a, b) => a.bucket.localeCompare(b.bucket));
  }

  private totals(db: DatabaseSync, fromHour: string): MetricsTotals {
    const rows = allRows<{ bytes: number; count: number; name: string; }>(db, 'SELECT name, SUM(count) count, SUM(bytes) bytes FROM metric_counter WHERE bucket >= ? GROUP BY name', fromHour);
    const totals = zeroTotals();
    let durationMs = 0;
    const visit = (row: { bytes: number; count: number; name: string; }) => {
      if (row.name === 'duration') durationMs += row.bytes;
      else this.applyRow(totals, row.name, row.count, row.bytes);
    };
    for (const row of rows) visit(row);
    for (const row of this.deltaRoute.values()) if (row.bucket >= fromHour) visit(row);
    totals.cacheHitRate = totals.cacheHits + totals.cacheMisses === 0
      ? 0
      : totals.cacheHits / (totals.cacheHits + totals.cacheMisses);
    totals.avgMs = totals.requests === 0 ? 0 : durationMs / totals.requests;
    return totals;
  }
}

/**
 * Runs a prepared statement and returns every row typed as `T`.
 *
 * node:sqlite types `StatementSync.all()` as `Record<string, SQLOutputValue>[]`,
 * which is not assignable to a row-specific shape without an intermediate
 * `unknown`, so the single cast below is unavoidable.
 * @param db - Open SQLite database.
 * @param sql - SQL text to prepare (passed through verbatim).
 * @param params - Bound parameters for the statement.
 * @returns All result rows as `T[]`.
 */
function allRows<T>(db: DatabaseSync, sql: string, ...params: SqlParam[]): T[] {
  // node:sqlite's result type is not row-specific; this is the one unavoidable cast.
  return db.prepare(sql).all(...params) as unknown as T[];
}
