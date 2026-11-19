## Members

<dl>
<dt><a href="#tinyJpeg">tinyJpeg</a></dt>
<dd><p>A tiny synthetic JPEG (64x48, blue with a white 16x16 square): large enough
for every sharp operation in the worker, small enough to keep the suite fast
and deterministic.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#capturingStdout">capturingStdout()</a> ⇒ <code>{ finished: Promise&lt;void&gt;; stdout: any; writes: Buffer&lt;ArrayBufferLike&gt;[]; }</code></dt>
<dd><p>A capturing stdout Writable: <code>writes</code> accumulates chunks, <code>finished</code> resolves on <code>end</code>.</p>
</dd>
<dt><a href="#run">run(data)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;[]&gt;</code></dt>
<dd><p>Points stdin/stdout at the tiny fixture and a capturing sink, then runs the worker with explicit data.</p>
</dd>
</dl>

<a name="tinyJpeg"></a>

## tinyJpeg
A tiny synthetic JPEG (64x48, blue with a white 16x16 square): large enough
for every sharp operation in the worker, small enough to keep the suite fast
and deterministic.

**Kind**: global variable  
src: packages/backend/src/resources/image/image.worker.spec.ts:17  
<a name="capturingStdout"></a>

## capturingStdout() ⇒ <code>{ finished: Promise&lt;void&gt;; stdout: any; writes: Buffer&lt;ArrayBufferLike&gt;[]; }</code>
A capturing stdout Writable: `writes` accumulates chunks, `finished` resolves on `end`.

**Kind**: global function  
**Returns**: <code>{ finished: Promise&lt;void&gt;; stdout: any; writes: Buffer&lt;ArrayBufferLike&gt;[]; }</code> - The writes, the sink and the completion promise.  
src: packages/backend/src/resources/image/image.worker.spec.ts:35  
<a name="run"></a>

## run(data) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;[]&gt;</code>
Points stdin/stdout at the tiny fixture and a capturing sink, then runs the worker with explicit data.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;[]&gt;</code> - The captured stdout chunks.  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>Record&lt;string, unknown&gt;</code> | Worker-thread data (`operation` and optional payload) passed to the worker. |

src: packages/backend/src/resources/image/image.worker.spec.ts:58  
