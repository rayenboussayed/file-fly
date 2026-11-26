## Constants

<dl>
<dt><a href="#VideoProcessorSchema">VideoProcessorSchema</a></dt>
<dd><p>Query parameters for <code>/video/processor</code>, <code>/video/metadata</code>, <code>/video/dna</code> and <code>/video/stats</code> uploads.</p>
</dd>
<dt><a href="#ScreenshotSchema">ScreenshotSchema</a></dt>
<dd><p>Query parameters for <code>POST /video/screenshot</code> (extracted JPEG frames as multipart).</p>
</dd>
<dt><a href="#VideoAudioSchema">VideoAudioSchema</a></dt>
<dd><p>Query parameters for <code>/video/audio</code> (audio extraction from a video upload).</p>
<p>Reuses the audio processor options except <code>codec</code>, which is derived from
<code>format</code> so an incompatible encoder/muxer pair can never be requested.
<code>format</code> defaults to <code>mp3</code>.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#parseFrames">parseFrames(raw)</a> ⇒ <code>number[]</code></dt>
<dd><p>Parse a comma-separated list of frame timestamps into a deduplicated,
validated, sorted, and capped array of seconds.</p>
</dd>
</dl>

<a name="VideoProcessorSchema"></a>

## VideoProcessorSchema
Query parameters for `/video/processor`, `/video/metadata`, `/video/dna` and `/video/stats` uploads.

**Kind**: global constant  
src: packages/backend/src/resources/video/schema.ts:18  
dist: packages/backend/dist/resources/video/schema.js:11
<a name="ScreenshotSchema"></a>

## ScreenshotSchema
Query parameters for `POST /video/screenshot` (extracted JPEG frames as multipart).

**Kind**: global constant  
src: packages/backend/src/resources/video/schema.ts:59  
dist: packages/backend/dist/resources/video/schema.js:37
<a name="VideoAudioSchema"></a>

## VideoAudioSchema
Query parameters for `/video/audio` (audio extraction from a video upload).

Reuses the audio processor options except `codec`, which is derived from
`format` so an incompatible encoder/muxer pair can never be requested.
`format` defaults to `mp3`.

**Kind**: global constant  
src: packages/backend/src/resources/video/schema.ts:90  
dist: packages/backend/dist/resources/video/schema.js:50
<a name="parseFrames"></a>

## parseFrames(raw) ⇒ <code>number[]</code>
Parse a comma-separated list of frame timestamps into a deduplicated,
validated, sorted, and capped array of seconds.

**Kind**: global function  
**Returns**: <code>number[]</code> - Sorted unique frame timestamps in seconds.  

| Param | Type | Description |
| --- | --- | --- |
| raw | <code>string</code> | Raw comma-separated frame string. |

src: packages/backend/src/resources/video/schema.ts:74  
dist: packages/backend/dist/resources/video/schema.js:40
