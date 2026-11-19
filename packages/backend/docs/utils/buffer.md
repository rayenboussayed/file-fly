## Constants

<dl>
<dt><a href="#MAX_BUFFER_BYTES">MAX_BUFFER_BYTES</a></dt>
<dd><p>Maximum number of bytes buffered from a stream (20 MiB).</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#bufferStream">bufferStream(stream, maxBytes)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Buffers a readable stream into a single Buffer, enforcing a size cap.</p>
</dd>
</dl>

<a name="MAX_BUFFER_BYTES"></a>

## MAX\_BUFFER\_BYTES
Maximum number of bytes buffered from a stream (20 MiB).

**Kind**: global constant  
src: packages/backend/src/utils/buffer.ts:8  
dist: packages/backend/dist/utils/buffer.js:4
<a name="bufferStream"></a>

## bufferStream(stream, maxBytes) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Buffers a readable stream into a single Buffer, enforcing a size cap.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The concatenated buffer contents.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | The readable stream to buffer. |
| maxBytes | <code>number</code> | The maximum number of bytes to accept before throwing. |

src: packages/backend/src/utils/buffer.ts:16  
dist: packages/backend/dist/utils/buffer.js:5
