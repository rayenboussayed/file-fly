## Functions

<dl>
<dt><a href="#buildAudioFilters">buildAudioFilters(payload)</a> ⇒ <code>FilterAPI[]</code></dt>
<dd><p>Builds the audio filter chain for a transcode (channel mix, resample, loudnorm).</p>
</dd>
<dt><a href="#buildVideoFilters">buildVideoFilters(payload)</a> ⇒ <code>FilterAPI[]</code></dt>
<dd><p>Builds the video filter chain (trim, deinterlace, scale, fps, denoise, ...).</p>
</dd>
</dl>

<a name="buildAudioFilters"></a>

## buildAudioFilters(payload) ⇒ <code>FilterAPI[]</code>
Builds the audio filter chain for a transcode (channel mix, resample, loudnorm).

**Kind**: global function  
**Returns**: <code>FilterAPI[]</code> - The filters to apply on the audio stream, in order.  

| Param | Description |
| --- | --- |
| payload | The validated video processor options. |

src: packages/backend/src/resources/video/worker/filters.ts:10  
dist: packages/backend/dist/resources/video/worker/filters.js:2
<a name="buildVideoFilters"></a>

## buildVideoFilters(payload) ⇒ <code>FilterAPI[]</code>
Builds the video filter chain (trim, deinterlace, scale, fps, denoise, ...).

**Kind**: global function  
**Returns**: <code>FilterAPI[]</code> - The filters to apply on the video stream, in order.  

| Param | Description |
| --- | --- |
| payload | The validated video processor options. |

src: packages/backend/src/resources/video/worker/filters.ts:23  
dist: packages/backend/dist/resources/video/worker/filters.js:12
