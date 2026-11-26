## Functions

<dl>
<dt><a href="#exitWorker">exitWorker(code)</a></dt>
<dd><p>Ends a worker process after its job finishes. Dropping stdin lets the event
loop drain on its own; the timer is a backstop for native media handles that
outlive the drain. The timer is unref&#39;d, so it never holds the process open.</p>
</dd>
<dt><a href="#standaloneExit">standaloneExit(code)</a></dt>
<dd><p>Exits the worker thread when it is running standalone; a no-op otherwise.
The guard reads <code>FILE_FLY_WORKER</code> at call time: WorkerService sets it to
&quot;1&quot; before spawning, while unit specs import the module in-process with the
variable unset.</p>
</dd>
</dl>

<a name="exitWorker"></a>

## exitWorker(code)
Ends a worker process after its job finishes. Dropping stdin lets the event
loop drain on its own; the timer is a backstop for native media handles that
outlive the drain. The timer is unref'd, so it never holds the process open.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>number</code> | Exit code for the worker process. |

src: packages/backend/src/utils/worker-exit.ts:7  
dist: packages/backend/dist/utils/worker-exit.js:1
<a name="standaloneExit"></a>

## standaloneExit(code)
Exits the worker thread when it is running standalone; a no-op otherwise.
The guard reads `FILE_FLY_WORKER` at call time: WorkerService sets it to
"1" before spawning, while unit specs import the module in-process with the
variable unset.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>number</code> | Exit code for the worker process. |

src: packages/backend/src/utils/worker-exit.ts:24  
dist: packages/backend/dist/utils/worker-exit.js:7
