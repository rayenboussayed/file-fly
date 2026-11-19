## Constants

<dl>
<dt><a href="#OUTPUT_CONTENT_TYPE">OUTPUT_CONTENT_TYPE</a></dt>
<dd><p>Content-Type for each streamable output format.</p>
</dd>
<dt><a href="#MP4_FRAGMENTED_OPTIONS">MP4_FRAGMENTED_OPTIONS</a></dt>
<dd><p>Fragmented-MP4 muxer flags for progressive download without re-muxing.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#isAllowedOutputFormat">isAllowedOutputFormat(format)</a> ⇒ <code>boolean</code></dt>
<dd></dd>
</dl>

<a name="OUTPUT_CONTENT_TYPE"></a>

## OUTPUT\_CONTENT\_TYPE
Content-Type for each streamable output format.

**Kind**: global constant  
src: packages/backend/src/utils/capabilities.ts:16  
dist: packages/backend/dist/utils/capabilities.js:12 (approx.)
<a name="MP4_FRAGMENTED_OPTIONS"></a>

## MP4\_FRAGMENTED\_OPTIONS
Fragmented-MP4 muxer flags for progressive download without re-muxing.

**Kind**: global constant  
src: packages/backend/src/utils/capabilities.ts:28  
dist: packages/backend/dist/utils/capabilities.js:20
<a name="isAllowedOutputFormat"></a>

## isAllowedOutputFormat(format) ⇒ <code>boolean</code>
**Kind**: global function  
**Returns**: <code>boolean</code> - True when the format is in the streamable output allowlist.  

| Param | Type | Description |
| --- | --- | --- |
| format | <code>string</code> | Candidate container/codec format name. |

src: packages/backend/src/utils/capabilities.ts:36  
dist: packages/backend/dist/utils/capabilities.js:30 (approx.)
