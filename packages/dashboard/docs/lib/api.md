## Classes

<dl>
<dt><a href="#ApiError">ApiError</a></dt>
<dd><p>Error carrying the HTTP status returned by the backend.</p>
</dd>
<dt><a href="#MetricsContractError">MetricsContractError</a></dt>
<dd><p>Error thrown when a successful response does not match the metrics contract.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#metricsSnapshotSchema">metricsSnapshotSchema</a></dt>
<dd><p>Runtime contract for the payload served by <code>GET /metrics</code>.
Mirrors docs/metrics.md and the backend&#39;s metrics service; both sides ship together.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#metricsToken">metricsToken()</a> ⇒ <code>string</code></dt>
<dd><p>Reads the session token, when one was stored for this tab.</p>
</dd>
<dt><a href="#setMetricsToken">setMetricsToken(token)</a></dt>
<dd><p>Stores or clears the session token.</p>
</dd>
<dt><a href="#fetchMetrics">fetchMetrics()</a> ⇒ <code>Promise&lt;{ generatedAt: string; inFlight: number; last24h: { bucket: string; bytesIn: number; bytesOut: number; errors: number; requests: number; }[]; metricsDisabled: boolean; perIp: { [x: string]: unknown; bytesIn: number; bytesOut: number; filesIn: number; filesOut: number; ip: string; requests: number; }[]; perRoute: { [x: string]: unknown; avgMs: number; bytesOut: number; errors: number; p50: number; p95: number; p99: number; requests: number; route: string; }[]; today: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; totals: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; uptimeSeconds: number; }&gt;</code></dt>
<dd><p>Fetches and validates the current metrics snapshot.</p>
<p>The dashboard polls, so there is deliberately no retry wrapper: the next
poll is the retry. Failures surface as <code>ApiError</code> for 401/503 and render
the token gate / disabled banner. A payload that does not match the contract
becomes the same generic error, since it may contain client IPs.</p>
</dd>
</dl>

<a name="ApiError"></a>

## ApiError
Error carrying the HTTP status returned by the backend.

**Kind**: global class  
src: packages/dashboard/src/lib/api.ts:77  

* [ApiError](#ApiError)
    * [new ApiError(status)](#new_ApiError_new)
    * [.status](#ApiError+status)

<a name="new_ApiError_new"></a>

### new ApiError(status)
Creates an ApiError.


| Param | Type | Description |
| --- | --- | --- |
| status | <code>number</code> | HTTP status code returned by the server. |

<a name="ApiError+status"></a>

### apiError.status
HTTP status code returned by the server.

**Kind**: instance property of [<code>ApiError</code>](#ApiError)  
src: packages/dashboard/src/lib/api.ts:79  
<a name="MetricsContractError"></a>

## MetricsContractError
Error thrown when a successful response does not match the metrics contract.

**Kind**: global class  
src: packages/dashboard/src/lib/api.ts:93  
<a name="new_MetricsContractError_new"></a>

### new MetricsContractError()
Creates a contract error with a fixed message that never echoes the payload.

<a name="metricsSnapshotSchema"></a>

## metricsSnapshotSchema
Runtime contract for the payload served by `GET /metrics`.
Mirrors docs/metrics.md and the backend's metrics service; both sides ship together.

**Kind**: global constant  
src: packages/dashboard/src/lib/api.ts:55  
<a name="metricsToken"></a>

## metricsToken() ⇒ <code>string</code>
Reads the session token, when one was stored for this tab.

**Kind**: global function  
**Returns**: <code>string</code> - The stored token, or undefined.  
src: packages/dashboard/src/lib/api.ts:108  
<a name="setMetricsToken"></a>

## setMetricsToken(token)
Stores or clears the session token.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>string</code> | Token to store, or undefined/empty to clear it. |

src: packages/dashboard/src/lib/api.ts:116  
<a name="fetchMetrics"></a>

## fetchMetrics() ⇒ <code>Promise&lt;{ generatedAt: string; inFlight: number; last24h: { bucket: string; bytesIn: number; bytesOut: number; errors: number; requests: number; }[]; metricsDisabled: boolean; perIp: { [x: string]: unknown; bytesIn: number; bytesOut: number; filesIn: number; filesOut: number; ip: string; requests: number; }[]; perRoute: { [x: string]: unknown; avgMs: number; bytesOut: number; errors: number; p50: number; p95: number; p99: number; requests: number; route: string; }[]; today: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; totals: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; uptimeSeconds: number; }&gt;</code>
Fetches and validates the current metrics snapshot.

The dashboard polls, so there is deliberately no retry wrapper: the next
poll is the retry. Failures surface as `ApiError` for 401/503 and render
the token gate / disabled banner. A payload that does not match the contract
becomes the same generic error, since it may contain client IPs.

**Kind**: global function  
**Returns**: <code>Promise&lt;{ generatedAt: string; inFlight: number; last24h: { bucket: string; bytesIn: number; bytesOut: number; errors: number; requests: number; }[]; metricsDisabled: boolean; perIp: { [x: string]: unknown; bytesIn: number; bytesOut: number; filesIn: number; filesOut: number; ip: string; requests: number; }[]; perRoute: { [x: string]: unknown; avgMs: number; bytesOut: number; errors: number; p50: number; p95: number; p99: number; requests: number; route: string; }[]; today: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; totals: { avgMs: number; bytesIn: number; bytesOut: number; cacheHitRate: number; cacheHits: number; cacheMisses: number; clientErrors: number; filesIn: number; filesOut: number; requests: number; scanBlocked: number; scanClean: number; scanInfected: number; serverErrors: number; }; uptimeSeconds: number; }&gt;</code> - The aggregated metrics snapshot.  
**Throws**:

- ApiError When the backend answers with a non-2xx status.
- MetricsContractError When the payload does not match the documented contract.

src: packages/dashboard/src/lib/api.ts:146  
