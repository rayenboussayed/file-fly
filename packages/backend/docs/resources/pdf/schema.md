## Members

<dl>
<dt><a href="#w">w</a></dt>
<dd><p>Box width in points; required when <code>align</code> is not <code>left</code> (text wraps to it).</p>
</dd>
<dt><a href="#dash">dash</a></dt>
<dd><p>Dashed outline.</p>
</dd>
<dt><a href="#dash">dash</a></dt>
<dd><p>Dashed line.</p>
</dd>
<dt><a href="#name">name</a></dt>
<dd><p>Field name (AcroForm identifier).</p>
</dd>
<dt><a href="#value">value</a></dt>
<dd><p>Default value; checkbox: &quot;true&quot; checks it.</p>
</dd>
<dt><a href="#format">format</a></dt>
<dd><p><code>{n}</code> placeholder; <code>{total}</code> resolves to the last page number. No newlines.</p>
</dd>
<dt><a href="#size">size</a></dt>
<dd><p>Cell font size.</p>
</dd>
<dt><a href="#colWidths">colWidths</a></dt>
<dd><p>Column widths in points; omit for equal-width columns. Must match the column count.</p>
</dd>
<dt><a href="#header">header</a></dt>
<dd><p>Treat the first row as a header (bold, shaded).</p>
</dd>
<dt><a href="#w">w</a></dt>
<dd><p>Content does not paginate; a table taller than the page is clipped off-page.</p>
</dd>
<dt><a href="#margin">margin</a></dt>
<dd><p>Page margins in points (72 = 1 inch).</p>
</dd>
<dt><a href="#creationDate">creationDate</a></dt>
<dd><p>ISO-8601 timestamp; pdf-lib keeps it (CreationDate only set when absent).</p>
</dd>
<dt><a href="#keywords">keywords</a></dt>
<dd><p>Comma-separated keywords or an array; written as PDF keywords.</p>
</dd>
<dt><a href="#data">data</a></dt>
<dd><p>Base64-encoded TTF/OTF bytes.</p>
</dd>
<dt><a href="#name">name</a></dt>
<dd><p>Name referenced by <code>font</code> in elements.</p>
</dd>
<dt><a href="#embeddedFonts">embeddedFonts</a></dt>
<dd><p>Embedded TTF/OTF fonts, referenced by elements via <code>font</code>. WinAnsi preflight is skipped for these.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#PDF_MIME">PDF_MIME</a></dt>
<dd><p>Only the plain PDF mime.</p>
</dd>
<dt><a href="#PdfBuildSchema">PdfBuildSchema</a></dt>
<dd><p>Body of <code>POST /pdf/build</code>.</p>
</dd>
<dt><a href="#PdfExtractSchema">PdfExtractSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /pdf/extract</code> (empty; rejects junk params).</p>
</dd>
<dt><a href="#PdfMetadataSchema">PdfMetadataSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /pdf/metadata</code> (empty; rejects junk params).</p>
</dd>
</dl>

<a name="w"></a>

## w
Box width in points; required when `align` is not `left` (text wraps to it).

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:49  
dist: packages/backend/dist/resources/pdf/schema.js:40
<a name="dash"></a>

## dash
Dashed outline.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:61  
dist: packages/backend/dist/resources/pdf/schema.js:50
<a name="dash"></a>

## dash
Dashed line.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:90  
dist: packages/backend/dist/resources/pdf/schema.js:76
<a name="name"></a>

## name
Field name (AcroForm identifier).

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:118  
dist: packages/backend/dist/resources/pdf/schema.js:101
<a name="value"></a>

## value
Default value; checkbox: "true" checks it.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:121  
dist: packages/backend/dist/resources/pdf/schema.js:103
<a name="format"></a>

## format
`{n}` placeholder; `{total}` resolves to the last page number. No newlines.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:133  
dist: packages/backend/dist/resources/pdf/schema.js:113
<a name="size"></a>

## size
Cell font size.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:149  
dist: packages/backend/dist/resources/pdf/schema.js:127
<a name="colWidths"></a>

## colWidths
Column widths in points; omit for equal-width columns. Must match the column count.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:158  
dist: packages/backend/dist/resources/pdf/schema.js:134
<a name="header"></a>

## header
Treat the first row as a header (bold, shaded).

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:160  
dist: packages/backend/dist/resources/pdf/schema.js:135
<a name="w"></a>

## w
Content does not paginate; a table taller than the page is clipped off-page.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:164  
dist: packages/backend/dist/resources/pdf/schema.js:138
<a name="margin"></a>

## margin
Page margins in points (72 = 1 inch).

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:207  
dist: packages/backend/dist/resources/pdf/schema.js:168
<a name="creationDate"></a>

## creationDate
ISO-8601 timestamp; pdf-lib keeps it (CreationDate only set when absent).

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:225  
dist: packages/backend/dist/resources/pdf/schema.js:184
<a name="keywords"></a>

## keywords
Comma-separated keywords or an array; written as PDF keywords.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:228  
dist: packages/backend/dist/resources/pdf/schema.js:186
<a name="data"></a>

## data
Base64-encoded TTF/OTF bytes.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:238  
dist: packages/backend/dist/resources/pdf/schema.js:194
<a name="name"></a>

## name
Name referenced by `font` in elements.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:240  
dist: packages/backend/dist/resources/pdf/schema.js:195
<a name="embeddedFonts"></a>

## embeddedFonts
Embedded TTF/OTF fonts, referenced by elements via `font`. WinAnsi preflight is skipped for these.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/schema.ts:248  
dist: packages/backend/dist/resources/pdf/schema.js:218 (approx.)
<a name="PDF_MIME"></a>

## PDF\_MIME
Only the plain PDF mime.

**Kind**: global constant  
src: packages/backend/src/resources/pdf/schema.ts:6  
dist: packages/backend/dist/resources/pdf/schema.js:3
<a name="PdfBuildSchema"></a>

## PdfBuildSchema
Body of `POST /pdf/build`.

**Kind**: global constant  
src: packages/backend/src/resources/pdf/schema.ts:245  
dist: packages/backend/dist/resources/pdf/schema.js:215 (approx.)
<a name="PdfExtractSchema"></a>

## PdfExtractSchema
Flat query parameters for `POST /pdf/extract` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/pdf/schema.ts:272  
dist: packages/backend/dist/resources/pdf/schema.js:238 (approx.)
<a name="PdfMetadataSchema"></a>

## PdfMetadataSchema
Flat query parameters for `POST /pdf/metadata` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/pdf/schema.ts:274  
dist: packages/backend/dist/resources/pdf/schema.js:240 (approx.)
