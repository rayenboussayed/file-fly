## Members

<dl>
<dt><a href="#FileParserInterceptor">FileParserInterceptor</a></dt>
<dd><p>Probes the upload’s file signature, stamps the CLS store (signature, hash, cache key) and publishes the probe.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#generateCacheKey">generateCacheKey(options)</a> ⇒ <code>string</code></dt>
<dd><p>Hashes an arbitrary value into a deterministic, url/fs-safe cache key.</p>
</dd>
<dt><a href="#parseHeaderInteger">parseHeaderInteger(value, radix)</a> ⇒ <code>number</code></dt>
<dd><p>Parses a content-length header with explicit radix. Kept behind a parameter so
parseInt semantics survive: <code>Number(&#39;42abc&#39;)</code> is NaN while
<code>parseInt(&#39;42abc&#39;, 10)</code> is 42, and the cache key depends on that value.</p>
</dd>
<dt><a href="#buildCacheKey">buildCacheKey(cls)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Builds and stores the cache key for the scanned upload or download.</p>
</dd>
<dt><a href="#prefixHash">prefixHash(stream, size)</a> ⇒ <code>Promise&lt;string&gt;</code></dt>
<dd><p>Hashes the first <code>size</code> bytes of the stream (or all of it when smaller).</p>
<p>The branch is consumed with plain listeners, never an async iterator, so
it is not destroyed at the end: the probe branch of the request&#39;s tee must
stay intact for its sibling branch. Chunks beyond the prefix are discarded
in the same pass. Resolves as soon as the prefix is hashed (or EOF is
reached); the full remainder is dropped without resolving the caller.</p>
</dd>
</dl>

<a name="FileParserInterceptor"></a>

## FileParserInterceptor
Probes the upload’s file signature, stamps the CLS store (signature, hash, cache key) and publishes the probe.

**Kind**: global variable  
src: packages/backend/src/interceptors/file-parser.interceptor.ts:77  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:46
<a name="generateCacheKey"></a>

## generateCacheKey(options) ⇒ <code>string</code>
Hashes an arbitrary value into a deterministic, url/fs-safe cache key.

**Kind**: global function  
**Returns**: <code>string</code> - The cache key.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>unknown</code> | Value to hash (upload base key parts or download base key parts). |

src: packages/backend/src/interceptors/file-parser.interceptor.ts:27  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:22
<a name="parseHeaderInteger"></a>

## parseHeaderInteger(value, radix) ⇒ <code>number</code>
Parses a content-length header with explicit radix. Kept behind a parameter so
parseInt semantics survive: `Number('42abc')` is NaN while
`parseInt('42abc', 10)` is 42, and the cache key depends on that value.

**Kind**: global function  
**Returns**: <code>number</code> - The parsed integer.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string</code> | Raw header value. |
| radix | <code>number</code> | Numeric base, always 10 at the call site. |

src: packages/backend/src/interceptors/file-parser.interceptor.ts:38  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:23
<a name="buildCacheKey"></a>

## buildCacheKey(cls) ⇒ <code>Promise&lt;void&gt;</code>
Builds and stores the cache key for the scanned upload or download.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | CLS facade carrying the request, signature and hash. |

src: packages/backend/src/interceptors/file-parser.interceptor.ts:45  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:24
<a name="prefixHash"></a>

## prefixHash(stream, size) ⇒ <code>Promise&lt;string&gt;</code>
Hashes the first `size` bytes of the stream (or all of it when smaller).

The branch is consumed with plain listeners, never an async iterator, so
it is not destroyed at the end: the probe branch of the request's tee must
stay intact for its sibling branch. Chunks beyond the prefix are discarded
in the same pass. Resolves as soon as the prefix is hashed (or EOF is
reached); the full remainder is dropped without resolving the caller.

**Kind**: global function  
**Returns**: <code>Promise&lt;string&gt;</code> - SHA-512 hex of the hashed prefix (or entire) bytes.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | The readable branch to hash (left intact). |
| size | <code>number</code> | Maximum number of bytes to hash. |

src: packages/backend/src/interceptors/file-parser.interceptor.ts:111  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:71
