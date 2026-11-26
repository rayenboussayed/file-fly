## Functions

<dl>
<dt><a href="#chunks">chunks()</a> ⇒ <code>Generator&lt;Buffer&lt;ArrayBufferLike&gt;, any, any&gt;</code></dt>
<dd><p>Yields 21 one-MiB chunks to exceed the 20 MiB cap.</p>
</dd>
<dt><a href="#jpegStream">jpegStream()</a> ⇒ <code>Readable</code></dt>
<dd><p>Opens a fresh readable stream over the JPEG fixture.</p>
</dd>
<dt><a href="#makeService">makeService(signature, streamFactory, isImage)</a> ⇒ <code>ImageService</code></dt>
<dd><p>Builds an ImageService with stubbed dependencies for DNA tests.</p>
</dd>
</dl>

<a name="chunks"></a>

## chunks() ⇒ <code>Generator&lt;Buffer&lt;ArrayBufferLike&gt;, any, any&gt;</code>
Yields 21 one-MiB chunks to exceed the 20 MiB cap.

**Kind**: global function  
src: packages/backend/src/resources/image/dna.spec.ts:18  
<a name="jpegStream"></a>

## jpegStream() ⇒ <code>Readable</code>
Opens a fresh readable stream over the JPEG fixture.

**Kind**: global function  
**Returns**: <code>Readable</code> - A readable stream of the fixture bytes.  
src: packages/backend/src/resources/image/dna.spec.ts:28  
<a name="makeService"></a>

## makeService(signature, streamFactory, isImage) ⇒ <code>ImageService</code>
Builds an ImageService with stubbed dependencies for DNA tests.

**Kind**: global function  
**Returns**: <code>ImageService</code> - An ImageService wired to the stubs.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| signature | <code>unknown</code> |  | The file signature returned by the stubbed CLS store. |
| streamFactory | <code>() &#x3D;&gt; Readable</code> |  | Factory opening a fresh input stream per call. |
| isImage | <code>boolean</code> | <code>true</code> | Whether the stubbed file-type check passes. |

src: packages/backend/src/resources/image/dna.spec.ts:39  
