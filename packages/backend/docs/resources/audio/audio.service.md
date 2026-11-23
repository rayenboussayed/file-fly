<a name="AudioService"></a>

## AudioService
Audio feature service: streams uploads through workers for processing, metadata, DNA fingerprinting and stats.

**Kind**: global variable  
src: packages/backend/src/resources/audio/audio.service.ts:16  
dist: packages/backend/dist/resources/audio/audio.service.js:16
<a name="AudioService+requireInputFormat"></a>

### audioService.requireInputFormat() ⇒ <code>string</code>
Resolves the upload's detected signature to an FFmpeg demuxer format,
throwing the route's 415 when the signature is missing or unsupported.

**Kind**: instance method of [<code>AudioService</code>](#AudioService)  
**Returns**: <code>string</code> - The resolved demuxer format name.  
**Throws**:

- <code>UnsupportedMediaTypeException</code> When the signature has no demuxer mapping.

src: packages/backend/src/resources/audio/audio.service.ts:74  
dist: packages/backend/dist/resources/audio/audio.service.js:63
