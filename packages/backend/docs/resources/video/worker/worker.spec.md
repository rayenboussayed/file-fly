## Functions

<dl>
<dt><a href="#stubStdin">stubStdin(bytes)</a></dt>
<dd><p>Replaces process.stdin with a replay of the fixture.</p>
</dd>
<dt><a href="#stubStdout">stubStdout()</a> ⇒ <code>Buffer&lt;ArrayBufferLike&gt;[]</code></dt>
<dd><p>Replaces process.stdout with a sink; returns the collected chunks.</p>
</dd>
<dt><a href="#importWorker">importWorker(workerData)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Imports the worker module fresh with the given workerData.</p>
</dd>
</dl>

<a name="stubStdin"></a>

## stubStdin(bytes)
Replaces process.stdin with a replay of the fixture.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| bytes | <code>Buffer&lt;ArrayBufferLike&gt;</code> | Bytes to replay (defaults to the tiny video fixture). |

src: packages/backend/src/resources/video/worker/worker.spec.ts:21  
<a name="stubStdout"></a>

## stubStdout() ⇒ <code>Buffer&lt;ArrayBufferLike&gt;[]</code>
Replaces process.stdout with a sink; returns the collected chunks.

**Kind**: global function  
**Returns**: <code>Buffer&lt;ArrayBufferLike&gt;[]</code> - The collected stdout chunks.  
src: packages/backend/src/resources/video/worker/worker.spec.ts:29  
<a name="importWorker"></a>

## importWorker(workerData) ⇒ <code>Promise&lt;void&gt;</code>
Imports the worker module fresh with the given workerData.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| workerData | <code>Record&lt;string, unknown&gt;</code> | The worker payload (operation + inputFormat). |

src: packages/backend/src/resources/video/worker/worker.spec.ts:50  
