<a name="VideoService"></a>

## VideoService
Video feature service: streams uploads through workers for processing, metadata, DNA fingerprinting, stats and screenshots.

**Kind**: global variable  
src: packages/backend/src/resources/video/video.service.ts:17  
dist: packages/backend/dist/resources/video/video.service.js:17
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

src: packages/backend/src/resources/video/video.service.ts:31  
dist: packages/backend/dist/resources/video/video.service.js:26
