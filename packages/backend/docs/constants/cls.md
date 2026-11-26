## Constants

<dl>
<dt><a href="#CLS_CACHE_OUTCOME">CLS_CACHE_OUTCOME</a></dt>
<dd><p>Outcome of the worker cache lookup for this request (<code>hit</code> | <code>miss</code>).</p>
</dd>
<dt><a href="#CLS_BYTES_IN">CLS_BYTES_IN</a></dt>
<dd><p>Count of bytes received for this request (signature/file-hash path or download meter).</p>
</dd>
<dt><a href="#CLS_BYTES_OUT">CLS_BYTES_OUT</a></dt>
<dd><p>Count of bytes streamed to the client for this request (via the out meter).</p>
</dd>
<dt><a href="#CLS_CACHE_KEY">CLS_CACHE_KEY</a></dt>
<dd><p>Deterministic cache key for this request (file hash + query, or body digest).</p>
</dd>
<dt><a href="#CLS_FILE_HASH">CLS_FILE_HASH</a></dt>
<dd><p>SHA-512 of the uploaded bytes (or its first FILE_HASH_HEADER_SIZE bytes).</p>
</dd>
<dt><a href="#CLS_FILE_SCAN">CLS_FILE_SCAN</a></dt>
<dd><p>Result of the virus scan for this request, when scanning is enabled.</p>
</dd>
<dt><a href="#CLS_FILE_SIGNATURE">CLS_FILE_SIGNATURE</a></dt>
<dd><p>Detected file-type signature of the upload, when probed.</p>
</dd>
<dt><a href="#CLS_SOURCE_DIRECTION">CLS_SOURCE_DIRECTION</a></dt>
<dd><p>Direction of the media source: <code>upload</code> (POST body) or <code>download</code> (<code>source=</code> URL).</p>
</dd>
<dt><a href="#CLS_SOURCE_STREAM">CLS_SOURCE_STREAM</a></dt>
<dd><p>The (possibly capped) media stream for this request, set by the scanner/parser.</p>
</dd>
</dl>

<a name="CLS_CACHE_OUTCOME"></a>

## CLS\_CACHE\_OUTCOME
Outcome of the worker cache lookup for this request (`hit` | `miss`).

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:4  
dist: packages/backend/dist/constants/cls.js:1
<a name="CLS_BYTES_IN"></a>

## CLS\_BYTES\_IN
Count of bytes received for this request (signature/file-hash path or download meter).

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:9  
dist: packages/backend/dist/constants/cls.js:2
<a name="CLS_BYTES_OUT"></a>

## CLS\_BYTES\_OUT
Count of bytes streamed to the client for this request (via the out meter).

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:14  
dist: packages/backend/dist/constants/cls.js:3
<a name="CLS_CACHE_KEY"></a>

## CLS\_CACHE\_KEY
Deterministic cache key for this request (file hash + query, or body digest).

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:19  
dist: packages/backend/dist/constants/cls.js:4
<a name="CLS_FILE_HASH"></a>

## CLS\_FILE\_HASH
SHA-512 of the uploaded bytes (or its first FILE_HASH_HEADER_SIZE bytes).

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:24  
dist: packages/backend/dist/constants/cls.js:5
<a name="CLS_FILE_SCAN"></a>

## CLS\_FILE\_SCAN
Result of the virus scan for this request, when scanning is enabled.

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:29  
dist: packages/backend/dist/constants/cls.js:6
<a name="CLS_FILE_SIGNATURE"></a>

## CLS\_FILE\_SIGNATURE
Detected file-type signature of the upload, when probed.

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:34  
dist: packages/backend/dist/constants/cls.js:7
<a name="CLS_SOURCE_DIRECTION"></a>

## CLS\_SOURCE\_DIRECTION
Direction of the media source: `upload` (POST body) or `download` (`source=` URL).

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:39  
dist: packages/backend/dist/constants/cls.js:8
<a name="CLS_SOURCE_STREAM"></a>

## CLS\_SOURCE\_STREAM
The (possibly capped) media stream for this request, set by the scanner/parser.

**Kind**: global constant  
src: packages/backend/src/constants/cls.ts:44  
dist: packages/backend/dist/constants/cls.js:9
