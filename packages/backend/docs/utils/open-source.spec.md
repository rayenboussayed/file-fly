## Functions

<dl>
<dt><a href="#makeGetHarness">makeGetHarness()</a> ⇒ <code>Harness</code></dt>
<dd><p>Builds a CLS stub whose request is a GET carrying a source query.</p>
</dd>
<dt><a href="#collect">collect(stream)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Reads a stream to EOF, returning its concatenated bytes.</p>
</dd>
<dt><a href="#makeGetHarnessWith">makeGetHarnessWith(source, headers)</a> ⇒ <code>Harness</code></dt>
<dd><p>Builds a GET CLS stub with a custom source URL and request headers.</p>
</dd>
</dl>

<a name="makeGetHarness"></a>

## makeGetHarness() ⇒ <code>Harness</code>
Builds a CLS stub whose request is a GET carrying a source query.

**Kind**: global function  
**Returns**: <code>Harness</code> - The stub and the backing state.  
src: packages/backend/src/utils/open-source.spec.ts:26  
<a name="collect"></a>

## collect(stream) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Reads a stream to EOF, returning its concatenated bytes.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The concatenated buffer.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | Stream to consume. |

src: packages/backend/src/utils/open-source.spec.ts:56  
<a name="makeGetHarnessWith"></a>

## makeGetHarnessWith(source, headers) ⇒ <code>Harness</code>
Builds a GET CLS stub with a custom source URL and request headers.

**Kind**: global function  
**Returns**: <code>Harness</code> - The stub and the backing state.  

| Param | Type | Description |
| --- | --- | --- |
| source | <code>string</code> | The user-supplied source URL under test. |
| headers | <code>Record&lt;string, string&gt;</code> | Headers a browser client might carry. |

src: packages/backend/src/utils/open-source.spec.ts:72  
