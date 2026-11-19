<a name="createWorkerLogger"></a>

## createWorkerLogger(destination) ⇒ <code>pino.Logger</code>
Creates the logger for worker threads. Worker stdout is the byte channel for
generated media and documents, so all worker logs go to stderr only.

**Kind**: global function  
**Returns**: <code>pino.Logger</code> - A pino instance emitting one JSON object per line.  

| Param | Type | Description |
| --- | --- | --- |
| destination | <code>Writable</code> | Stream to write JSON lines to; defaults to `process.stderr`. |

src: packages/backend/src/logging/worker-logger.ts:13  
dist: packages/backend/dist/logging/worker-logger.js:3
