# Metrics

Per-client usage accounting for the file-fly media service, stored in SQLite via `node:sqlite`, and rendered by the dashboard (`packages/dashboard`, served at `/` when `DASHBOARD_DIR` points at a built `packages/dashboard/dist`).

## What is measured

| Metric | Meaning | Where it lands |
| --- | --- | --- |
| `requests` | Completed requests, per route template | `metric_counter` (hour bucket), `metric_counter_ip` (day bucket) |
| `bytes_in` | Bytes received by the service | same |
| `bytes_out` | Bytes written to the client | same |
| `file_in` | Media files that entered (upload POST with body, or a remote `?source=` fetch) | same |
| `file_out` | Streamed responses (any response piped via `pipeToReply`) | same |
| `client_errors` / `server_errors` | 4xx / 5xx responses | same |
| `cache_hit` / `cache_miss` | Streaming-cache outcome (media routes only, when a cache key exists) | same |
| `scan_clean` / `scan_infected` / `scan_blocked` | ClamAV verdicts; `blocked` = payload rejected pre-scan (413/422) | same |
| `duration` | Summed handler duration; `bytes` column carries milliseconds | `metric_counter` (route only) |
| latency histogram | Per-route request duration buckets | `metric_hist` (hour bucket, upper bounds `0.05, 0.1, 0.25, 0.5, 1, 2.5, 10, 999999` seconds (open-ended bucket)) |
| in-flight | Requests currently open | live gauge only — never persisted |

`/metrics` and `/health` are excluded from instrumentation. No request that fails to match a route is counted; Nest global interceptors run only for routed requests.

Route labels are the registered route template (for example `/image`, `/video/screenshot`, `/signature`), from Fastify's `routeOptions.url`. There is no per-path cardinality risk: the set is bounded by the route table.

## Identity

The client IP, taken from `request.ip` — the socket peer by default, or the first `X-Forwarded-For` hop when `TRUST_PROXY=true`. Only enable that behind a proxy you control; otherwise clients can spoof their identity and collapse everyone into the proxy's IP. IPv6 addresses are stored as text and shown as-is.

Storing client IPs is a privacy liability: keep `METRICS_RETENTION_DAYS` modest (default 35), restrict `GET /metrics` (see below), and do not join these rows with anything else.

## Storage

File: `<METRICS_DIR>/metrics.db` (default `./metrics/metrics.db`, deliberately outside `CACHE_DIR` — the janitor sweeps that directory; Docker sets `/data/metrics`). `node:sqlite` opens it with `WAL`, `synchronous=NORMAL` and a 2000 ms busy timeout. Schema version lives in `PRAGMA user_version` (`1`); unsupported versions disable the store at boot instead of corrupting data.

```sql
CREATE TABLE metric_counter (
  name TEXT NOT NULL, route TEXT NOT NULL, bucket TEXT NOT NULL,  -- hour bucket YYYY-MM-DDTHH (UTC)
  count INTEGER NOT NULL DEFAULT 0, bytes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (name, route, bucket)) STRICT;
CREATE TABLE metric_counter_ip (
  name TEXT NOT NULL, ip TEXT NOT NULL, bucket TEXT NOT NULL,      -- day bucket YYYY-MM-DD (UTC)
  count INTEGER NOT NULL DEFAULT 0, bytes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (name, ip, bucket)) STRICT;
CREATE TABLE metric_hist (
  route TEXT NOT NULL, bucket TEXT NOT NULL, le REAL NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (route, bucket, le)) STRICT;
```

Counters and expiry: buckets in `metric_counter` and `metric_hist` expire after `retentionDays` days of hourly granularity, `metric_counter_ip` after the same in daily granularity; both deletes run in the retention sweep (first at bootstrap, then hourly). Daily granularity for the per-IP table keeps cardinality bounded at roughly `unique_ips × names × retention_days` rows.

