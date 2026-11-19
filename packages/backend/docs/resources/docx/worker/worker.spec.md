<a name="captureStdout"></a>

## captureStdout() ⇒ <code>{ writes: Buffer&lt;ArrayBufferLike&gt;[]; written: Promise&lt;void&gt;; }</code>
Captures the worker's stdout byte channel and resolves as soon as the first
write lands, so tests never depend on wall-clock timing.

**Kind**: global function  
**Returns**: <code>{ writes: Buffer&lt;ArrayBufferLike&gt;[]; written: Promise&lt;void&gt;; }</code> - The captured writes and a promise resolving on the first write.  
src: packages/backend/src/resources/docx/worker/worker.spec.ts:22  
