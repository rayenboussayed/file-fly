import { withTimeoutAsync } from 'jutilities/hof/timeout';

/** Counters for one client IP over the retained window. */
export interface MetricsPerIp extends Record<string, unknown> {
  bytesIn: number;
  bytesOut: number;
  filesIn: number;
  filesOut: number;
  ip: string;
  requests: number;
}

/** Latency and volume statistics for one route template. */
export interface MetricsRouteStat extends Record<string, unknown> {
  avgMs: number;
  bytesOut: number;
  errors: number;
  p50: number;
  p95: number;
  p99: number;
  requests: number;
  route: string;
}

/** Everything the dashboard renders. */
export interface MetricsSnapshot {
  generatedAt: string;
  inFlight: number;
  last24h: MetricsSeriesPoint[];
  metricsDisabled: boolean;
  perIp: MetricsPerIp[];
  perRoute: MetricsRouteStat[];
  today: MetricsTotals;
  totals: MetricsTotals;
  uptimeSeconds: number;
}

/** One hourly data point (UTC). */
interface MetricsSeriesPoint {
  bucket: string;
  bytesIn: number;
  bytesOut: number;
  errors: number;
  requests: number;
}

/**
 * Aggregated metrics payload served by `GET /metrics` on the backend.
 * Mirrors the backend contract; both sides are versioned together.
 * Table-bound row interfaces extend `Record<string, unknown>` per Astryx's data-driven Table.
 */
interface MetricsTotals {
  avgMs: number;
  bytesIn: number;
  bytesOut: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
  clientErrors: number;
  filesIn: number;
  filesOut: number;
  requests: number;
  scanBlocked: number;
  scanClean: number;
  scanInfected: number;
  serverErrors: number;
}

/** Error carrying the HTTP status returned by the backend. */
export class ApiError extends Error {
  /** HTTP status code returned by the server. */
  readonly status: number;

  /**
   * Creates an ApiError.
   * @param status - HTTP status code returned by the server.
   */
  constructor(status: number) {
    super(`GET /metrics failed with HTTP ${String(status)}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

const TOKEN_STORAGE_KEY = 'file-fly-metrics-token';
const METRICS_URL = '/metrics';

/**
 * Reads the session token, when one was stored for this tab.
 * @returns The stored token, or undefined.
 */
export function metricsToken(): string | undefined {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined;
}

/**
 * Stores or clears the session token.
 * @param token - Token to store, or undefined/empty to clear it.
 */
export function setMetricsToken(token?: string): void {
  if (token === undefined || token.trim().length === 0) {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
}

const metricsRequest = async (): Promise<Response> => {
  const token = metricsToken();
  const response = await fetch(METRICS_URL, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new ApiError(response.status);
  return response;
};

const timedRequest = withTimeoutAsync(metricsRequest, { timeoutMs: 8000 });

/**
 * Fetches the current metrics snapshot.
 *
 * The dashboard polls, so there is deliberately no retry wrapper: the next
 * poll is the retry. Failures surface as `ApiError` for 401/503 and render
 * the token gate / disabled banner.
 * @returns The aggregated metrics snapshot.
 * @throws ApiError When the backend answers with a non-2xx status.
 */
export async function fetchMetrics(): Promise<MetricsSnapshot> {
  const response = await timedRequest();
  return (await response.json()) as MetricsSnapshot;
}
