## Functions

<dl>
<dt><a href="#screenshotBoundary">screenshotBoundary(frames)</a> ⇒ <code>string</code></dt>
<dd><p>Build a deterministic multipart boundary string for a screenshot response.</p>
</dd>
<dt><a href="#writePartHeader">writePartHeader(index, time, length, boundary)</a> ⇒ <code>Buffer&lt;ArrayBufferLike&gt;</code></dt>
<dd><p>Write a multipart part header for a single screenshot frame.</p>
</dd>
<dt><a href="#writeTerminator">writeTerminator(boundary)</a> ⇒ <code>Buffer&lt;ArrayBufferLike&gt;</code></dt>
<dd><p>Write the multipart terminator for a screenshot response.</p>
</dd>
</dl>

<a name="screenshotBoundary"></a>

## screenshotBoundary(frames) ⇒ <code>string</code>
Build a deterministic multipart boundary string for a screenshot response.

**Kind**: global function  
**Returns**: <code>string</code> - Boundary string.  

| Param | Type | Description |
| --- | --- | --- |
| frames | <code>readonly number[]</code> | Frame timestamps included in the response. |

src: packages/backend/src/resources/video/multipart.ts:8  
dist: packages/backend/dist/resources/video/multipart.js:2
<a name="writePartHeader"></a>

## writePartHeader(index, time, length, boundary) ⇒ <code>Buffer&lt;ArrayBufferLike&gt;</code>
Write a multipart part header for a single screenshot frame.

**Kind**: global function  
**Returns**: <code>Buffer&lt;ArrayBufferLike&gt;</code> - Header buffer.  

| Param | Type | Description |
| --- | --- | --- |
| index | <code>number</code> | Zero-based frame index. |
| time | <code>number</code> | Frame timestamp in seconds. |
| length | <code>number</code> | Byte length of the frame image. |
| boundary | <code>string</code> | Multipart boundary string. |

src: packages/backend/src/resources/video/multipart.ts:21  
dist: packages/backend/dist/resources/video/multipart.js:6
<a name="writeTerminator"></a>

## writeTerminator(boundary) ⇒ <code>Buffer&lt;ArrayBufferLike&gt;</code>
Write the multipart terminator for a screenshot response.

**Kind**: global function  
**Returns**: <code>Buffer&lt;ArrayBufferLike&gt;</code> - Terminator buffer.  

| Param | Type | Description |
| --- | --- | --- |
| boundary | <code>string</code> | Multipart boundary string. |

src: packages/backend/src/resources/video/multipart.ts:36  
dist: packages/backend/dist/resources/video/multipart.js:13
