## Constants

<dl>
<dt><a href="#STANDARD">STANDARD</a></dt>
<dd><p>Map of the 14 Standard PDF fonts to pdf-lib&#39;s StandardFonts enum.</p>
</dd>
<dt><a href="#standardValueOf">standardValueOf</a> ⇒ <code>StandardFonts</code></dt>
<dd><p>Looks up a standard font without prototype-index access.</p>
</dd>
<dt><a href="#PAGE_SIZES">PAGE_SIZES</a></dt>
<dd><p>Page dimensions in points (1 pt = 1/72 inch).</p>
</dd>
<dt><a href="#pageSizeOf">pageSizeOf</a> ⇒ <code>[number, number]</code></dt>
<dd><p>Page dimensions in points for the given size/orientation, landscape swaps them.</p>
</dd>
<dt><a href="#drawElement">drawElement</a> ⇒ <code>void</code></dt>
<dd><p>Draws one element onto the page (image/table/field handled via the pre-embedded state).</p>
</dd>
<dt><a href="#collectFontNames">collectFontNames</a> ⇒ <code>string[]</code></dt>
<dd><p>Fonts referenced by an element (embedded or standard name).</p>
</dd>
<dt><a href="#segmentPages">segmentPages</a> ⇒ <code>{ elements: Array&lt;Exclude&lt;ElementType, { type: &quot;pageBreak&quot;; }&gt;&gt;; page: PdfPageType; }[]</code></dt>
<dd><p>Splits each page&#39;s element list at <code>pageBreak</code> elements into physical page segments.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#resolveFont">resolveFont(ctx, name)</a> ⇒ <code>PDFFont</code></dt>
<dd><p>Resolves a public font name to the pre-embedded font; missing names are a build error.</p>
</dd>
<dt><a href="#isStandardWinAnsiFont">isStandardWinAnsiFont(ctx, name)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether the named font is a WinAnsi standard font (not Symbol/ZapfDingbats, not embedded).</p>
</dd>
<dt><a href="#assertWinAnsiText">assertWinAnsiText(text, where)</a></dt>
<dd><p>Throws 400 when any character is outside the WinAnsi encoding (standard fonts only).</p>
</dd>
<dt><a href="#assertFontEncodes">assertFontEncodes(font, fontName, text, where)</a></dt>
<dd><p>Belt-and-braces: any standard font rejects what its own encoding cannot carry.</p>
</dd>
<dt><a href="#wrapParagraph">wrapParagraph(text, font, size, maxWidth)</a> ⇒ <code>string[]</code></dt>
<dd><p>Word-greedy line breaking, respecting the given width at the given size.</p>
</dd>
<dt><a href="#wrapLines">wrapLines(text, font, size, maxWidth)</a> ⇒ <code>string[]</code></dt>
<dd><p>Wraps text on newlines, then on words; empty paragraphs become blank lines.</p>
</dd>
<dt><a href="#textOffset">textOffset(align, lineWidth, boxWidth)</a> ⇒ <code>number</code></dt>
<dd><p>Horizontal offset for a line within a box.</p>
</dd>
<dt><a href="#cellOf">cellOf(cell)</a> ⇒ <code>{ align: Align; colSpan: number; fill?: string; size: number; text: string; }</code></dt>
<dd><p>Normalizes a table cell union (string or object) to the internal shape.</p>
</dd>
<dt><a href="#cellFontOf">cellFontOf(font, headerFont, isHeader)</a> ⇒ <code>PDFFont</code></dt>
<dd><p>Picks the header font for header rows, the body font otherwise.</p>
</dd>
<dt><a href="#rowHeightOf">rowHeightOf(row, colWidths, font, headerFont, isHeader)</a> ⇒ <code>number</code></dt>
<dd><p>Measures a table row&#39;s height from its tallest cell after wrapping.</p>
</dd>
<dt><a href="#paintCellText">paintCellText(page, cell, cellX, cursorY, innerWidth, font, headerFont, isHeader)</a></dt>
<dd><p>Paints one cell&#39;s text lines, vertically top-aligned with padding.</p>
</dd>
<dt><a href="#paintRow">paintRow(page, row, colWidths, cursorY, rowHeight, startX, font, headerFont, isHeader, topToY)</a></dt>
<dd><p>Paints one row: cell backgrounds, borders and text.</p>
</dd>
<dt><a href="#assertTableEncodable">assertTableEncodable(element, font)</a></dt>
<dd><p>Validates that every table cell text encodes with the table font (Helvetica WinAnsi).</p>
</dd>
<dt><a href="#exhaustiveNever">exhaustiveNever(value)</a> ⇒ <code>never</code></dt>
<dd><p>Throws for an unrepresentable element; only reachable via a widened union.</p>
</dd>
</dl>

