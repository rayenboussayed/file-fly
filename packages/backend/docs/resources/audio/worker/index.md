## Functions

<dl>
<dt><a href="#runAudioWorker">runAudioWorker(inputData)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Dispatches the requested audio operation (processor/metadata/dna/stats).</p>
</dd>
<dt><a href="#startAudioWorker">startAudioWorker()</a> ⇒ <code>Promise&lt;any&gt;</code></dt>
<dd><p>Runs the worker job and, only inside a spawned worker thread, finishes the process.</p>
</dd>
</dl>

<a name="runAudioWorker"></a>

## runAudioWorker(inputData) ⇒ <code>Promise&lt;void&gt;</code>
Dispatches the requested audio operation (processor/metadata/dna/stats).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| inputData | <code>AudioWorkerData</code> | Worker dispatch data (defaults to the spawned worker's workerData). |

src: packages/backend/src/resources/audio/worker/index.ts:19  
dist: packages/backend/dist/resources/audio/worker/index.js:9
<a name="startAudioWorker"></a>

## startAudioWorker() ⇒ <code>Promise&lt;any&gt;</code>
Runs the worker job and, only inside a spawned worker thread, finishes the process.

**Kind**: global function  
**Returns**: <code>Promise&lt;any&gt;</code> - The worker job promise (resolved when the job has been dispatched).  
src: packages/backend/src/resources/audio/worker/index.ts:40  
dist: packages/backend/dist/resources/audio/worker/index.js:25
