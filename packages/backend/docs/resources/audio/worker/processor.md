<a name="processMedia"></a>

## processMedia(payload, inputData) ⇒ <code>Promise&lt;void&gt;</code>
Transcodes the upload stdin into the requested format/codec/bitrate and streams it out.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| payload |  | Output settings from the request query. |
| inputData | <code>AudioWorkerData</code> | Worker dispatch data (defaults to the spawned worker's workerData). |

src: packages/backend/src/resources/audio/worker/processor.ts:22  
dist: packages/backend/dist/resources/audio/worker/processor.js:60
