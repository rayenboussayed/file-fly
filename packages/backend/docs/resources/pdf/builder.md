<a name="buildPdfDocument"></a>

## buildPdfDocument ⇒ <code>Promise&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code>
Builds the PDF document body as bytes. Pages are created up front so the
total logical page count (including `pageBreak` segments) is known before
any element is drawn. Fonts and images are embedded before drawing, so the
draw pass is fully synchronous.

Coordinate convention: every `y` is a distance from the page's top edge,
in points (1 pt = 1/72 inch). For `text` and `pageNumber`, `y` is the distance
to the top of the first text line's em box; the baseline is at
`pageHeight - y - size` and every line advances by `size * 1.2`. Lines, rects,
ellipses, images, fields and tables take `y` as the distance to the element's
top edge; `line` endpoints are absolute distances from the top.

**Kind**: global constant  
**Returns**: <code>Promise&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code> - The .pdf bytes.  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>{ pages: { elements: ({ [x: string]: any; text: string; type: &quot;text&quot;; x: number; y: number; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; font?: string; size?: number; w?: number; } \| { [x: string]: any; h: number; type: &quot;rect&quot;; w: number; x: number; y: number; dash?: boolean; strokeWidth?: number; } \| { [x: string]: any; h: number; type: &quot;ellipse&quot;; w: number; x: number; y: number; strokeWidth?: number; } \| { [x: string]: any; type: &quot;line&quot;; x1: number; x2: number; y1: number; y2: number; dash?: boolean; thickness?: number; } \| { data: string; h: number; imageType: &quot;png&quot; \| &quot;jpg&quot;; type: &quot;image&quot;; w: number; x: number; y: number; opacity?: number; } \| { rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; } \| { [x: string]: any; fieldType: &quot;text&quot; \| &quot;checkbox&quot;; type: &quot;field&quot;; x: number; y: number; h?: number; value?: string; w?: number; } \| { [x: string]: any; format: string; type: &quot;pageNumber&quot;; x: number; y: number; font?: string; size?: number; } \| { type: &quot;pageBreak&quot;; })[]; margin: { bottom: number; left: number; right: number; top: number; }; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; size: &quot;a4&quot; \| &quot;a3&quot; \| &quot;a5&quot; \| &quot;letter&quot; \| &quot;legal&quot; \| &quot;tabloid&quot;; }[]; embeddedFonts?: { [x: string]: any; data: string; }[]; metadata?: { author?: string; creationDate?: string; creator?: string; keywords?: string \| string[]; language?: string; subject?: string; title?: string; }; }</code> | Validated build payload. |

src: packages/backend/src/resources/pdf/builder.ts:127  
dist: packages/backend/dist/resources/pdf/builder.js:91
