## Members

<dl>
<dt><a href="#AudioService">AudioService</a></dt>
<dd><p>Audio feature service: streams uploads through workers for processing, metadata, DNA fingerprinting and stats.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#requireInputFormat">requireInputFormat(cls)</a> ⇒ <code>string</code></dt>
<dd><p>Resolves the upload&#39;s detected signature to an FFmpeg demuxer format,
throwing the route&#39;s 415 when the signature is missing or unsupported.</p>
</dd>
</dl>

<a name="AudioService"></a>

## AudioService
Audio feature service: streams uploads through workers for processing, metadata, DNA fingerprinting and stats.

**Kind**: global variable  
src: packages/backend/src/resources/audio/audio.service.ts:31  
dist: packages/backend/dist/resources/audio/audio.service.js:22
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

src: packages/backend/src/resources/audio/audio.service.ts:21  
dist: packages/backend/dist/resources/audio/audio.service.js:16
