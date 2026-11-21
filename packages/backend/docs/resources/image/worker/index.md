## Functions

<dl>
<dt><a href="#runImageWorker">runImageWorker(inputData)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Dispatches the requested image operation (processor/metadata/stats).</p>
</dd>
<dt><a href="#startImageWorker">startImageWorker()</a> ⇒ <code>Promise&lt;any&gt;</code></dt>
<dd><p>Runs the worker job and, only inside a spawned worker thread, finishes the process.</p>
</dd>
</dl>

<a name="runImageWorker"></a>

## runImageWorker(inputData) ⇒ <code>Promise&lt;void&gt;</code>
Dispatches the requested image operation (processor/metadata/stats).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| inputData | <code>ImageWorkerData</code> | Worker dispatch data (defaults to the spawned worker's workerData). |

src: packages/backend/src/resources/image/worker/index.ts:18  
dist: packages/backend/dist/resources/image/worker/index.js:7
<a name="startImageWorker"></a>

## startImageWorker() ⇒ <code>Promise&lt;any&gt;</code>
Runs the worker job and, only inside a spawned worker thread, finishes the process.

**Kind**: global function  
**Returns**: <code>Promise&lt;any&gt;</code> - The job (with exit-code handling attached when running as a worker thread).  
src: packages/backend/src/resources/image/worker/index.ts:36  
dist: packages/backend/dist/resources/image/worker/index.js:19
