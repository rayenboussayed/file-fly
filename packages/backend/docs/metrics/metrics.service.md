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

## Functions

<dl>
<dt><a href="#allRows">allRows(db, sql, ...params)</a> ⇒ <code>T[]</code></dt>
<dd><p>Runs a prepared statement and returns every row typed as <code>T</code>.</p>
<p>node:sqlite types <code>StatementSync.all()</code> as <code>Record&lt;string, SQLOutputValue&gt;[]</code>,
which is not assignable to a row-specific shape without an intermediate
<code>unknown</code>, so the single cast below is unavoidable.</p>
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
src: packages/backend/src/metrics/metrics.service.ts:249  
dist: packages/backend/dist/metrics/metrics.service.js:73

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
src: packages/backend/src/metrics/metrics.service.ts:286  
dist: packages/backend/dist/metrics/metrics.service.js:99
<a name="MetricsService+inflightDec"></a>

### metricsService.inflightDec()
Decrements the live in-flight counter.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:327  
dist: packages/backend/dist/metrics/metrics.service.js:135
<a name="MetricsService+inflightInc"></a>

### metricsService.inflightInc()
Increments the live in-flight counter.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:334  
dist: packages/backend/dist/metrics/metrics.service.js:138
<a name="MetricsService+onApplicationBootstrap"></a>

### metricsService.onApplicationBootstrap()
Starts the flush and retention timers; never in unit tests.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:341  
dist: packages/backend/dist/metrics/metrics.service.js:141
<a name="MetricsService+onApplicationShutdown"></a>

### metricsService.onApplicationShutdown()
Stops timers, flushes the last deltas and closes the database.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
src: packages/backend/src/metrics/metrics.service.ts:360  
dist: packages/backend/dist/metrics/metrics.service.js:157
<a name="MetricsService+record"></a>

### metricsService.record(record)
Records one completed request.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  

| Param | Type | Description |
| --- | --- | --- |
| record | <code>MetricsRecord</code> | Normalized request data from the interceptor. |

src: packages/backend/src/metrics/metrics.service.ts:371  
dist: packages/backend/dist/metrics/metrics.service.js:163
<a name="MetricsService+snapshot"></a>

### metricsService.snapshot() ⇒ <code>MetricsSnapshot</code>
Builds the aggregated payload the dashboard consumes. Persisted rows are
key-scoped and pending deltas are merged on every call, so the live fields
stay current without a cache layer that could go stale between polls.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  
**Returns**: <code>MetricsSnapshot</code> - The current snapshot.  
src: packages/backend/src/metrics/metrics.service.ts:396  
dist: packages/backend/dist/metrics/metrics.service.js:188
<a name="MetricsService+sweep"></a>

### metricsService.sweep(retentionDays)
Deletes hourly/daily rows older than `retentionDays`.

**Kind**: instance method of [<code>MetricsService</code>](#MetricsService)  

| Param | Type | Description |
| --- | --- | --- |
| retentionDays | <code>number</code> | Days to keep; rows older than this are deleted. |

src: packages/backend/src/metrics/metrics.service.ts:423  
dist: packages/backend/dist/metrics/metrics.service.js:210
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
dist: packages/backend/dist/metrics/metrics.service.js:46
<a name="MAX_DELTA_KEYS"></a>

## MAX\_DELTA\_KEYS
Bounded delta buffers: a persistently failing store drops counts rather than grow memory without limit.

**Kind**: global constant  
src: packages/backend/src/metrics/metrics.service.ts:198  
dist: packages/backend/dist/metrics/metrics.service.js:56
<a name="allRows"></a>

## allRows(db, sql, ...params) ⇒ <code>T[]</code>
Runs a prepared statement and returns every row typed as `T`.

node:sqlite types `StatementSync.all()` as `Record<string, SQLOutputValue>[]`,
which is not assignable to a row-specific shape without an intermediate
`unknown`, so the single cast below is unavoidable.

**Kind**: global function  
**Returns**: <code>T[]</code> - All result rows as `T[]`.  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>DatabaseSync</code> | Open SQLite database. |
| sql | <code>string</code> | SQL text to prepare (passed through verbatim). |
| ...params | <code>import(&quot;node:sqlite&quot;).SQLInputValue[]</code> | Bound parameters for the statement. |

src: packages/backend/src/metrics/metrics.service.ts:701  
dist: packages/backend/dist/metrics/metrics.service.js:500
