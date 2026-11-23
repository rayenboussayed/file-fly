<a name="VideoService"></a>

## VideoService
Video feature service: streams uploads through workers for processing, metadata, DNA fingerprinting, stats and screenshots.

**Kind**: global variable  
src: packages/backend/src/resources/video/video.service.ts:19  
dist: packages/backend/dist/resources/video/video.service.js:18

* [VideoService](#VideoService)
    * [.audio(options)](#VideoService+audio) ⇒ <code>Promise&lt;Readable&gt;</code>
    * [.requireInputFormat()](#VideoService+requireInputFormat) ⇒ <code>string</code>

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

src: packages/backend/src/resources/video/video.service.ts:33  
dist: packages/backend/dist/resources/video/video.service.js:27
<a name="VideoService+requireInputFormat"></a>

### videoService.requireInputFormat() ⇒ <code>string</code>
Resolves the upload's detected signature to an FFmpeg demuxer format,
throwing the route's 415 when the signature is missing or unsupported.

**Kind**: instance method of [<code>VideoService</code>](#VideoService)  
**Returns**: <code>string</code> - The resolved demuxer format name.  
**Throws**:

- <code>UnsupportedMediaTypeException</code> When the signature has no demuxer mapping.

src: packages/backend/src/resources/video/video.service.ts:113  
dist: packages/backend/dist/resources/video/video.service.js:91
