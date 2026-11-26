## Members

<dl>
<dt><a href="#MetricsInterceptor">MetricsInterceptor</a></dt>
<dd><p>Records one metric per completed HTTP request.</p>
<p>Bytes are taken from CLS (written by the stream meters) and fall back to the
<code>content-length</code> headers otherwise; an empty streamed response still counts
as a file out (the meter records 0 bytes, not a missing value). <code>filesOut</code>
therefore keys off the CLS meter being installed, not the byte count.
Self-instrumenting routes (<code>/metrics</code>, <code>/health</code>) are skipped. Registered
after <code>ClsInterceptor</code>, so the CLS context exists.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#EXCLUDED_ROUTES">EXCLUDED_ROUTES</a></dt>
<dd><p>Routes excluded from instrumentation to avoid self-observation feedback.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#headerNumber">headerNumber(value)</a> ⇒ <code>number</code></dt>
<dd><p>Turns a comma-separated or single-value header into a non-negative integer.</p>
</dd>
<dt><a href="#scanOutcome">scanOutcome(fileScan, isAntiVirusEnabled, status)</a> ⇒ <code>&quot;blocked&quot; | &quot;clean&quot; | &quot;infected&quot;</code></dt>
<dd><p>Derives the scan verdict from the data already on CLS and the status code.</p>
</dd>
</dl>

<a name="MetricsInterceptor"></a>

## MetricsInterceptor
Records one metric per completed HTTP request.

Bytes are taken from CLS (written by the stream meters) and fall back to the
`content-length` headers otherwise; an empty streamed response still counts
as a file out (the meter records 0 bytes, not a missing value). `filesOut`
therefore keys off the CLS meter being installed, not the byte count.
Self-instrumenting routes (`/metrics`, `/health`) are skipped. Registered
after `ClsInterceptor`, so the CLS context exists.

**Kind**: global variable  
src: packages/backend/src/metrics/metrics.interceptor.ts:64  
dist: packages/backend/dist/metrics/metrics.interceptor.js:30
<a name="EXCLUDED_ROUTES"></a>

## EXCLUDED\_ROUTES
Routes excluded from instrumentation to avoid self-observation feedback.

**Kind**: global constant  
src: packages/backend/src/metrics/metrics.interceptor.ts:19  
dist: packages/backend/dist/metrics/metrics.interceptor.js:14
<a name="headerNumber"></a>

## headerNumber(value) ⇒ <code>number</code>
Turns a comma-separated or single-value header into a non-negative integer.

**Kind**: global function  
**Returns**: <code>number</code> - Parsed size in bytes, or 0 when absent or invalid.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string \| number \| string[]</code> | Raw header value from a Fastify request or reply. |

src: packages/backend/src/metrics/metrics.interceptor.ts:26  
dist: packages/backend/dist/metrics/metrics.interceptor.js:15
<a name="scanOutcome"></a>

## scanOutcome(fileScan, isAntiVirusEnabled, status) ⇒ <code>&quot;blocked&quot; \| &quot;clean&quot; \| &quot;infected&quot;</code>
Derives the scan verdict from the data already on CLS and the status code.

**Kind**: global function  
**Returns**: <code>&quot;blocked&quot; \| &quot;clean&quot; \| &quot;infected&quot;</code> - The verdict to record, or undefined for non-scanner routes.  

| Param | Type | Description |
| --- | --- | --- |
| fileScan | <code>{ isInfected: boolean; }</code> | The scan verdict recorded on CLS, when present. |
| isAntiVirusEnabled | <code>boolean</code> | Whether the scanner perimeter is active. |
| status | <code>number</code> | Status code sent to the client. |

src: packages/backend/src/metrics/metrics.interceptor.ts:43  
dist: packages/backend/dist/metrics/metrics.interceptor.js:23
