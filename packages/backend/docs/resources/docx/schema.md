## Members

<dl>
<dt><a href="#endnote">endnote</a></dt>
<dd><p>Endnote id; renders an endnote reference at this position.</p>
</dd>
<dt><a href="#footnote">footnote</a></dt>
<dd><p>Footnote id; renders a footnote reference at this position.</p>
</dd>
<dt><a href="#superScript">superScript</a></dt>
<dd><p>Superscript (mutually exclusive with subscript).</p>
</dd>
<dt><a href="#after">after</a></dt>
<dd><p>Space before in points.</p>
</dd>
<dt><a href="#before">before</a></dt>
<dd><p>Space after in points.</p>
</dd>
<dt><a href="#line">line</a></dt>
<dd><p>Exact line rule (atLeast/exact exactly/auto).</p>
</dd>
<dt><a href="#position">position</a></dt>
<dd><p>Position in twentieths of a point (same unit as Word tab positions).</p>
</dd>
<dt><a href="#size">size</a></dt>
<dd><p>Size in eighths of a point (Word sz).</p>
</dd>
<dt><a href="#headerRow">headerRow</a></dt>
<dd><p>Repeats the first row across pages.</p>
</dd>
<dt><a href="#data">data</a></dt>
<dd><p>Base64-encoded image bytes (no data URI prefix).</p>
</dd>
<dt><a href="#fallback">fallback</a></dt>
<dd><p>Required for <code>imageType: &#39;svg&#39;</code>; a raster fallback for processors that cannot draw SVG.</p>
</dd>
<dt><a href="#anchor">anchor</a></dt>
<dd><p>Anchor of an in-document bookmark; wins over url when both set.</p>
</dd>
<dt><a href="#levels">levels</a></dt>
<dd><p>Heading depth to include (1-6).</p>
</dd>
<dt><a href="#title">title</a></dt>
<dd><p>The alias (title) of the inserted table of contents.</p>
</dd>
<dt><a href="#comments">comments</a></dt>
<dd><p>Comments; each is appended at the end of the document with an id reference.</p>
</dd>
<dt><a href="#endnotes">endnotes</a></dt>
<dd><p>Endnote definitions keyed by the ids referenced from runs.</p>
</dd>
<dt><a href="#footnotes">footnotes</a></dt>
<dd><p>Footnote definitions keyed by the ids referenced from runs.</p>
</dd>
<dt><a href="#numbering">numbering</a></dt>
<dd><p>Numbering definitions referenced from paragraph elements.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#DOCX_MIME">DOCX_MIME</a></dt>
<dd><p>Only the plain OOXML word mime; templates, macros and other packages are rejected.</p>
</dd>
<dt><a href="#DocxExtractSchema">DocxExtractSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /docx/extract</code> (empty; rejects junk params).</p>
</dd>
<dt><a href="#DocxMetadataSchema">DocxMetadataSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /docx/metadata</code> (empty; rejects junk params).</p>
</dd>
<dt><a href="#runSchema">runSchema</a></dt>
<dd><p>A formatted text run; every TextRun option is mirrored here.</p>
</dd>
<dt><a href="#DocxBuildSchema">DocxBuildSchema</a></dt>
<dd><p>Body of <code>POST /docx/build</code>.</p>
</dd>
</dl>

<a name="endnote"></a>

## endnote
Endnote id; renders an endnote reference at this position.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:27  
dist: packages/backend/dist/resources/docx/schema.js:15
<a name="footnote"></a>

## footnote
Footnote id; renders a footnote reference at this position.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:29  
dist: packages/backend/dist/resources/docx/schema.js:16
<a name="superScript"></a>

## superScript
Superscript (mutually exclusive with subscript).

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:39  
dist: packages/backend/dist/resources/docx/schema.js:25
<a name="after"></a>

## after
Space before in points.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:63  
dist: packages/backend/dist/resources/docx/schema.js:45
<a name="before"></a>

## before
Space after in points.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:65  
dist: packages/backend/dist/resources/docx/schema.js:46
<a name="line"></a>

## line
Exact line rule (atLeast/exact exactly/auto).

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:67  
dist: packages/backend/dist/resources/docx/schema.js:47
<a name="position"></a>

## position
Position in twentieths of a point (same unit as Word tab positions).

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:93  
dist: packages/backend/dist/resources/docx/schema.js:69
<a name="size"></a>

## size
Size in eighths of a point (Word sz).

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:105  
dist: packages/backend/dist/resources/docx/schema.js:78
<a name="headerRow"></a>

## headerRow
Repeats the first row across pages.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:154  
dist: packages/backend/dist/resources/docx/schema.js:121
<a name="data"></a>

## data
Base64-encoded image bytes (no data URI prefix).

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:166  
dist: packages/backend/dist/resources/docx/schema.js:131
<a name="fallback"></a>

## fallback
Required for `imageType: 'svg'`; a raster fallback for processors that cannot draw SVG.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:168  
dist: packages/backend/dist/resources/docx/schema.js:132
<a name="anchor"></a>

## anchor
Anchor of an in-document bookmark; wins over url when both set.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:185  
dist: packages/backend/dist/resources/docx/schema.js:147
<a name="levels"></a>

## levels
Heading depth to include (1-6).

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:195  
dist: packages/backend/dist/resources/docx/schema.js:155
<a name="title"></a>

## title
The alias (title) of the inserted table of contents.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:197  
dist: packages/backend/dist/resources/docx/schema.js:156
<a name="comments"></a>

## comments
Comments; each is appended at the end of the document with an id reference.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:341  
dist: packages/backend/dist/resources/docx/schema.js:282
<a name="endnotes"></a>

## endnotes
Endnote definitions keyed by the ids referenced from runs.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:343  
dist: packages/backend/dist/resources/docx/schema.js:283
<a name="footnotes"></a>

## footnotes
Footnote definitions keyed by the ids referenced from runs.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:345  
dist: packages/backend/dist/resources/docx/schema.js:284
<a name="numbering"></a>

## numbering
Numbering definitions referenced from paragraph elements.

**Kind**: global variable  
src: packages/backend/src/resources/docx/schema.ts:348  
dist: packages/backend/dist/resources/docx/schema.js:286
<a name="DOCX_MIME"></a>

## DOCX\_MIME
Only the plain OOXML word mime; templates, macros and other packages are rejected.

**Kind**: global constant  
src: packages/backend/src/resources/docx/schema.ts:8  
dist: packages/backend/dist/resources/docx/schema.js:4
<a name="DocxExtractSchema"></a>

## DocxExtractSchema
Flat query parameters for `POST /docx/extract` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/docx/schema.ts:12  
dist: packages/backend/dist/resources/docx/schema.js:5
<a name="DocxMetadataSchema"></a>

## DocxMetadataSchema
Flat query parameters for `POST /docx/metadata` (empty; rejects junk params).

**Kind**: global constant  
src: packages/backend/src/resources/docx/schema.ts:15  
dist: packages/backend/dist/resources/docx/schema.js:6
<a name="runSchema"></a>

## runSchema
A formatted text run; every TextRun option is mirrored here.

**Kind**: global constant  
src: packages/backend/src/resources/docx/schema.ts:19  
dist: packages/backend/dist/resources/docx/schema.js:8
<a name="DocxBuildSchema"></a>

## DocxBuildSchema
Body of `POST /docx/build`.

**Kind**: global constant  
src: packages/backend/src/resources/docx/schema.ts:338  
dist: packages/backend/dist/resources/docx/schema.js:280
