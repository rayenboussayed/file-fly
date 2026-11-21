## Functions

<dl>
<dt><a href="#run">run()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Dispatches the requested video operation (processor/metadata/dna/stats/screenshot).</p>
</dd>
<dt><a href="#startVideoWorker">startVideoWorker()</a> ⇒ <code>Promise&lt;any&gt;</code></dt>
<dd><p>Runs the worker job and, only inside a spawned worker thread, finishes the process.</p>
</dd>
</dl>

<a name="run"></a>

## run() ⇒ <code>Promise&lt;void&gt;</code>
Dispatches the requested video operation (processor/metadata/dna/stats/screenshot).

**Kind**: global function  
src: packages/backend/src/resources/video/worker/index.ts:17  
dist: packages/backend/dist/resources/video/worker/index.js:10
<a name="startVideoWorker"></a>

## startVideoWorker() ⇒ <code>Promise&lt;any&gt;</code>
Runs the worker job and, only inside a spawned worker thread, finishes the process.

**Kind**: global function  
**Returns**: <code>Promise&lt;any&gt;</code> - The job (with exit-code handling attached when running as a worker thread).  
src: packages/backend/src/resources/video/worker/index.ts:41  
dist: packages/backend/dist/resources/video/worker/index.js:29
