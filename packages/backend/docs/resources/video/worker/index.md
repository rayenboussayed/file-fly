## Functions

<dl>
<dt><a href="#finishWorker">finishWorker(code)</a></dt>
<dd><p>Ends the worker process once the job is done: drops the stdin handle so
the event loop drains naturally, with a short backstop if native handles linger.</p>
</dd>
<dt><a href="#run">run()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Dispatches the requested video operation (processor/metadata/dna/stats/screenshot).</p>
</dd>
<dt><a href="#startVideoWorker">startVideoWorker()</a> ⇒ <code>Promise&lt;any&gt;</code></dt>
<dd><p>Runs the worker job and, only inside a spawned worker thread, finishes the process.</p>
</dd>
</dl>

<a name="finishWorker"></a>

## finishWorker(code)
Ends the worker process once the job is done: drops the stdin handle so
the event loop drains naturally, with a short backstop if native handles linger.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>number</code> | Exit code for the worker process. |

src: packages/backend/src/resources/video/worker/index.ts:20  
dist: packages/backend/dist/resources/video/worker/index.js:9
<a name="run"></a>

## run() ⇒ <code>Promise&lt;void&gt;</code>
Dispatches the requested video operation (processor/metadata/dna/stats/screenshot).

**Kind**: global function  
src: packages/backend/src/resources/video/worker/index.ts:28  
dist: packages/backend/dist/resources/video/worker/index.js:14
<a name="startVideoWorker"></a>

## startVideoWorker() ⇒ <code>Promise&lt;any&gt;</code>
Runs the worker job and, only inside a spawned worker thread, finishes the process.

**Kind**: global function  
**Returns**: <code>Promise&lt;any&gt;</code> - The job (with exit-code handling attached when running as a worker thread).  
src: packages/backend/src/resources/video/worker/index.ts:52  
dist: packages/backend/dist/resources/video/worker/index.js:33