<a name="STANDARD"></a>

## STANDARD
Map of the 14 Standard PDF fonts to pdf-lib's StandardFonts enum.

**Kind**: global constant  
src: packages/backend/src/resources/pdf/elements.ts:30  
dist: packages/backend/dist/resources/pdf/elements.js:13
<a name="standardValueOf"></a>

## standardValueOf ⇒ <code>StandardFonts</code>
Looks up a standard font without prototype-index access.

**Kind**: global constant  
**Returns**: <code>StandardFonts</code> - The enum value, or undefined.  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The public font name. |

src: packages/backend/src/resources/pdf/elements.ts:74  
dist: packages/backend/dist/resources/pdf/elements.js:37
<a name="PAGE_SIZES"></a>

## PAGE\_SIZES
Page dimensions in points (1 pt = 1/72 inch).

**Kind**: global constant  
src: packages/backend/src/resources/pdf/elements.ts:122  
dist: packages/backend/dist/resources/pdf/elements.js:61
<a name="pageSizeOf"></a>

## pageSizeOf ⇒ <code>[number, number]</code>
Page dimensions in points for the given size/orientation, landscape swaps them.

**Kind**: global constant  
**Returns**: <code>[number, number]</code> - The width and height in points.  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>{ elements: ({ [x: string]: any; text: string; type: &quot;text&quot;; x: number; y: number; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; font?: string; size?: number; w?: number; } \| { [x: string]: any; h: number; type: &quot;rect&quot;; w: number; x: number; y: number; dash?: boolean; strokeWidth?: number; } \| { [x: string]: any; h: number; type: &quot;ellipse&quot;; w: number; x: number; y: number; strokeWidth?: number; } \| { [x: string]: any; type: &quot;line&quot;; x1: number; x2: number; y1: number; y2: number; dash?: boolean; thickness?: number; } \| { data: string; h: number; imageType: &quot;png&quot; \| &quot;jpg&quot;; type: &quot;image&quot;; w: number; x: number; y: number; opacity?: number; } \| { rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; } \| { [x: string]: any; fieldType: &quot;text&quot; \| &quot;checkbox&quot;; type: &quot;field&quot;; x: number; y: number; h?: number; value?: string; w?: number; } \| { [x: string]: any; format: string; type: &quot;pageNumber&quot;; x: number; y: number; font?: string; size?: number; } \| { type: &quot;pageBreak&quot;; })[]; margin: { bottom: number; left: number; right: number; top: number; }; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; size: &quot;a4&quot; \| &quot;a3&quot; \| &quot;a5&quot; \| &quot;letter&quot; \| &quot;legal&quot; \| &quot;tabloid&quot;; }</code> | The validated page payload. |

src: packages/backend/src/resources/pdf/elements.ts:136  
dist: packages/backend/dist/resources/pdf/elements.js:69
<a name="drawElement"></a>

## drawElement ⇒ <code>void</code>
Draws one element onto the page (image/table/field handled via the pre-embedded state).

**Kind**: global constant  
**Returns**: <code>void</code> - Nothing.  

| Param | Type | Description |
| --- | --- | --- |
| pdfDoc | <code>PDFDocument</code> | The document being built (needed for the AcroForm). |
| page | <code>PDFPage</code> | The target page. |
| element | <code>{ [x: string]: any; text: string; type: &quot;text&quot;; x: number; y: number; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; font?: string; size?: number; w?: number; } \| { [x: string]: any; h: number; type: &quot;rect&quot;; w: number; x: number; y: number; dash?: boolean; strokeWidth?: number; } \| { [x: string]: any; h: number; type: &quot;ellipse&quot;; w: number; x: number; y: number; strokeWidth?: number; } \| { [x: string]: any; type: &quot;line&quot;; x1: number; x2: number; y1: number; y2: number; dash?: boolean; thickness?: number; } \| { data: string; h: number; imageType: &quot;png&quot; \| &quot;jpg&quot;; type: &quot;image&quot;; w: number; x: number; y: number; opacity?: number; } \| { rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; } \| { [x: string]: any; fieldType: &quot;text&quot; \| &quot;checkbox&quot;; type: &quot;field&quot;; x: number; y: number; h?: number; value?: string; w?: number; } \| { [x: string]: any; format: string; type: &quot;pageNumber&quot;; x: number; y: number; font?: string; size?: number; }</code> | The validated element descriptor. |
| ctx | <code>BuilderContext</code> | The pre-embedded font state. |
| images | <code>Map&lt;object, PDFImage&gt;</code> | The pre-embedded images. |
| totalPages | <code>number</code> | Logical page count, for pageNumber elements. |
| pageNumber | <code>number</code> | 1-based number of this page, for pageNumber elements. |

