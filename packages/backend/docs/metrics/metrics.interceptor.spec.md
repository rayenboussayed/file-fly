## Functions

<dl>
<dt><a href="#makeStub">makeStub(options)</a> ⇒ <code>Stub</code></dt>
<dd><p>Minimal Fastify-ish request/reply and CLS stand-ins for the interceptor.</p>
</dd>
<dt><a href="#fire">fire(stub)</a> ⇒ <code>Record&lt;string, unknown&gt;</code></dt>
<dd><p>Runs one request through the interceptor and returns the record passed to metrics.</p>
</dd>
</dl>

<a name="makeStub"></a>

## makeStub(options) ⇒ <code>Stub</code>
Minimal Fastify-ish request/reply and CLS stand-ins for the interceptor.

**Kind**: global function  
**Returns**: <code>Stub</code> - The stub bundle (context, CLS, metrics mocks, raw).  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>{ antiVirusEnabled?: boolean; bytesIn?: number; bytesOut?: number; cacheOutcome?: &quot;hit&quot; \| &quot;miss&quot;; files?: 0 \| 1; fileScan?: { isInfected: boolean; }; headers?: Record&lt;string, string \| string[]&gt;; responseContentLength?: string; routeUrl?: string; statusCode?: number; }</code> | Fixture overrides; all optional. |
| options.routeUrl |  | Route template to expose on `routeOptions`; omit for an unmatched route. |
| options.headers |  | Request headers. |
| options.statusCode |  | Status code for the raw response. |
| options.responseContentLength |  | Value returned by `getHeader('content-length')`. |
| options.antiVirusEnabled |  | Whether the AV integration is configured; defaults to true. |
| options.bytesIn |  | Cumulative bytes-in counter stored on CLS. |
| options.bytesOut |  | Cumulative bytes-out counter stored on CLS. |
| options.files |  | `1` when a media source was opened, `0` otherwise. |
| options.cacheOutcome |  | Cache verdict stored on CLS. |
| options.fileScan |  | Virus-scan verdict stored on CLS. |
| options.fileScan.isInfected |  | True when ClamAV flagged the payload. |

src: packages/backend/src/metrics/metrics.interceptor.spec.ts:43  
<a name="fire"></a>

## fire(stub) ⇒ <code>Record&lt;string, unknown&gt;</code>
Runs one request through the interceptor and returns the record passed to metrics.

**Kind**: global function  
**Returns**: <code>Record&lt;string, unknown&gt;</code> - The argument passed to `metrics.record`.  

| Param | Type | Description |
| --- | --- | --- |
| stub | <code>Stub</code> | Stub bundle from `makeStub`. |

src: packages/backend/src/metrics/metrics.interceptor.spec.ts:103  
