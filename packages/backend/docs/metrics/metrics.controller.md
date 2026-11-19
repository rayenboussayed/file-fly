## Members

<dl>
<dt><a href="#MetricsController">MetricsController</a></dt>
<dd><p>Read-only metrics and liveness endpoints for the dashboard.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#bearerMatches">bearerMatches(actual, expected)</a> ⇒ <code>boolean</code></dt>
<dd><p>Constant-time comparison of bearer tokens.</p>
</dd>
</dl>

<a name="MetricsController"></a>

## MetricsController
Read-only metrics and liveness endpoints for the dashboard.

**Kind**: global variable  
src: packages/backend/src/metrics/metrics.controller.ts:30  
dist: packages/backend/dist/metrics/metrics.controller.js:24

* [MetricsController](#MetricsController)
    * [.healthGet()](#MetricsController+healthGet) ⇒ <code>{ status: string; timestamp: string; uptimeSeconds: number; }</code>
    * [.metricsGet(authorization)](#MetricsController+metricsGet) ⇒ <code>MetricsSnapshot</code>

<a name="MetricsController+healthGet"></a>

### metricsController.healthGet() ⇒ <code>{ status: string; timestamp: string; uptimeSeconds: number; }</code>
Liveness probe for Docker HEALTHCHECK and uptime checks.

**Kind**: instance method of [<code>MetricsController</code>](#MetricsController)  
**Returns**: <code>{ status: string; timestamp: string; uptimeSeconds: number; }</code> - Status, uptime in seconds and the current timestamp.  
src: packages/backend/src/metrics/metrics.controller.ts:38  
dist: packages/backend/dist/metrics/metrics.controller.js:29
<a name="MetricsController+metricsGet"></a>

### metricsController.metricsGet(authorization) ⇒ <code>MetricsSnapshot</code>
Full metrics payload for the dashboard.

Requires `METRICS_TOKEN` as a bearer token; in production, a missing
`METRICS_TOKEN` disables the route (503) so per-IP data is never public.

**Kind**: instance method of [<code>MetricsController</code>](#MetricsController)  
**Returns**: <code>MetricsSnapshot</code> - The aggregated metrics snapshot.  
**Throws**:

- ServiceUnavailableException Production is missing `METRICS_TOKEN`.
- UnauthorizedException The bearer token is missing or wrong.


| Param | Type | Description |
| --- | --- | --- |
| authorization | <code>string</code> | The `Authorization` header, if present. |

src: packages/backend/src/metrics/metrics.controller.ts:57  
dist: packages/backend/dist/metrics/metrics.controller.js:36
<a name="bearerMatches"></a>

## bearerMatches(actual, expected) ⇒ <code>boolean</code>
Constant-time comparison of bearer tokens.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when both strings are byte-equal.  

| Param | Type | Description |
| --- | --- | --- |
| actual | <code>string</code> | The `Authorization` header sent by the client, if any. |
| expected | <code>string</code> | The token the server requires. |

src: packages/backend/src/metrics/metrics.controller.ts:21  
dist: packages/backend/dist/metrics/metrics.controller.js:18
