## Members

<dl>
<dt><a href="#CACHE_DIR">CACHE_DIR</a></dt>
<dd><p>Cache root; the directory is created at startup.</p>
</dd>
<dt><a href="#CACHE_MAX_BYTES">CACHE_MAX_BYTES</a></dt>
<dd><p>Soft cap for the whole cache dir; oldest-used entries are evicted first.</p>
</dd>
<dt><a href="#CACHE_SWEEP_INTERVAL_MS">CACHE_SWEEP_INTERVAL_MS</a></dt>
<dd><p>How often the cache janitor sweeps.</p>
</dd>
<dt><a href="#CACHE_TMP_MAX_AGE_MS">CACHE_TMP_MAX_AGE_MS</a></dt>
<dd><p>Orphaned *.tmp files (crashed writers) older than this are removed.</p>
</dd>
<dt><a href="#CACHE_TTL_MS">CACHE_TTL_MS</a></dt>
<dd><p>Entries not used for this long are evicted.</p>
</dd>
<dt><a href="#CLAMAV_HOST">CLAMAV_HOST</a></dt>
<dd><p>Host of the clamd daemon; unset = virus scanning skipped with a warning.</p>
</dd>
<dt><a href="#CLAMAV_MAX_BYTES">CLAMAV_MAX_BYTES</a></dt>
<dd><p>Bodies larger than this are rejected 413 before scanning so clamd&#39;s INSTREAM size limit is never hit; raise together with clamd.conf StreamMaxLength.</p>
</dd>
<dt><a href="#CLAMAV_PORT">CLAMAV_PORT</a></dt>
<dd><p>Port of the clamd daemon; must be set together with CLAMAV_HOST.</p>
</dd>
<dt><a href="#CLAMAV_TIMEOUT_MS">CLAMAV_TIMEOUT_MS</a></dt>
<dd><p>Clamd socket connect timeout passed to clamdscan.</p>
</dd>
<dt><a href="#DASHBOARD_DIR">DASHBOARD_DIR</a></dt>
<dd><p>Static root for the dashboard build (<code>packages/dashboard/dist</code>); missing dir = dashboard not served.</p>
</dd>
<dt><a href="#LOG_LEVEL">LOG_LEVEL</a></dt>
<dd><p>pino log level; unset (or blank) = <code>info</code> in production, <code>debug</code> otherwise. Invalid values are rejected at boot.</p>
</dd>
<dt><a href="#METRICS_DIR">METRICS_DIR</a></dt>
<dd><p>Directory holding <code>metrics.db</code>; created at startup. Kept out of <code>CACHE_DIR</code> on purpose.</p>
</dd>
<dt><a href="#METRICS_FLUSH_INTERVAL_MS">METRICS_FLUSH_INTERVAL_MS</a></dt>
<dd><p>Flush interval for the in-memory metric deltas. <code>0</code> disables the timer.</p>
</dd>
<dt><a href="#METRICS_RETENTION_DAYS">METRICS_RETENTION_DAYS</a></dt>
<dd><p>Retention for the metrics tables. <code>0</code> disables the sweep; defaults to 35 days.</p>
</dd>
<dt><a href="#METRICS_TOKEN">METRICS_TOKEN</a></dt>
<dd><p>Bearer token for <code>GET /metrics</code>; production refuses requests without it. Unset in development = open.</p>
</dd>
<dt><a href="#TESSERACT_DIR">TESSERACT_DIR</a></dt>
<dd><p>Language data for tesseract.js; defaults to <code>&lt;CACHE_DIR&gt;/tesseract</code>.</p>
</dd>
<dt><a href="#TRUST_PROXY">TRUST_PROXY</a></dt>
<dd><p>Honor <code>X-Forwarded-For</code> for <code>request.ip</code> (set only behind a trusted proxy).</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#DEFAULT_CACHE_DIR">DEFAULT_CACHE_DIR</a></dt>
<dd><p>Absolute default cache root, used when <code>CACHE_DIR</code> is unset or blank.</p>
</dd>
<dt><a href="#DEFAULT_METRICS_DIR">DEFAULT_METRICS_DIR</a></dt>
<dd><p>Absolute default metrics root, used when <code>METRICS_DIR</code> is unset or blank.</p>
</dd>
<dt><a href="#DEFAULT_DASHBOARD_DIR">DEFAULT_DASHBOARD_DIR</a></dt>
<dd><p>Default static root for the dashboard build output, used when <code>DASHBOARD_DIR</code> is unset or blank.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#numericFromEnv">numericFromEnv(fallback)</a> ⇒ <code>z.ZodPreprocess&lt;z.ZodCatch&lt;z.ZodCoercedNumber&lt;unknown&gt;&gt;, unknown&gt;</code></dt>
<dd><p>Numeric env var handling:</p>
<ul>
<li>blank strings (whitespace included) are treated as unset, matching <code>process.env.X || fallback</code> ergonomics
(<code>Number(&#39;&#39;) === 0</code> would otherwise silently pass),</li>
<li>non-numeric and non-positive values fall back instead of throwing.</li>
</ul>
</dd>
</dl>

<a name="CACHE_DIR"></a>

## CACHE\_DIR
Cache root; the directory is created at startup.

**Kind**: global variable  
src: packages/backend/src/environment.ts:32  
dist: packages/backend/dist/environment.js:11
<a name="CACHE_MAX_BYTES"></a>

## CACHE\_MAX\_BYTES
Soft cap for the whole cache dir; oldest-used entries are evicted first.

**Kind**: global variable  
src: packages/backend/src/environment.ts:34  
dist: packages/backend/dist/environment.js:12
<a name="CACHE_SWEEP_INTERVAL_MS"></a>

## CACHE\_SWEEP\_INTERVAL\_MS
How often the cache janitor sweeps.

**Kind**: global variable  
src: packages/backend/src/environment.ts:36  
dist: packages/backend/dist/environment.js:13
<a name="CACHE_TMP_MAX_AGE_MS"></a>

## CACHE\_TMP\_MAX\_AGE\_MS
Orphaned *.tmp files (crashed writers) older than this are removed.

**Kind**: global variable  
src: packages/backend/src/environment.ts:38  
dist: packages/backend/dist/environment.js:14
<a name="CACHE_TTL_MS"></a>

## CACHE\_TTL\_MS
Entries not used for this long are evicted.

**Kind**: global variable  
src: packages/backend/src/environment.ts:41  
dist: packages/backend/dist/environment.js:15
<a name="CLAMAV_HOST"></a>

## CLAMAV\_HOST
Host of the clamd daemon; unset = virus scanning skipped with a warning.

**Kind**: global variable  
src: packages/backend/src/environment.ts:43  
dist: packages/backend/dist/environment.js:16
<a name="CLAMAV_MAX_BYTES"></a>

## CLAMAV\_MAX\_BYTES
Bodies larger than this are rejected 413 before scanning so clamd's INSTREAM size limit is never hit; raise together with clamd.conf StreamMaxLength.

**Kind**: global variable  
src: packages/backend/src/environment.ts:45  
dist: packages/backend/dist/environment.js:17
<a name="CLAMAV_PORT"></a>

## CLAMAV\_PORT
Port of the clamd daemon; must be set together with CLAMAV_HOST.

**Kind**: global variable  
src: packages/backend/src/environment.ts:47  
dist: packages/backend/dist/environment.js:18
<a name="CLAMAV_TIMEOUT_MS"></a>

## CLAMAV\_TIMEOUT\_MS
Clamd socket connect timeout passed to clamdscan.

**Kind**: global variable  
src: packages/backend/src/environment.ts:49  
dist: packages/backend/dist/environment.js:19
<a name="DASHBOARD_DIR"></a>

## DASHBOARD\_DIR
Static root for the dashboard build (`packages/dashboard/dist`); missing dir = dashboard not served.

**Kind**: global variable  
src: packages/backend/src/environment.ts:53  
dist: packages/backend/dist/environment.js:21
<a name="LOG_LEVEL"></a>

## LOG\_LEVEL
pino log level; unset (or blank) = `info` in production, `debug` otherwise. Invalid values are rejected at boot.

**Kind**: global variable  
src: packages/backend/src/environment.ts:57  
dist: packages/backend/dist/environment.js:23
<a name="METRICS_DIR"></a>

## METRICS\_DIR
Directory holding `metrics.db`; created at startup. Kept out of `CACHE_DIR` on purpose.

**Kind**: global variable  
src: packages/backend/src/environment.ts:63  
dist: packages/backend/dist/environment.js:24
<a name="METRICS_FLUSH_INTERVAL_MS"></a>

## METRICS\_FLUSH\_INTERVAL\_MS
Flush interval for the in-memory metric deltas. `0` disables the timer.

**Kind**: global variable  
src: packages/backend/src/environment.ts:65  
dist: packages/backend/dist/environment.js:25
<a name="METRICS_RETENTION_DAYS"></a>

## METRICS\_RETENTION\_DAYS
Retention for the metrics tables. `0` disables the sweep; defaults to 35 days.

**Kind**: global variable  
src: packages/backend/src/environment.ts:67  
dist: packages/backend/dist/environment.js:26
<a name="METRICS_TOKEN"></a>

## METRICS\_TOKEN
Bearer token for `GET /metrics`; production refuses requests without it. Unset in development = open.

**Kind**: global variable  
src: packages/backend/src/environment.ts:69  
dist: packages/backend/dist/environment.js:27
<a name="TESSERACT_DIR"></a>

## TESSERACT\_DIR
Language data for tesseract.js; defaults to `<CACHE_DIR>/tesseract`.

**Kind**: global variable  
src: packages/backend/src/environment.ts:74  
dist: packages/backend/dist/environment.js:29
<a name="TRUST_PROXY"></a>

## TRUST\_PROXY
Honor `X-Forwarded-For` for `request.ip` (set only behind a trusted proxy).

**Kind**: global variable  
src: packages/backend/src/environment.ts:80  
dist: packages/backend/dist/environment.js:34
<a name="DEFAULT_CACHE_DIR"></a>

## DEFAULT\_CACHE\_DIR
Absolute default cache root, used when `CACHE_DIR` is unset or blank.

**Kind**: global constant  
src: packages/backend/src/environment.ts:5  
dist: packages/backend/dist/environment.js:3
<a name="DEFAULT_METRICS_DIR"></a>

## DEFAULT\_METRICS\_DIR
Absolute default metrics root, used when `METRICS_DIR` is unset or blank.

**Kind**: global constant  
src: packages/backend/src/environment.ts:7  
dist: packages/backend/dist/environment.js:4
<a name="DEFAULT_DASHBOARD_DIR"></a>

## DEFAULT\_DASHBOARD\_DIR
Default static root for the dashboard build output, used when `DASHBOARD_DIR` is unset or blank.

**Kind**: global constant  
src: packages/backend/src/environment.ts:9  
dist: packages/backend/dist/environment.js:5
<a name="numericFromEnv"></a>

## numericFromEnv(fallback) ⇒ <code>z.ZodPreprocess&lt;z.ZodCatch&lt;z.ZodCoercedNumber&lt;unknown&gt;&gt;, unknown&gt;</code>
Numeric env var handling:
- blank strings (whitespace included) are treated as unset, matching `process.env.X || fallback` ergonomics
  (`Number('') === 0` would otherwise silently pass),
- non-numeric and non-positive values fall back instead of throwing.

**Kind**: global function  
**Returns**: <code>z.ZodPreprocess&lt;z.ZodCatch&lt;z.ZodCoercedNumber&lt;unknown&gt;&gt;, unknown&gt;</code> - Zod schema coercing to a positive integer with the fallback applied.  

| Param | Type | Description |
| --- | --- | --- |
| fallback | <code>number</code> | Value used when the env var is unset, blank or invalid. |

src: packages/backend/src/environment.ts:19  
dist: packages/backend/dist/environment.js:6
