## Functions

<dl>
<dt><a href="#deferred">deferred()</a> ⇒ <code>{ promise: Promise&lt;T&gt;; resolve: (value: PromiseLike&lt;T&gt; | T) &#x3D;&gt; void; }</code></dt>
<dd><p>A promise with an externally callable resolver. The resolver stays on an
object property instead of being extracted into a bare local: this package
targets ES2023, whose lib has no Promise.withResolvers.</p>
</dd>
<dt><a href="#captureStdout">captureStdout()</a> ⇒ <code>{ writes: Buffer&lt;ArrayBufferLike&gt;[]; written: Promise&lt;void&gt;; }</code></dt>
<dd><p>Captures the worker&#39;s stdout byte channel and resolves as soon as the first
write lands, so tests never depend on wall-clock timing.</p>
</dd>
</dl>

<a name="deferred"></a>

## deferred() ⇒ <code>{ promise: Promise&lt;T&gt;; resolve: (value: PromiseLike&lt;T&gt; \| T) &#x3D;&gt; void; }</code>
A promise with an externally callable resolver. The resolver stays on an
object property instead of being extracted into a bare local: this package
targets ES2023, whose lib has no Promise.withResolvers.

**Kind**: global function  
**Returns**: <code>{ promise: Promise&lt;T&gt;; resolve: (value: PromiseLike&lt;T&gt; \| T) &#x3D;&gt; void; }</code> - The promise and its resolver.  
src: packages/backend/src/resources/docx/worker/worker.spec.ts:23  
<a name="captureStdout"></a>

## captureStdout() ⇒ <code>{ writes: Buffer&lt;ArrayBufferLike&gt;[]; written: Promise&lt;void&gt;; }</code>
Captures the worker's stdout byte channel and resolves as soon as the first
write lands, so tests never depend on wall-clock timing.

**Kind**: global function  
**Returns**: <code>{ writes: Buffer&lt;ArrayBufferLike&gt;[]; written: Promise&lt;void&gt;; }</code> - The captured writes and a promise resolving on the first write.  
src: packages/backend/src/resources/docx/worker/worker.spec.ts:38  