src: packages/backend/src/resources/pdf/elements.ts:554  
dist: packages/backend/dist/resources/pdf/elements.js:306
<a name="collectFontNames"></a>

## collectFontNames ⇒ <code>string[]</code>
Fonts referenced by an element (embedded or standard name).

**Kind**: global constant  
**Returns**: <code>string[]</code> - The referenced font names.  

| Param | Type | Description |
| --- | --- | --- |
| element | <code>{ [x: string]: any; text: string; type: &quot;text&quot;; x: number; y: number; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; font?: string; size?: number; w?: number; } \| { [x: string]: any; h: number; type: &quot;rect&quot;; w: number; x: number; y: number; dash?: boolean; strokeWidth?: number; } \| { [x: string]: any; h: number; type: &quot;ellipse&quot;; w: number; x: number; y: number; strokeWidth?: number; } \| { [x: string]: any; type: &quot;line&quot;; x1: number; x2: number; y1: number; y2: number; dash?: boolean; thickness?: number; } \| { data: string; h: number; imageType: &quot;png&quot; \| &quot;jpg&quot;; type: &quot;image&quot;; w: number; x: number; y: number; opacity?: number; } \| { rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; } \| { [x: string]: any; fieldType: &quot;text&quot; \| &quot;checkbox&quot;; type: &quot;field&quot;; x: number; y: number; h?: number; value?: string; w?: number; } \| { [x: string]: any; format: string; type: &quot;pageNumber&quot;; x: number; y: number; font?: string; size?: number; }</code> | The element to inspect. |

src: packages/backend/src/resources/pdf/elements.ts:607  
dist: packages/backend/dist/resources/pdf/elements.js:339
<a name="segmentPages"></a>

## segmentPages ⇒ <code>{ elements: Array&lt;Exclude&lt;ElementType, { type: &quot;pageBreak&quot;; }&gt;&gt;; page: PdfPageType; }[]</code>
Splits each page's element list at `pageBreak` elements into physical page segments.

**Kind**: global constant  
**Returns**: <code>{ elements: Array&lt;Exclude&lt;ElementType, { type: &quot;pageBreak&quot;; }&gt;&gt;; page: PdfPageType; }[]</code> - The physical pages to draw, in order.  

| Param | Type | Description |
| --- | --- | --- |
| pages | <code>({ elements: ({ [x: string]: any; text: string; type: &quot;text&quot;; x: number; y: number; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; font?: string; size?: number; w?: number; } \| { [x: string]: any; h: number; type: &quot;rect&quot;; w: number; x: number; y: number; dash?: boolean; strokeWidth?: number; } \| { [x: string]: any; h: number; type: &quot;ellipse&quot;; w: number; x: number; y: number; strokeWidth?: number; } \| { [x: string]: any; type: &quot;line&quot;; x1: number; x2: number; y1: number; y2: number; dash?: boolean; thickness?: number; } \| { data: string; h: number; imageType: &quot;png&quot; \| &quot;jpg&quot;; type: &quot;image&quot;; w: number; x: number; y: number; opacity?: number; } \| { rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; } \| { [x: string]: any; fieldType: &quot;text&quot; \| &quot;checkbox&quot;; type: &quot;field&quot;; x: number; y: number; h?: number; value?: string; w?: number; } \| { [x: string]: any; format: string; type: &quot;pageNumber&quot;; x: number; y: number; font?: string; size?: number; } \| { type: &quot;pageBreak&quot;; })[]; margin: { bottom: number; left: number; right: number; top: number; }; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; size: &quot;a4&quot; \| &quot;a3&quot; \| &quot;a5&quot; \| &quot;letter&quot; \| &quot;legal&quot; \| &quot;tabloid&quot;; } &amp; { elements: ElementType[]; })[]</code> | The validated page payloads from the build request. |

src: packages/backend/src/resources/pdf/elements.ts:624  
dist: packages/backend/dist/resources/pdf/elements.js:348
<a name="resolveFont"></a>

