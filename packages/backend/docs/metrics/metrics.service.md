## Members

<dl>
<dt><a href="#MetricsService">MetricsService</a></dt>
<dd><p>Persistent, coalesced metrics store.</p>
<p>Writes never happen on the request path: <code>record()</code> bumps in-memory delta
maps, and a timer (created in <code>onApplicationBootstrap</code>) drains them into a
single transaction every <code>flushIntervalMs</code>. Reads merge pending deltas over
the persisted rows, so the payload is always fresh. A failed store logs and
disables itself; media serving is never affected.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#SCHEMA_VERSION">SCHEMA_VERSION</a></dt>
<dd><p>Current schema version; kept in sync with the DDL below.</p>
</dd>
<dt><a href="#HISTOGRAM_LE">HISTOGRAM_LE</a></dt>
<dd><p>Latency histogram upper bounds, in seconds; 999999 is the open-ended bucket.</p>
</dd>
<dt><a href="#INDEX_DDL">INDEX_DDL</a></dt>
<dd><p>Indexes for the retention sweep (bucket prefix) and the name-keyed rollups.
Idempotent so an existing version-1 database gains them on the next open.</p>
</dd>
<dt><a href="#MAX_DELTA_KEYS">MAX_DELTA_KEYS</a></dt>
<dd><p>Bounded delta buffers: a persistently failing store drops counts rather than grow memory without limit.</p>
</dd>
</dl>

<a name="MetricsService"></a>

## MetricsService
Persistent, coalesced metrics store.

Writes never happen on the request path: `record()` bumps in-memory delta
maps, and a timer (created in `onApplicationBootstrap`) drains them into a
single transaction every `flushIntervalMs`. Reads merge pending deltas over
the persisted rows, so the payload is always fresh. A failed store logs and
disables itself; media serving is never affected.

**Kind**: global variable  
src: packages/backend/src/metrics/metrics.service.ts:227  
dist: packages/backend/dist/metrics/metrics.service.js:77

* [MetricsService](#MetricsService)
    * [.flush()](#MetricsService+flush)
    * [.inflightDec()](#MetricsService+inflightDec)
    * [.inflightInc()](#MetricsService+inflightInc)
    * [.onApplicationBootstrap()](#MetricsService+onApplicationBootstrap)
    * [.onApplicationShutdown()](#MetricsService+onApplicationShutdown)
    * [.record(record)](#MetricsService+record)
    * [.snapshot()](#MetricsService+snapshot) ⇒ <code>MetricsSnapshot</code>
    * [.sweep(retentionDays)](#MetricsService+sweep)

<a name="MetricsService+flush"></a>

### metricsService.flush()
Drains all pending deltas into a single transaction.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:264  
dist: packages/backend/dist/metrics/metrics.service.js:105
<a name="MetricsService+inflightDec"></a>

### metricsService.inflightDec()
Decrements the live in-flight counter.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:305  
dist: packages/backend/dist/metrics/metrics.service.js:198 (approx.)
<a name="MetricsService+inflightInc"></a>

### metricsService.inflightInc()
Increments the live in-flight counter.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:312  
dist: packages/backend/dist/metrics/metrics.service.js:140
<a name="MetricsService+onApplicationBootstrap"></a>

### metricsService.onApplicationBootstrap()
Starts the flush and retention timers; never in unit tests.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:319  
dist: packages/backend/dist/metrics/metrics.service.js:147
<a name="MetricsService+onApplicationShutdown"></a>

### metricsService.onApplicationShutdown()
Stops timers, flushes the last deltas and closes the database.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:338  
dist: packages/backend/dist/metrics/metrics.service.js:157
<a name="MetricsService+record"></a>

### metricsService.record(record)
Records one completed request.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  

| Param | Type | Description |
| --- | --- | --- |
| record | <code>MetricsRecord</code> | Normalized request data from the interceptor. |

src: packages/backend/src/metrics/metrics.service.ts:349  
dist: packages/backend/dist/metrics/metrics.service.js:174
<a name="MetricsService+snapshot"></a>

### metricsService.snapshot() ⇒ <code>MetricsSnapshot</code>
Builds the aggregated payload the dashboard consumes. Persisted rows are
key-scoped and pending deltas are merged on every call, so the live fields
stay current without a cache layer that could go stale between polls.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
**Returns**: <code>MetricsSnapshot</code> - The current snapshot.  
src: packages/backend/src/metrics/metrics.service.ts:374  
dist: packages/backend/dist/metrics/metrics.service.js:195
<a name="MetricsService+sweep"></a>

### metricsService.sweep(retentionDays)
Deletes hourly/daily rows older than `retentionDays`.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  

| Param | Type | Description |
| --- | --- | --- |
| retentionDays | <code>number</code> | Days to keep; rows older than this are deleted. |

src: packages/backend/src/metrics/metrics.service.ts:401  
dist: packages/backend/dist/metrics/metrics.service.js:214
<a name="SCHEMA_VERSION"></a>

## SCHEMA\_VERSION
Current schema version; kept in sync with the DDL below.

**Kind**: global constant  
src: packages/backend/src/metrics/metrics.service.ts:16  
dist: packages/backend/dist/metrics/metrics.service.js:19
<a name="HISTOGRAM_LE"></a>

## HISTOGRAM\_LE
Latency histogram upper bounds, in seconds; 999999 is the open-ended bucket.

**Kind**: global constant  
**Remarks**: Chosen to stay readable on a linear axis for a media service.  
src: packages/backend/src/metrics/metrics.service.ts:22  
dist: packages/backend/dist/metrics/metrics.service.js:20
<a name="INDEX_DDL"></a>

## INDEX\_DDL
Indexes for the retention sweep (bucket prefix) and the name-keyed rollups.
Idempotent so an existing version-1 database gains them on the next open.

**Kind**: global constant  
src: packages/backend/src/metrics/metrics.service.ts:54  
dist: packages/backend/dist/metrics/metrics.service.js:77 (approx.)
<a name="MAX_DELTA_KEYS"></a>

## MAX\_DELTA\_KEYS
Bounded delta buffers: a persistently failing store drops counts rather than grow memory without limit.

**Kind**: global constant  
src: packages/backend/src/metrics/metrics.service.ts:198  
dist: packages/backend/dist/metrics/metrics.service.js:60
