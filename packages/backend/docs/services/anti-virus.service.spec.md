## Functions

<dl>
<dt><a href="#defaultEnv">defaultEnv()</a> ⇒ <code>{ CLAMAV_HOST: string; CLAMAV_MAX_BYTES: number; CLAMAV_PORT: number; CLAMAV_TIMEOUT_MS: number; }</code></dt>
<dd><p>Default mocked environment, restored before/after every test.</p>
</dd>
<dt><a href="#freshScanResult">freshScanResult()</a> ⇒ <code>{ file: any; isInfected: boolean | null; viruses: string[]; }</code></dt>
<dd></dd>
<dt><a href="#env">env()</a> ⇒ <code>Record&lt;string, unknown&gt;</code></dt>
<dd><p>The mocked environment; tests may mutate it, <code>beforeEach</code>/<code>afterEach</code>
restore the defaults.</p>
</dd>
<dt><a href="#asHttpException">asHttpException(error)</a> ⇒ <code>{ getResponse: () &#x3D;&gt; unknown; getStatus: () &#x3D;&gt; number; }</code></dt>
<dd><p>Asserts that an error carries the shape of an HTTP exception.</p>
</dd>
<dt><a href="#branchOf">branchOf(bytes)</a> ⇒ <code>Readable</code></dt>
<dd><p>Builds a fresh branch stream carrying the given number of bytes.</p>
</dd>
<dt><a href="#catchException">catchException(promise)</a> ⇒ <code>Promise&lt;{ getResponse: () &#x3D;&gt; unknown; getStatus: () &#x3D;&gt; number; }&gt;</code></dt>
<dd><p>Awaits a scan expected to reject and returns the thrown exception.</p>
</dd>
<dt><a href="#createService">createService()</a> ⇒ <code>Promise&lt;{ cls: { get: &lt;T&gt;(key: symbol) &#x3D;&gt; T; set: (key: symbol, value: unknown) &#x3D;&gt; Map&lt;symbol, unknown&gt;; }; normalizedCls: import(&quot;./normalized-cls.service.js&quot;).NormalizedClsService; service: import(&quot;./anti-virus.service.js&quot;).AntiVirusService; sourceDestroy: import(&quot;vitest&quot;).Mock&lt;import(&quot;@vitest/spy&quot;).Procedure&gt;; store: Map&lt;symbol, unknown&gt;; }&gt;</code></dt>
<dd><p>Builds a fresh <code>AntiVirusService</code> wired to a real <code>NormalizedClsService</code>
over a stubbed <code>ClsService</code>, isolating the module graph per test.</p>
</dd>
<dt><a href="#stubRequest">stubRequest(store, contentLength)</a></dt>
<dd><p>Points CLS at a request carrying the given content-length, or deletes it.</p>
</dd>
</dl>

<a name="defaultEnv"></a>

## defaultEnv() ⇒ <code>{ CLAMAV\_HOST: string; CLAMAV\_MAX\_BYTES: number; CLAMAV\_PORT: number; CLAMAV\_TIMEOUT\_MS: number; }</code>
Default mocked environment, restored before/after every test.

**Kind**: global function  
**Returns**: <code>{ CLAMAV\_HOST: string; CLAMAV\_MAX\_BYTES: number; CLAMAV\_PORT: number; CLAMAV\_TIMEOUT\_MS: number; }</code> - The default mocked CLAMAV_* environment values.  
src: packages/backend/src/services/anti-virus.service.spec.ts:11  
<a name="freshScanResult"></a>

## freshScanResult() ⇒ <code>{ file: any; isInfected: boolean \| null; viruses: string[]; }</code>
**Kind**: global function  
**Returns**: <code>{ file: any; isInfected: boolean \| null; viruses: string[]; }</code> - A clean scan verdict, as `_processResult` would produce it.  
src: packages/backend/src/services/anti-virus.service.spec.ts:19  
<a name="env"></a>

## env() ⇒ <code>Record&lt;string, unknown&gt;</code>
The mocked environment; tests may mutate it, `beforeEach`/`afterEach`
restore the defaults.

**Kind**: global function  
**Returns**: <code>Record&lt;string, unknown&gt;</code> - The stable mocked environment object.  
src: packages/backend/src/services/anti-virus.service.spec.ts:30  
<a name="asHttpException"></a>

## asHttpException(error) ⇒ <code>{ getResponse: () &#x3D;&gt; unknown; getStatus: () &#x3D;&gt; number; }</code>
Asserts that an error carries the shape of an HTTP exception.

**Kind**: global function  
**Returns**: <code>{ getResponse: () &#x3D;&gt; unknown; getStatus: () &#x3D;&gt; number; }</code> - The exception's status/response accessors.  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>unknown</code> | The value thrown by the scan. |

src: packages/backend/src/services/anti-virus.service.spec.ts:141  
<a name="branchOf"></a>

## branchOf(bytes) ⇒ <code>Readable</code>
Builds a fresh branch stream carrying the given number of bytes.

**Kind**: global function  
**Returns**: <code>Readable</code> - A readable branch.  

| Param | Type | Description |
| --- | --- | --- |
| bytes | <code>number</code> | The payload size in bytes. |

src: packages/backend/src/services/anti-virus.service.spec.ts:163  
<a name="catchException"></a>

## catchException(promise) ⇒ <code>Promise&lt;{ getResponse: () &#x3D;&gt; unknown; getStatus: () &#x3D;&gt; number; }&gt;</code>
Awaits a scan expected to reject and returns the thrown exception.

**Kind**: global function  
**Returns**: <code>Promise&lt;{ getResponse: () &#x3D;&gt; unknown; getStatus: () &#x3D;&gt; number; }&gt;</code> - The thrown HTTP exception.  

| Param | Type | Description |
| --- | --- | --- |
| promise | <code>Promise&lt;unknown&gt;</code> | The scan promise. |

src: packages/backend/src/services/anti-virus.service.spec.ts:172  
<a name="createService"></a>

## createService() ⇒ <code>Promise&lt;{ cls: { get: &lt;T&gt;(key: symbol) &#x3D;&gt; T; set: (key: symbol, value: unknown) &#x3D;&gt; Map&lt;symbol, unknown&gt;; }; normalizedCls: import(&quot;./normalized-cls.service.js&quot;).NormalizedClsService; service: import(&quot;./anti-virus.service.js&quot;).AntiVirusService; sourceDestroy: import(&quot;vitest&quot;).Mock&lt;import(&quot;@vitest/spy&quot;).Procedure&gt;; store: Map&lt;symbol, unknown&gt;; }&gt;</code>
Builds a fresh `AntiVirusService` wired to a real `NormalizedClsService`
over a stubbed `ClsService`, isolating the module graph per test.

**Kind**: global function  
**Returns**: <code>Promise&lt;{ cls: { get: &lt;T&gt;(key: symbol) &#x3D;&gt; T; set: (key: symbol, value: unknown) &#x3D;&gt; Map&lt;symbol, unknown&gt;; }; normalizedCls: import(&quot;./normalized-cls.service.js&quot;).NormalizedClsService; service: import(&quot;./anti-virus.service.js&quot;).AntiVirusService; sourceDestroy: import(&quot;vitest&quot;).Mock&lt;import(&quot;@vitest/spy&quot;).Procedure&gt;; store: Map&lt;symbol, unknown&gt;; }&gt;</code> - The service, the CLS backing map and the source-stream destroy spy.  
src: packages/backend/src/services/anti-virus.service.spec.ts:186  
<a name="stubRequest"></a>

## stubRequest(store, contentLength)
Points CLS at a request carrying the given content-length, or deletes it.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| store | <code>Map&lt;symbol, unknown&gt;</code> | The CLS backing map. |
| contentLength | <code>string</code> | The header value; `undefined` removes the request stub. |

src: packages/backend/src/services/anti-virus.service.spec.ts:209  
