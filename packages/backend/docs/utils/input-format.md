## Constants

<dl>
<dt><a href="#EXT_TO_DEMUXER">EXT_TO_DEMUXER</a></dt>
<dd><p>Maps a detected file signature to an FFmpeg demuxer format name.</p>
<p>file-type reports short extensions (e.g. <code>mkv</code>, <code>mts</code>), while FFmpeg&#39;s
demuxer names occasionally differ (e.g. <code>matroska</code>, <code>mpegts</code>). This table
bridges that gap so callers never have to pass <code>inputFormat</code> manually.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#toDemuxerFormat">toDemuxerFormat(signature)</a> ⇒ <code>string</code></dt>
<dd><p>Resolve a detected file signature to an FFmpeg demuxer format name.</p>
</dd>
</dl>

<a name="EXT_TO_DEMUXER"></a>

## EXT\_TO\_DEMUXER
Maps a detected file signature to an FFmpeg demuxer format name.

file-type reports short extensions (e.g. `mkv`, `mts`), while FFmpeg's
demuxer names occasionally differ (e.g. `matroska`, `mpegts`). This table
bridges that gap so callers never have to pass `inputFormat` manually.

**Kind**: global constant  
src: packages/backend/src/utils/input-format.ts:12  
dist: packages/backend/dist/utils/input-format.js:2
<a name="toDemuxerFormat"></a>

## toDemuxerFormat(signature) ⇒ <code>string</code>
Resolve a detected file signature to an FFmpeg demuxer format name.

**Kind**: global function  
**Returns**: <code>string</code> - The FFmpeg demuxer format name, or undefined when unknown.  

| Param | Type | Description |
| --- | --- | --- |
| signature | <code>FileTypeResult</code> | Detected file-type signature of the upload. |

src: packages/backend/src/utils/input-format.ts:104  
dist: packages/backend/dist/utils/input-format.js:86
