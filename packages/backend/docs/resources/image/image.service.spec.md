## Constants

<dl>
<dt><a href="#TINY_PNG">TINY_PNG</a></dt>
<dd><p>1x1 white PNG, decodes with the production preprocess pipeline.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#makeService">makeService(signature, source, isImage)</a> ⇒ <code>{ recognizeCalls: [Buffer&lt;ArrayBufferLike&gt;, string[]][]; service: ImageService; workerService: { createWorker: import(&quot;vitest&quot;).Mock&lt;() &#x3D;&gt; Promise&lt;Readable&gt;&gt;; }; }</code></dt>
<dd><p>Builds an ImageService with stubbed dependencies.</p>
</dd>
</dl>

<a name="TINY_PNG"></a>

## TINY\_PNG
1x1 white PNG, decodes with the production preprocess pipeline.

**Kind**: global constant  
src: packages/backend/src/resources/image/image.service.spec.ts:12  
<a name="makeService"></a>

## makeService(signature, source, isImage) ⇒ <code>{ recognizeCalls: [Buffer&lt;ArrayBufferLike&gt;, string[]][]; service: ImageService; workerService: { createWorker: import(&quot;vitest&quot;).Mock&lt;() &#x3D;&gt; Promise&lt;Readable&gt;&gt;; }; }</code>
Builds an ImageService with stubbed dependencies.

**Kind**: global function  
**Returns**: <code>{ recognizeCalls: [Buffer&lt;ArrayBufferLike&gt;, string[]][]; service: ImageService; workerService: { createWorker: import(&quot;vitest&quot;).Mock&lt;() &#x3D;&gt; Promise&lt;Readable&gt;&gt;; }; }</code> - The service plus captured recognize calls for assertions.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| signature | <code>unknown</code> |  | File signature returned by the stubbed CLS store. |
| source | <code>() &#x3D;&gt; Readable</code> |  | Factory opening a fresh input stream per call. |
| isImage | <code>boolean</code> | <code>true</code> | Whether the stubbed file-type check passes. |

src: packages/backend/src/resources/image/image.service.spec.ts:32  
