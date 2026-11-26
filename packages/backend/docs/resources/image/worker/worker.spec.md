## Functions

<dl>
<dt><a href="#createTinyJpeg">createTinyJpeg()</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Creates a tiny synthetic JPEG for worker stdin.</p>
</dd>
<dt><a href="#importWorker">importWorker(workerData)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Imports the image worker fresh with the given workerData.</p>
</dd>
</dl>

<a name="createTinyJpeg"></a>

## createTinyJpeg() ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Creates a tiny synthetic JPEG for worker stdin.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The encoded JPEG bytes.  
src: packages/backend/src/resources/image/worker/worker.spec.ts:12  
<a name="importWorker"></a>

## importWorker(workerData) ⇒ <code>Promise&lt;void&gt;</code>
Imports the image worker fresh with the given workerData.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| workerData | <code>Record&lt;string, unknown&gt;</code> | the worker payload (operation). |

src: packages/backend/src/resources/image/worker/worker.spec.ts:43  
