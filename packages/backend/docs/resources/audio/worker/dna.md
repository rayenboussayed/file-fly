<a name="dna"></a>

## dna(inputData) ⇒ <code>Promise&lt;void&gt;</code>
Computes the Chromaprint fingerprint for the audio on stdin.

Unexpected errors are not handled here; worker/index owns failure paths.

**Kind**: global function  
**Returns**: <code>Promise&lt;void&gt;</code> - Resolves after the fingerprint JSON is written to stdout.  

| Param | Type | Description |
| --- | --- | --- |
| inputData | <code>AudioWorkerData</code> | Worker input with demuxer format. |

src: packages/backend/src/resources/audio/worker/dna.ts:19  
dist: packages/backend/dist/resources/audio/worker/dna.js:59
