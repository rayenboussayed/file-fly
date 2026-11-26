## Constants

<dl>
<dt><a href="#EMPTY_TAG">EMPTY_TAG</a></dt>
<dd><p>Tag the service mixes into the key when workerData carries no operation/inputFormat.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#binPath">binPath(keyParts)</a> ⇒ <code>string</code></dt>
<dd><p>Bin entry path for the given key parts, mirroring the service&#39;s <code>keyFor</code>
and StreamCache&#39;s internal sha256 naming.</p>
</dd>
<dt><a href="#drainToString">drainToString(stream)</a> ⇒ <code>Promise&lt;string&gt;</code></dt>
<dd><p>Reads a stream to EOF and returns its decoded contents.</p>
</dd>
<dt><a href="#removeQuietly">removeQuietly(target)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Removes a cache path whether it is a file, a directory, or already gone.</p>
</dd>
<dt><a href="#makeSourceCls">makeSourceCls(cacheKey, source)</a> ⇒ <code>never</code></dt>
<dd><p>Builds a CLS stub with an explicit source stream.</p>
</dd>
<dt><a href="#makeOutcomeCls">makeOutcomeCls(cacheKey, outcome)</a> ⇒ <code>never</code></dt>
<dd><p>Builds a CLS stub that counts cache-hit outcomes.</p>
</dd>
<dt><a href="#broken">broken()</a> ⇒ <code>AsyncGenerator&lt;Buffer&lt;ArrayBuffer&gt;, void, unknown&gt;</code></dt>
<dd><p>Yields one chunk then fails mid-stream.</p>
</dd>
</dl>

<a name="EMPTY_TAG"></a>

## EMPTY\_TAG
Tag the service mixes into the key when workerData carries no operation/inputFormat.

**Kind**: global constant  
src: packages/backend/src/services/worker.service.spec.ts:13  
<a name="binPath"></a>

## binPath(keyParts) ⇒ <code>string</code>
Bin entry path for the given key parts, mirroring the service's `keyFor`
and StreamCache's internal sha256 naming.

**Kind**: global function  
**Returns**: <code>string</code> - The absolute cache file path for those key parts.  

| Param | Type | Description |
| --- | --- | --- |
| keyParts | <code>readonly string[]</code> | Key parts to join with NUL and hash, as the service's `keyFor` would. |

src: packages/backend/src/services/worker.service.spec.ts:21  
<a name="drainToString"></a>

## drainToString(stream) ⇒ <code>Promise&lt;string&gt;</code>
Reads a stream to EOF and returns its decoded contents.

**Kind**: global function  
**Returns**: <code>Promise&lt;string&gt;</code> - The decoded stream contents.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | The stream to consume. |

src: packages/backend/src/services/worker.service.spec.ts:29  
<a name="removeQuietly"></a>

## removeQuietly(target) ⇒ <code>Promise&lt;void&gt;</code>
Removes a cache path whether it is a file, a directory, or already gone.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| target | <code>string</code> | Cache path to remove. |

src: packages/backend/src/services/worker.service.spec.ts:108  
<a name="makeSourceCls"></a>

## makeSourceCls(cacheKey, source) ⇒ <code>never</code>
Builds a CLS stub with an explicit source stream.

**Kind**: global function  
**Returns**: <code>never</code> - A CLS stub for WorkerService.  

| Param | Type | Description |
| --- | --- | --- |
| cacheKey | <code>string</code> | Cache key returned by the stub. |
| source | <code>Readable</code> | Source stream returned by the stub. |

src: packages/backend/src/services/worker.service.spec.ts:118  
<a name="makeOutcomeCls"></a>

## makeOutcomeCls(cacheKey, outcome) ⇒ <code>never</code>
Builds a CLS stub that counts cache-hit outcomes.

**Kind**: global function  
**Returns**: <code>never</code> - A CLS stub for WorkerService.  

| Param | Type | Description |
| --- | --- | --- |
| cacheKey | <code>string</code> | Cache key returned by the stub. |
| outcome | <code>{ hit: number; }</code> | Mutable hit counter. |
| outcome.hit |  | Current hit count. |

src: packages/backend/src/services/worker.service.spec.ts:132  
<a name="broken"></a>

## broken() ⇒ <code>AsyncGenerator&lt;Buffer&lt;ArrayBuffer&gt;, void, unknown&gt;</code>
Yields one chunk then fails mid-stream.

**Kind**: global function  
src: packages/backend/src/services/worker.service.spec.ts:151  