## resolveFont(ctx, name) ⇒ <code>PDFFont</code>
Resolves a public font name to the pre-embedded font; missing names are a build error.

**Kind**: global function  
**Returns**: <code>PDFFont</code> - The embedded font.  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>BuilderContext</code> | The pre-embedded font state. |
| name | <code>string</code> | The public font name, or undefined for the default. |

src: packages/backend/src/resources/pdf/elements.ts:62  
dist: packages/backend/dist/resources/pdf/elements.js:29
<a name="isStandardWinAnsiFont"></a>

## isStandardWinAnsiFont(ctx, name) ⇒ <code>boolean</code>
Whether the named font is a WinAnsi standard font (not Symbol/ZapfDingbats, not embedded).

**Kind**: global function  
**Returns**: <code>boolean</code> - True when the font is a WinAnsi standard font.  

| Param | Type | Description |
| --- | --- | --- |
| ctx | <code>BuilderContext</code> | The pre-embedded font state. |
| name | <code>string</code> | The public font name. |

src: packages/backend/src/resources/pdf/elements.ts:85  
dist: packages/backend/dist/resources/pdf/elements.js:39
<a name="assertWinAnsiText"></a>

## assertWinAnsiText(text, where)
Throws 400 when any character is outside the WinAnsi encoding (standard fonts only).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | The text to check. |
| where | <code>string</code> | Where in the document the text lives. |

src: packages/backend/src/resources/pdf/elements.ts:93  
dist: packages/backend/dist/resources/pdf/elements.js:40
<a name="assertFontEncodes"></a>

## assertFontEncodes(font, fontName, text, where)
Belt-and-braces: any standard font rejects what its own encoding cannot carry.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| font | <code>PDFFont</code> | The resolved font instance. |
| fontName | <code>string</code> | The public font name, for error messages. |
| text | <code>string</code> | The text to probe-encode. |
| where | <code>string</code> | Where in the document the text lives, for error messages. |

src: packages/backend/src/resources/pdf/elements.ts:110  
dist: packages/backend/dist/resources/pdf/elements.js:50
<a name="wrapParagraph"></a>

## wrapParagraph(text, font, size, maxWidth) ⇒ <code>string[]</code>
Word-greedy line breaking, respecting the given width at the given size.

**Kind**: global function  
**Returns**: <code>string[]</code> - The wrapped lines.  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | The text to wrap. |
| font | <code>PDFFont</code> | The font used for measuring. |
| size | <code>number</code> | Font size in points. |
| maxWidth | <code>number</code> | Maximum line width in points. |

src: packages/backend/src/resources/pdf/elements.ts:150  
dist: packages/backend/dist/resources/pdf/elements.js:74
<a name="wrapLines"></a>

## wrapLines(text, font, size, maxWidth) ⇒ <code>string[]</code>
Wraps text on newlines, then on words; empty paragraphs become blank lines.

**Kind**: global function  
**Returns**: <code>string[]</code> - The wrapped lines.  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>string</code> | The text to wrap. |
| font | <code>PDFFont</code> | The font used for measuring. |
| size | <code>number</code> | Font size in points. |
| maxWidth | <code>number</code> | Maximum line width in points. |

src: packages/backend/src/resources/pdf/elements.ts:175  
dist: packages/backend/dist/resources/pdf/elements.js:91
<a name="textOffset"></a>

## textOffset(align, lineWidth, boxWidth) ⇒ <code>number</code>
Horizontal offset for a line within a box.

**Kind**: global function  
**Returns**: <code>number</code> - The x offset in points from the box's left edge.  

| Param | Type | Description |
| --- | --- | --- |
| align | <code>Align</code> | Horizontal alignment mode. |
| lineWidth | <code>number</code> | Measured width of the line in points. |
| boxWidth | <code>number</code> | Box width in points. |

src: packages/backend/src/resources/pdf/elements.ts:195  
dist: packages/backend/dist/resources/pdf/elements.js:103
<a name="cellOf"></a>

## cellOf(cell) ⇒ <code>{ align: Align; colSpan: number; fill?: string; size: number; text: string; }</code>
Normalizes a table cell union (string or object) to the internal shape.

**Kind**: global function  
**Returns**: <code>{ align: Align; colSpan: number; fill?: string; size: number; text: string; }</code> - The normalized cell.  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; }</code> | The raw cell from the validated schema. |

src: packages/backend/src/resources/pdf/elements.ts:240  
dist: packages/backend/dist/resources/pdf/elements.js:131
<a name="cellFontOf"></a>

