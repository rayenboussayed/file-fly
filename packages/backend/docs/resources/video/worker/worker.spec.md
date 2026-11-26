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
<dt><a href="#runProcessor">runProcessor(payload)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBuffer&gt;&gt;</code></dt>
<dd><p>Runs the processor worker with the given payload and collects its output.</p>
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
<a name="runProcessor"></a>

## runProcessor(payload) ⇒ <code>Promise&lt;Buffer&lt;ArrayBuffer&gt;&gt;</code>
Runs the processor worker with the given payload and collects its output.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBuffer&gt;&gt;</code> - The bytes written to stdout by the worker.  

| Param | Type | Description |
| --- | --- | --- |
| payload | <code>Record&lt;string, unknown&gt;</code> | Video processor options passed to the worker. |

src: packages/backend/src/resources/video/worker/worker.spec.ts:61  
