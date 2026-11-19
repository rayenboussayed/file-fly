## Members

<dl>
<dt><a href="#lineSpacing">lineSpacing</a></dt>
<dd><p>Spacing in points (spcPts).</p>
</dd>
<dt><a href="#data">data</a></dt>
<dd><p>Base64-encoded image bytes (no data URI prefix).</p>
</dd>
<dt><a href="#notes">notes</a></dt>
<dd><p>Speaker notes; plain text with newlines.</p>
</dd>
<dt><a href="#layout">layout</a></dt>
<dd><p>Built-in or <code>wide</code>/<code>square</code>; a custom layout via <code>defineLayout</code> is a future extension.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#PPTX_MIME">PPTX_MIME</a></dt>
<dd><p>Only the plain OOXML presentation mime; templates, macros and other packages are rejected.</p>
</dd>
<dt><a href="#hyperlinkSchema">hyperlinkSchema</a></dt>
<dd><p>A hyperlink attached to a text run.</p>
</dd>
<dt><a href="#runSchema">runSchema</a></dt>
<dd><p>A text run; every run-level pptxgenjs option is mirrored here.</p>
</dd>
<dt><a href="#textSchema">textSchema</a></dt>
<dd><p>A text box with one or more runs.</p>
</dd>
<dt><a href="#shapeSchema">shapeSchema</a></dt>
<dd><p>A shape, optionally with caption text.</p>
</dd>
<dt><a href="#tableSchema">tableSchema</a></dt>
<dd><p>A table with rows of cells.</p>
</dd>
<dt><a href="#imageSchema">imageSchema</a></dt>
<dd><p>A base64-embedded image.</p>
</dd>
<dt><a href="#chartSchema">chartSchema</a></dt>
<dd><p>A chart with one or more series.</p>
</dd>
<dt><a href="#PptxBuildSchema">PptxBuildSchema</a></dt>
<dd><p>Body of <code>POST /pptx/build</code>.</p>
</dd>
<dt><a href="#PptxExtractSchema">PptxExtractSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /pptx/extract</code> (empty; rejects junk params).</p>
</dd>
<dt><a href="#PptxMetadataSchema">PptxMetadataSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /pptx/metadata</code> (empty; rejects junk params).</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#xmlSafe">xmlSafe(max)</a> ⇒ <code>z.ZodString</code></dt>
<dd><p>Strings interpolated raw into the generated XML (fonts, company, revision...).
Single quote is safe inside double-quoted attributes.</p>
</dd>
</dl>

<a name="lineSpacing"></a>

## lineSpacing
Spacing in points (spcPts).

**Kind**: global variable  
src: packages/backend/src/resources/pptx/schema.ts:74  
dist: packages/backend/dist/resources/pptx/schema.js:50
<a name="data"></a>

## data
Base64-encoded image bytes (no data URI prefix).

**Kind**: global variable  
src: packages/backend/src/resources/pptx/schema.ts:308  
dist: packages/backend/dist/resources/pptx/schema.js:275
<a name="notes"></a>

## notes
Speaker notes; plain text with newlines.

**Kind**: global variable  
src: packages/backend/src/resources/pptx/schema.ts:363  
dist: packages/backend/dist/resources/pptx/schema.js:322
<a name="layout"></a>

## layout
Built-in or `wide`/`square`; a custom layout via `defineLayout` is a future extension.

**Kind**: global variable  
src: packages/backend/src/resources/pptx/schema.ts:381  
dist: packages/backend/dist/resources/pptx/schema.js:336
<a name="PPTX_MIME"></a>

## PPTX\_MIME
Only the plain OOXML presentation mime; templates, macros and other packages are rejected.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:6  
dist: packages/backend/dist/resources/pptx/schema.js:3
<a name="hyperlinkSchema"></a>

## hyperlinkSchema
A hyperlink attached to a text run.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:25  
dist: packages/backend/dist/resources/pptx/schema.js:8
<a name="runSchema"></a>

## runSchema
A text run; every run-level pptxgenjs option is mirrored here.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:36  
dist: packages/backend/dist/resources/pptx/schema.js:17
<a name="textSchema"></a>

## textSchema
A text box with one or more runs.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:66  
dist: packages/backend/dist/resources/pptx/schema.js:43
<a name="shapeSchema"></a>

## shapeSchema
A shape, optionally with caption text.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:266  
dist: packages/backend/dist/resources/pptx/schema.js:239
<a name="tableSchema"></a>

## tableSchema
A table with rows of cells.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:298  
dist: packages/backend/dist/resources/pptx/schema.js:268
<a name="imageSchema"></a>

## imageSchema
A base64-embedded image.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:305  
dist: packages/backend/dist/resources/pptx/schema.js:273
<a name="chartSchema"></a>

## chartSchema
A chart with one or more series.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:331  
dist: packages/backend/dist/resources/pptx/schema.js:295
<a name="PptxBuildSchema"></a>

## PptxBuildSchema
Body of `POST /pptx/build`.

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:378  
dist: packages/backend/dist/resources/pptx/schema.js:334
<a name="PptxExtractSchema"></a>

## PptxExtractSchema
Flat query parameters for `POST /pptx/extract` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:396  
dist: packages/backend/dist/resources/pptx/schema.js:348
<a name="PptxMetadataSchema"></a>

## PptxMetadataSchema
Flat query parameters for `POST /pptx/metadata` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/pptx/schema.ts:399  
dist: packages/backend/dist/resources/pptx/schema.js:349
<a name="xmlSafe"></a>

## xmlSafe(max) ⇒ <code>z.ZodString</code>
Strings interpolated raw into the generated XML (fonts, company, revision...).
Single quote is safe inside double-quoted attributes.

**Kind**: global function  
**Returns**: <code>z.ZodString</code> - A trimmed zod string schema rejecting XML-significant characters.  

| Param | Type | Description |
| --- | --- | --- |
| max | <code>number</code> | Maximum length of the string. |

src: packages/backend/src/resources/pptx/schema.ts:20  
dist: packages/backend/dist/resources/pptx/schema.js:5