## cellFontOf(font, headerFont, isHeader) ⇒ <code>PDFFont</code>
Picks the header font for header rows, the body font otherwise.

**Kind**: global function  
**Returns**: <code>PDFFont</code> - The font to use for this cell.  

| Param | Type | Description |
| --- | --- | --- |
| font | <code>PDFFont</code> | The body font. |
| headerFont | <code>PDFFont</code> | The header font, for the header row. |
| isHeader | <code>boolean</code> | Whether this cell belongs to the header row. |

src: packages/backend/src/resources/pdf/elements.ts:254  
dist: packages/backend/dist/resources/pdf/elements.js:134
<a name="rowHeightOf"></a>

## rowHeightOf(row, colWidths, font, headerFont, isHeader) ⇒ <code>number</code>
Measures a table row's height from its tallest cell after wrapping.

**Kind**: global function  
**Returns**: <code>number</code> - The row height in points.  

| Param | Type | Description |
| --- | --- | --- |
| row | <code>{ align: Align; colSpan: number; fill?: string; size: number; text: string; }[]</code> | The normalized cells in the row. |
| colWidths | <code>number[]</code> | The resolved column widths in points. |
| font | <code>PDFFont</code> | The body font. |
| headerFont | <code>PDFFont</code> | The header font, for the header row. |
| isHeader | <code>boolean</code> | Whether this is the header row. |

src: packages/backend/src/resources/pdf/elements.ts:266  
dist: packages/backend/dist/resources/pdf/elements.js:135
<a name="paintCellText"></a>

## paintCellText(page, cell, cellX, cursorY, innerWidth, font, headerFont, isHeader)
Paints one cell's text lines, vertically top-aligned with padding.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>PDFPage</code> | The target page. |
| cell | <code>{ align: Align; colSpan: number; fill?: string; size: number; text: string; }</code> | The normalized cell. |
| cellX | <code>number</code> | The cell's left edge in points. |
| cursorY | <code>number</code> | The cell's top edge (distance from the page top) in points. |
| innerWidth | <code>number</code> | The text column width in points. |
| font | <code>PDFFont</code> | The body font. |
| headerFont | <code>PDFFont</code> | The header font for the header row. |
| isHeader | <code>boolean</code> | Whether this cell belongs to the header row. |

src: packages/backend/src/resources/pdf/elements.ts:298  
dist: packages/backend/dist/resources/pdf/elements.js:148
<a name="paintRow"></a>

## paintRow(page, row, colWidths, cursorY, rowHeight, startX, font, headerFont, isHeader, topToY)
Paints one row: cell backgrounds, borders and text.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| page | <code>PDFPage</code> | The target page. |
| row | <code>{ align: Align; colSpan: number; fill?: string; size: number; text: string; }[]</code> | The normalized cells in the row. |
| colWidths | <code>number[]</code> | The resolved column widths in points. |
| cursorY | <code>number</code> | The row's top edge (distance from the page top) in points. |
| rowHeight | <code>number</code> | The row height in points. |
| startX | <code>number</code> | The row's left edge in points. |
| font | <code>PDFFont</code> | The body font. |
| headerFont | <code>PDFFont</code> | The header font for the header row. |
| isHeader | <code>boolean</code> | Whether this is the header row. |
| topToY | <code>(y: number, h: number) &#x3D;&gt; number</code> | The y-from-top to pdf-lib y converter. |

src: packages/backend/src/resources/pdf/elements.ts:333  
dist: packages/backend/dist/resources/pdf/elements.js:160
<a name="assertTableEncodable"></a>

## assertTableEncodable(element, font)
Validates that every table cell text encodes with the table font (Helvetica WinAnsi).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| element | <code>{ rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; }</code> | The validated table element. |
| font | <code>PDFFont</code> | The table body font. |

src: packages/backend/src/resources/pdf/elements.ts:497  
dist: packages/backend/dist/resources/pdf/elements.js:271
<a name="exhaustiveNever"></a>

## exhaustiveNever(value) ⇒ <code>never</code>
Throws for an unrepresentable element; only reachable via a widened union.

**Kind**: global function  
**Throws**:

- <code>Error</code> Always.


| Param | Type | Description |
| --- | --- | --- |
| value | <code>never</code> | The element the check failed on. |

src: packages/backend/src/resources/pdf/elements.ts:598  
dist: packages/backend/dist/resources/pdf/elements.js:336
