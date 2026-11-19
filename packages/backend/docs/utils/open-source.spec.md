## Functions

<dl>
<dt><a href="#makeGetHarness">makeGetHarness()</a> ⇒ <code>Harness</code></dt>
<dd><p>Builds a CLS stub whose request is a GET carrying a source query.</p>
</dd>
<dt><a href="#collect">collect(stream)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Reads a stream to EOF, returning its concatenated bytes.</p>
</dd>
</dl>

<a name="makeGetHarness"></a>

## makeGetHarness() ⇒ <code>Harness</code>
Builds a CLS stub whose request is a GET carrying a source query.

**Kind**: global function  
**Returns**: <code>Harness</code> - The stub and the backing state.  
src: packages/backend/src/utils/open-source.spec.ts:23  
<a name="collect"></a>

## collect(stream) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Reads a stream to EOF, returning its concatenated bytes.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The concatenated buffer.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | Stream to consume. |

src: packages/backend/src/utils/open-source.spec.ts:53  