Write path, on purpose: `record()` only bumps in-memory delta maps (`O(1)`). A timer (`METRICS_FLUSH_INTERVAL_MS`, default 1000, unref'd) drains them in one `BEGIN IMMEDIATE` … `COMMIT` transaction, and `onApplicationShutdown` performs a final flush (the app enables shutdown hooks, so SIGTERM drains before exit). On crash, at most one flush interval of counters is lost — acceptable for metrics.

Read path: `GET /metrics` is computed on every call, merging persisted rows with pending deltas (polling clients re-query each 5 seconds; the aggregate queries over the retained window cost single-digit milliseconds).

## `GET /metrics` payload

One JSON object; the dashboard renders it directly. Shape (excerpt):

```json
{
  "uptimeSeconds": 3600,
  "generatedAt": "2026-11-17T15:00:00.000Z",
  "inFlight": 3,
  "metricsDisabled": false,
  "totals": { "requests": 1204, "bytesIn": 5368709120, "bytesOut": 53687091200,
              "filesIn": 950, "filesOut": 1100, "clientErrors": 12, "serverErrors": 3,
              "cacheHits": 300, "cacheMisses": 700, "cacheHitRate": 0.3,
              "scanClean": 890, "scanInfected": 2, "scanBlocked": 5, "avgMs": 42.5 },
  "today": { "requests": 55, "...": "same shape as totals" },
  "last24h": [ { "bucket": "2026-11-17T14", "requests": 55, "bytesIn": 1e6, "bytesOut": 5e6, "errors": 0 } ],
  "perIp":  [ { "ip": "203.0.113.7", "requests": 400, "filesIn": 380, "filesOut": 390, "bytesIn": 2e9, "bytesOut": 3e10 } ],
  "perRoute":[ { "route": "/image", "requests": 700, "errors": 5, "avgMs": 35,
                 "p50": 50, "p95": 100, "p99": 250, "bytesOut": 2.5e10 } ]
}
```

`last24h` is zero-filled (25 hourly points). `perIp` is the top 50 by bytes out over the retained window. Percentiles report the upper bound of the first histogram bucket whose cumulative count reaches the target quantile, in milliseconds, capped at 10 s.

## Failure modes

- SQLite cannot open (bad path, corrupt file, wrong schema version): the store logs once at boot, `metricsDisabled` becomes `true`, every write becomes a no-op, the app serves media normally, and `GET /metrics` reports `metricsDisabled: true` with zeroed counters. Observability degrades; availability does not.
- A flush fails mid-transaction: `ROLLBACK`, deltas are kept, the next interval retries; a persistent failure keeps logging warnings.
- Crash between flushes: at most one flush interval of counters is lost.
- `/metrics` in production without `METRICS_TOKEN`: `503 { statusCode: 503, ... }` — the route never leaks IPs or volumes to anonymous callers.

## Security

`/metrics` requires `Authorization: Bearer $METRICS_TOKEN` whenever `METRICS_TOKEN` is set; in production, an unset `METRICS_TOKEN` makes the route answer `503`. The comparison is constant-time (`crypto.timingSafeEqual`) on the full `Bearer <token>` header. Tokens compare at equal length only; timing does not leak prefix matches.

The dashboard keeps the token in `sessionStorage` (per tab, cleared on tab close). No token is baked into the build, the image, or the JS bundle.

## Query plans

The persisted aggregation queries are all key-driven:

- `totals` / `today`: `GROUP BY name` on `metric_counter` over a bounded bucket prefix (typically a few thousand rows).
- `perIp`: `GROUP BY ip, name` on `metric_counter_ip`, primary-key ordered.
- `perRoute`: `GROUP BY route, name`, plus `GROUP BY route, le` on `metric_hist`.
- retention sweep: bounded `DELETE … WHERE bucket < ?` on the same primary keys.

Four `CREATE INDEX IF NOT EXISTS` statements run on every open, including a
version-1 database that predates them. `idx_metric_counter_bucket` serves the
retention sweep, `idx_metric_counter_name_bucket` serves the `bucket`-filtered
rollups, and `idx_metric_counter_ip_bucket` / `idx_metric_hist_bucket` serve the
other two sweeps. Index creation is an optimization: if it fails, the store
keeps working with the primary-key scans. The unit suite asserts the plans with
`EXPLAIN QUERY PLAN`.

At ~1k requests/minute with 10 routes and 13 counter names, the live set stays in the low millions of rows for a 35-day window — SQLite handles this trivially; the flush interval is the only hot-path cost.
