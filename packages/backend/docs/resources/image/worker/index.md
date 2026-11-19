## Functions

<dl>
<dt><a href="#finishWorker">finishWorker(code)</a></dt>
<dd><p>Ends the worker process once the job is done: drops the stdin handle so
the event loop drains naturally, with a short backstop if native handles linger.</p>
</dd>
<dt><a href="#runImageWorker">runImageWorker(inputData)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>// eslint-disable-next-line jsdoc/require-param-description</p>
</dd>
<dt><a href="#startImageWorker">startImageWorker()</a> ⇒ <code>Promise&lt;any&gt;</code></dt>
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

src: packages/backend/src/resources/image/worker/index.ts:18  
dist: packages/backend/dist/resources/image/worker/index.js:7
<a name="runImageWorker"></a>

## runImageWorker(inputData) ⇒ <code>Promise&lt;void&gt;</code>
// eslint-disable-next-line jsdoc/require-param-description

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| inputData | <code>ImageWorkerData</code> | Description. |

src: packages/backend/src/resources/image/worker/index.ts:30  
dist: packages/backend/dist/resources/image/worker/index.js:12
<a name="startImageWorker"></a>

## startImageWorker() ⇒ <code>Promise&lt;any&gt;</code>
Runs the worker job and, only inside a spawned worker thread, finishes the process.

**Kind**: global function  
**Returns**: <code>Promise&lt;any&gt;</code> - Result.  
src: packages/backend/src/resources/image/worker/index.ts:48  
dist: packages/backend/dist/resources/image/worker/index.js:25
