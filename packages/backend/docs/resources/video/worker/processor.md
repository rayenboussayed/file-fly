## Functions

<dl>
<dt><a href="#processMedia">processMedia(payload)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Transcodes the upload stdin into the requested format/codec and streams it out.</p>
</dd>
<dt><a href="#hasAudioTranscoding">hasAudioTranscoding(payload)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether any audio-side option forces a transcode of the audio stream.</p>
</dd>
<dt><a href="#hasVideoTranscoding">hasVideoTranscoding(payload)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether any video-side option forces a transcode of the video stream.</p>
</dd>
</dl>

<a name="processMedia"></a>

## processMedia(payload) ⇒ <code>Promise&lt;void&gt;</code>
Transcodes the upload stdin into the requested format/codec and streams it out.

**Kind**: global function  

| Param | Description |
| --- | --- |
| payload | The validated video processor options (format, codec, bitrate, filters...). |

src: packages/backend/src/resources/video/worker/processor.ts:33  
dist: packages/backend/dist/resources/video/worker/processor.js:62
<a name="hasAudioTranscoding"></a>

## hasAudioTranscoding(payload) ⇒ <code>boolean</code>
Whether any audio-side option forces a transcode of the audio stream.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when the audio stream must be re-encoded.  

| Param | Description |
| --- | --- |
| payload | The validated video processor options. |

src: packages/backend/src/resources/video/worker/processor.ts:150  
dist: packages/backend/dist/resources/video/worker/processor.js:185 (approx.)
<a name="hasVideoTranscoding"></a>

## hasVideoTranscoding(payload) ⇒ <code>boolean</code>
Whether any video-side option forces a transcode of the video stream.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when the video stream must be re-encoded.  

| Param | Description |
| --- | --- |
| payload | The validated video processor options. |

src: packages/backend/src/resources/video/worker/processor.ts:159  
dist: packages/backend/dist/resources/video/worker/processor.js:193 (approx.)
