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
