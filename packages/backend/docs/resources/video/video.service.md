## Members

<dl>
<dt><a href="#VideoService">VideoService</a></dt>
<dd><p>Video feature service: streams uploads through workers for processing, metadata, DNA fingerprinting, stats and screenshots.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#requireInputFormat">requireInputFormat(cls)</a> ⇒ <code>string</code></dt>
<dd><p>Resolves the upload&#39;s detected signature to an FFmpeg demuxer format,
throwing the route&#39;s 415 when the signature is missing or unsupported.</p>
</dd>
</dl>

<a name="VideoService"></a>

## VideoService
Video feature service: streams uploads through workers for processing, metadata, DNA fingerprinting, stats and screenshots.

**Kind**: global variable  
src: packages/backend/src/resources/video/video.service.ts:34  
dist: packages/backend/dist/resources/video/video.service.js:24
<a name="VideoService+audio"></a>

### videoService.audio(options) ⇒ <code>Promise&lt;Readable&gt;</code>
Extracts the audio stream from a video upload.

**Kind**: instance method of [<code>VideoService</code>](#VideoService)  
**Returns**: <code>Promise&lt;Readable&gt;</code> - A readable stream of the encoded audio.  
**Throws**:

- UnsupportedMediaTypeException when the upload has no video signature or demuxer mapping.


| Param | Type | Description |
| --- | --- | --- |
| options | <code>{ payload: VideoAudioType; }</code> | Audio extraction options. |
| options.payload |  | Validated query options for the audio route. |

src: packages/backend/src/resources/video/video.service.ts:48  
dist: packages/backend/dist/resources/video/video.service.js:33
<a name="requireInputFormat"></a>

## requireInputFormat(cls) ⇒ <code>string</code>
Resolves the upload's detected signature to an FFmpeg demuxer format,
throwing the route's 415 when the signature is missing or unsupported.

**Kind**: global function  
**Returns**: <code>string</code> - The resolved demuxer format name.  
**Throws**:

- <code>UnsupportedMediaTypeException</code> When the signature has no demuxer mapping.


| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context carrying the file signature. |

src: packages/backend/src/resources/video/video.service.ts:24  
dist: packages/backend/dist/resources/video/video.service.js:18
