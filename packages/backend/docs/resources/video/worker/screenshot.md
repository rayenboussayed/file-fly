## Functions

<dl>
<dt><a href="#firstJpeg">firstJpeg(decoder, input, scaler)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Returns the first usable frame of a decoded video as JPEG.</p>
</dd>
<dt><a href="#screenshot">screenshot(frames)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Extracts one JPEG frame per requested timestamp as a multipart/mixed stream.</p>
</dd>
</dl>

<a name="firstJpeg"></a>

## firstJpeg(decoder, input, scaler) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Returns the first usable frame of a decoded video as JPEG.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The first decoded frame as JPEG, or undefined when none decoded.  

| Param | Type | Description |
| --- | --- | --- |
| decoder | <code>Decoder</code> | Decoder bound to the video stream. |
| input | <code>Demuxer</code> | Demuxer supplying the packets to decode. |
| scaler | <code>Scaler</code> | Scaler used to convert the frame to JPEG. |

src: packages/backend/src/resources/video/worker/screenshot.ts:27  
dist: packages/backend/dist/resources/video/worker/screenshot.js:65
<a name="screenshot"></a>

## screenshot(frames) ⇒ <code>Promise&lt;void&gt;</code>
Extracts one JPEG frame per requested timestamp as a multipart/mixed stream.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| frames | <code>number[]</code> | Requested timestamps in seconds (sorted, deduplicated). |

src: packages/backend/src/resources/video/worker/screenshot.ts:42  
dist: packages/backend/dist/resources/video/worker/screenshot.js:72
