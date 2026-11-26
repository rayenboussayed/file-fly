## Classes

<dl>
<dt><a href="#ByteCapTransform">ByteCapTransform</a></dt>
<dd><p>Passes stream chunks through while rejecting anything past a byte budget.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#MAX_BUFFER_BYTES">MAX_BUFFER_BYTES</a></dt>
<dd><p>Maximum number of bytes buffered from a stream (20 MiB).</p>
</dd>
<dt><a href="#WORKER_JSON_MAX_BYTES">WORKER_JSON_MAX_BYTES</a></dt>
<dd><p>Maximum JSON payload a worker may write to stdout (8 MiB).</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#bufferStream">bufferStream(stream, maxBytes)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Buffers a readable stream into a single Buffer, enforcing a size cap.</p>
</dd>
<dt><a href="#parseJsonBuffer">parseJsonBuffer(buffer)</a> ⇒ <code>unknown</code></dt>
<dd><p>Parses a small JSON payload emitted by a worker.</p>
</dd>
<dt><a href="#readWorkerJson">readWorkerJson(stdout)</a> ⇒ <code>Promise&lt;unknown&gt;</code></dt>
<dd><p>Buffers and parses the small JSON payload a worker writes to stdout.</p>
</dd>
</dl>

<a name="ByteCapTransform"></a>

## ByteCapTransform
Passes stream chunks through while rejecting anything past a byte budget.

**Kind**: global class  
src: packages/backend/src/utils/buffer.ts:20  
dist: packages/backend/dist/utils/buffer.js:7
<a name="new_ByteCapTransform_new"></a>

### new ByteCapTransform(maxBytes)

| Param | Type | Description |
| --- | --- | --- |
| maxBytes | <code>number</code> | Maximum bytes to accept before destroying the stream. |

<a name="MAX_BUFFER_BYTES"></a>

## MAX\_BUFFER\_BYTES
Maximum number of bytes buffered from a stream (20 MiB).

**Kind**: global constant  
src: packages/backend/src/utils/buffer.ts:11  
dist: packages/backend/dist/utils/buffer.js:5
<a name="WORKER_JSON_MAX_BYTES"></a>

## WORKER\_JSON\_MAX\_BYTES
Maximum JSON payload a worker may write to stdout (8 MiB).

**Kind**: global constant  
src: packages/backend/src/utils/buffer.ts:15  
dist: packages/backend/dist/utils/buffer.js:6
<a name="bufferStream"></a>

## bufferStream(stream, maxBytes) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Buffers a readable stream into a single Buffer, enforcing a size cap.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The concatenated buffer contents.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | The readable stream to buffer. |
| maxBytes | <code>number</code> | The maximum number of bytes to accept before throwing. |

src: packages/backend/src/utils/buffer.ts:46  
dist: packages/backend/dist/utils/buffer.js:23
<a name="parseJsonBuffer"></a>

## parseJsonBuffer(buffer) ⇒ <code>unknown</code>
Parses a small JSON payload emitted by a worker.

**Kind**: global function  
**Returns**: <code>unknown</code> - The parsed JSON value.  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | UTF-8 encoded JSON bytes. |

src: packages/backend/src/utils/buffer.ts:71  
dist: packages/backend/dist/utils/buffer.js:38
<a name="readWorkerJson"></a>

## readWorkerJson(stdout) ⇒ <code>Promise&lt;unknown&gt;</code>
Buffers and parses the small JSON payload a worker writes to stdout.

**Kind**: global function  
**Returns**: <code>Promise&lt;unknown&gt;</code> - The parsed JSON value.  

| Param | Type | Description |
| --- | --- | --- |
| stdout | <code>Readable</code> | The worker's stdout stream. |

src: packages/backend/src/utils/buffer.ts:80  
dist: packages/backend/dist/utils/buffer.js:41
