import { withTimeoutAsync } from 'jutilities/hof/timeout';
import { z } from 'zod';

const metricsTotalsSchema = z.object({
  avgMs: z.number(),
  bytesIn: z.number(),
  bytesOut: z.number(),
  cacheHitRate: z.number(),
  cacheHits: z.number(),
  cacheMisses: z.number(),
  clientErrors: z.number(),
  filesIn: z.number(),
  filesOut: z.number(),
  requests: z.number(),
  scanBlocked: z.number(),
  scanClean: z.number(),
  scanInfected: z.number(),
  serverErrors: z.number(),
});

// Astryx Table constrains rows to Record<string, unknown>; passthrough supplies
// the index signature and preserves extra keys the backend may add.
const metricsPerIpSchema = z.object({
  bytesIn: z.number(),
  bytesOut: z.number(),
  filesIn: z.number(),
  filesOut: z.number(),
  ip: z.string(),
  requests: z.number(),
}).passthrough();

const metricsRouteStatSchema = z.object({
  avgMs: z.number(),
  bytesOut: z.number(),
  errors: z.number(),
  p50: z.number(),
  p95: z.number(),
  p99: z.number(),
  requests: z.number(),
  route: z.string(),
}).passthrough();

const metricsSeriesPointSchema = z.object({
  bucket: z.string(),
  bytesIn: z.number(),
  bytesOut: z.number(),
  errors: z.number(),
  requests: z.number(),
});

/**
 * Runtime contract for the payload served by `GET /metrics`.
 * Mirrors docs/metrics.md and the backend's metrics service; both sides ship together.
 */
export const metricsSnapshotSchema = z.object({
  generatedAt: z.string(),
  inFlight: z.number(),
  last24h: z.array(metricsSeriesPointSchema),
  metricsDisabled: z.boolean(),
  perIp: z.array(metricsPerIpSchema),
  perRoute: z.array(metricsRouteStatSchema),
  today: metricsTotalsSchema,
  totals: metricsTotalsSchema,
  uptimeSeconds: z.number(),
});

/** Counters for one client IP over the retained window. */
export type MetricsPerIp = z.infer<typeof metricsPerIpSchema>;

/** Latency and volume statistics for one route template. */
export type MetricsRouteStat = z.infer<typeof metricsRouteStatSchema>;

/** Everything the dashboard renders. */
export type MetricsSnapshot = z.infer<typeof metricsSnapshotSchema>;

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

/** Error thrown when a successful response does not match the metrics contract. */
export class MetricsContractError extends Error {
  /** Creates a contract error with a fixed message that never echoes the payload. */
  constructor() {
    super('GET /metrics returned an unexpected payload');
    this.name = 'MetricsContractError';
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
 * Fetches and validates the current metrics snapshot.
 *
 * The dashboard polls, so there is deliberately no retry wrapper: the next
 * poll is the retry. Failures surface as `ApiError` for 401/503 and render
 * the token gate / disabled banner. A payload that does not match the contract
 * becomes the same generic error, since it may contain client IPs.
 * @returns The aggregated metrics snapshot.
 * @throws ApiError When the backend answers with a non-2xx status.
 * @throws MetricsContractError When the payload does not match the documented contract.
 */
export async function fetchMetrics(): Promise<MetricsSnapshot> {
  const response = await timedRequest();
  const parsed = metricsSnapshotSchema.safeParse(await response.json());
  if (!parsed.success) throw new MetricsContractError();
  return parsed.data;
}
