## Functions

<dl>
<dt><a href="#collector">collector()</a> ⇒ <code>{ chunks: Buffer&lt;ArrayBufferLike&gt;[]; raw: Writable; }</code></dt>
<dd><p>Collects everything written to a Writable.</p>
</dd>
<dt><a href="#failingReadable">failingReadable()</a> ⇒ <code>Readable</code></dt>
<dd><p>Creates a readable that destroys itself with a test error when first read.</p>
</dd>
</dl>

<a name="collector"></a>

## collector() ⇒ <code>{ chunks: Buffer&lt;ArrayBufferLike&gt;[]; raw: Writable; }</code>
Collects everything written to a Writable.

**Kind**: global function  
**Returns**: <code>{ chunks: Buffer&lt;ArrayBufferLike&gt;[]; raw: Writable; }</code> - Sink with the collected chunks and the raw writable stream.  
src: packages/backend/src/utils/pipe.spec.ts:12  
<a name="failingReadable"></a>

## failingReadable() ⇒ <code>Readable</code>
Creates a readable that destroys itself with a test error when first read.

**Kind**: global function  
**Returns**: <code>Readable</code> - A readable whose first read fails.  
src: packages/backend/src/utils/pipe.spec.ts:27  
