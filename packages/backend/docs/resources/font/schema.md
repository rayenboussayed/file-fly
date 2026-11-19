## Members

<dl>
<dt><a href="#font">font</a></dt>
<dd><p>Collection member to select by PostScript name; defaults to the first.</p>
</dd>
<dt><a href="#font">font</a></dt>
<dd><p>Collection member to select by PostScript name; defaults to the first.</p>
</dd>
<dt><a href="#limit">limit</a></dt>
<dd><p>Maximum glyph records to return (default: all).</p>
</dd>
<dt><a href="#direction">direction</a></dt>
<dd><p>Direction override; defaults to the script default.</p>
</dd>
<dt><a href="#features">features</a></dt>
<dd><p>Comma-separated feature tags to enable or disable with a leading &#39;-&#39; (e.g. &#39;liga,-dlig,kern&#39;).</p>
</dd>
<dt><a href="#font">font</a></dt>
<dd><p>Collection member to select by PostScript name; defaults to the first.</p>
</dd>
<dt><a href="#language">language</a></dt>
<dd><p>Language override (e.g. en); defaults to the script default.</p>
</dd>
<dt><a href="#script">script</a></dt>
<dd><p>Script override (e.g. Latn); defaults to the shaper&#39;s detection.</p>
</dd>
<dt><a href="#text">text</a></dt>
<dd><p>The text to shape (max 500 chars).</p>
</dd>
<dt><a href="#font">font</a></dt>
<dd><p>Collection member to select by PostScript name; defaults to the first.</p>
</dd>
<dt><a href="#text">text</a></dt>
<dd><p>The text to include in the subset (max 10 000 chars).</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#FONT_MIMES">FONT_MIMES</a></dt>
<dd><p>Plain mimes (no macro/executable fonts); file-type detects all of these.</p>
</dd>
<dt><a href="#isFontMime">isFontMime</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether the mime is a supported font container.</p>
</dd>
<dt><a href="#FontMetaSchema">FontMetaSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /font/metadata</code>.</p>
</dd>
<dt><a href="#FontExtractSchema">FontExtractSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /font/extract</code>.</p>
</dd>
<dt><a href="#FontShapeSchema">FontShapeSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /font/shape</code>.</p>
</dd>
<dt><a href="#FontSubsetSchema">FontSubsetSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /font/subset</code>.</p>
</dd>
</dl>

<a name="font"></a>

## font
Collection member to select by PostScript name; defaults to the first.

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:27  
dist: packages/backend/dist/resources/font/schema.js:14
<a name="font"></a>

## font
Collection member to select by PostScript name; defaults to the first.

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:37  
dist: packages/backend/dist/resources/font/schema.js:19
<a name="limit"></a>

## limit
Maximum glyph records to return (default: all).

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:39  
dist: packages/backend/dist/resources/font/schema.js:20
<a name="direction"></a>

## direction
Direction override; defaults to the script default.

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:48  
dist: packages/backend/dist/resources/font/schema.js:24
<a name="features"></a>

## features
Comma-separated feature tags to enable or disable with a leading '-' (e.g. 'liga,-dlig,kern').

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:50  
dist: packages/backend/dist/resources/font/schema.js:25
<a name="font"></a>

## font
Collection member to select by PostScript name; defaults to the first.

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:52  
dist: packages/backend/dist/resources/font/schema.js:26
<a name="language"></a>

## language
Language override (e.g. en); defaults to the script default.

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:54  
dist: packages/backend/dist/resources/font/schema.js:27
<a name="script"></a>

## script
Script override (e.g. Latn); defaults to the shaper's detection.

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:56  
dist: packages/backend/dist/resources/font/schema.js:28
<a name="text"></a>

## text
The text to shape (max 500 chars).

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:58  
dist: packages/backend/dist/resources/font/schema.js:29
<a name="font"></a>

## font
Collection member to select by PostScript name; defaults to the first.

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:65  
dist: packages/backend/dist/resources/font/schema.js:32
<a name="text"></a>

## text
The text to include in the subset (max 10 000 chars).

**Kind**: global variable  
src: packages/backend/src/resources/font/schema.ts:67  
dist: packages/backend/dist/resources/font/schema.js:33
<a name="FONT_MIMES"></a>

## FONT\_MIMES
Plain mimes (no macro/executable fonts); file-type detects all of these.

**Kind**: global constant  
src: packages/backend/src/resources/font/schema.ts:6  
dist: packages/backend/dist/resources/font/schema.js:3
<a name="isFontMime"></a>

## isFontMime ⇒ <code>boolean</code>
Whether the mime is a supported font container.

**Kind**: global constant  
**Returns**: <code>boolean</code> - True for the five supported container mimes.  

| Param | Type | Description |
| --- | --- | --- |
| mime | <code>string</code> | The lowercased content-type mime. |

src: packages/backend/src/resources/font/schema.ts:21  
dist: packages/backend/dist/resources/font/schema.js:11
<a name="FontMetaSchema"></a>

## FontMetaSchema
Flat query parameters for `POST /font/metadata`.

**Kind**: global constant  
src: packages/backend/src/resources/font/schema.ts:24  
dist: packages/backend/dist/resources/font/schema.js:12
<a name="FontExtractSchema"></a>

## FontExtractSchema
Flat query parameters for `POST /font/extract`.

**Kind**: global constant  
src: packages/backend/src/resources/font/schema.ts:34  
dist: packages/backend/dist/resources/font/schema.js:17
<a name="FontShapeSchema"></a>

## FontShapeSchema
Flat query parameters for `POST /font/shape`.

**Kind**: global constant  
src: packages/backend/src/resources/font/schema.ts:46  
dist: packages/backend/dist/resources/font/schema.js:23
<a name="FontSubsetSchema"></a>

## FontSubsetSchema
Flat query parameters for `POST /font/subset`.

**Kind**: global constant  
src: packages/backend/src/resources/font/schema.ts:63  
dist: packages/backend/dist/resources/font/schema.js:31
