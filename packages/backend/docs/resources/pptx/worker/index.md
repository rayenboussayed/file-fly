<a name="finishWorker"></a>

## finishWorker(code)
Ends the worker with a clean exit, dropping the stdin handle so the event loop
drains, with a short backstop for native handles.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| code | <code>number</code> | Exit code. |

src: packages/backend/src/resources/pptx/worker/index.ts:22  
dist: packages/backend/dist/resources/pptx/worker/index.js:8
