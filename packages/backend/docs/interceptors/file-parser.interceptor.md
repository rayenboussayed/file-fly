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
src: packages/backend/src/interceptors/file-parser.interceptor.ts:31  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:22
<a name="generateCacheKey"></a>

## generateCacheKey(options) ⇒ <code>string</code>
Hashes an arbitrary value into a deterministic, url/fs-safe cache key.

**Kind**: global function  
**Returns**: <code>string</code> - The cache key.  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>unknown</code> | Value to hash (upload base key parts or download base key parts). |

src: packages/backend/src/interceptors/file-parser.interceptor.ts:26  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:21
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

src: packages/backend/src/interceptors/file-parser.interceptor.ts:103  
dist: packages/backend/dist/interceptors/file-parser.interceptor.js:71
