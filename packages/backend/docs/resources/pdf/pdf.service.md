## Members

<dl>
<dt><a href="#PdfService">PdfService</a></dt>
<dd><p>PDF feature service: builds documents, extracts text and reads metadata.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#MAX_EXTRACT_PAGES">MAX_EXTRACT_PAGES</a></dt>
<dd><p>Ceiling on extracted pages; plenty for legitimate decks, stops crafted fan-outs.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#readBody">readBody(cls)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Opens the uploaded body, bounded by the scanner cap.
The scanner only opens the source when ClamAV is enabled, so the service must too.</p>
</dd>
<dt><a href="#assertPdfSignature">assertPdfSignature(buffer)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Signature must be %PDF; closes the renamed-image and non-PDF holes.</p>
</dd>
<dt><a href="#isoOrString">isoOrString(value)</a> ⇒ <code>string</code></dt>
<dd><p>Normalizes pdf.js info dates to ISO strings (Date objects pass through toISOString).</p>
</dd>
</dl>

<a name="PdfService"></a>

## PdfService
PDF feature service: builds documents, extracts text and reads metadata.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/pdf.service.ts:101  
dist: packages/backend/dist/resources/pdf/pdf.service.js:81

* [PdfService](#PdfService)
    * [.build(body)](#PdfService+build) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
    * [.extract()](#PdfService+extract) ⇒ <code>Promise&lt;{ format: string; metadata: { author: string; creationDate: string; creator: string; keywords: string; modificationDate: string; producer: string; subject: string; title: string; }; pageCount: number; structure: { pages: { page: number; text: string; }[]; }; text: string; }&gt;</code>
    * [.metadata()](#PdfService+metadata) ⇒ <code>Promise&lt;{ author: string; creationDate: string; creator: string; encrypted: boolean; keywords: string; modificationDate: string; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; pageCount: number; pageSize: { height: number; width: number; }; producer: string; subject: string; title: string; format: string; }&gt;</code>

<a name="PdfService+build"></a>

### pdfService.build(body) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Builds a PDF from the payload in-process and returns the bytes.

**Kind**: instance method of [<code>PdfService</code>](#PdfService)  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The .pdf bytes.  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>{ pages: { elements: ({ [x: string]: any; text: string; type: &quot;text&quot;; x: number; y: number; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; font?: string; size?: number; w?: number; } \| { [x: string]: any; h: number; type: &quot;rect&quot;; w: number; x: number; y: number; dash?: boolean; strokeWidth?: number; } \| { [x: string]: any; h: number; type: &quot;ellipse&quot;; w: number; x: number; y: number; strokeWidth?: number; } \| { [x: string]: any; type: &quot;line&quot;; x1: number; x2: number; y1: number; y2: number; dash?: boolean; thickness?: number; } \| { data: string; h: number; imageType: &quot;png&quot; \| &quot;jpg&quot;; type: &quot;image&quot;; w: number; x: number; y: number; opacity?: number; } \| { rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; } \| { [x: string]: any; fieldType: &quot;text&quot; \| &quot;checkbox&quot;; type: &quot;field&quot;; x: number; y: number; h?: number; value?: string; w?: number; } \| { [x: string]: any; format: string; type: &quot;pageNumber&quot;; x: number; y: number; font?: string; size?: number; } \| { type: &quot;pageBreak&quot;; })[]; margin: { bottom: number; left: number; right: number; top: number; }; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; size: &quot;a4&quot; \| &quot;a3&quot; \| &quot;a5&quot; \| &quot;letter&quot; \| &quot;legal&quot; \| &quot;tabloid&quot;; }[]; embeddedFonts?: { [x: string]: any; data: string; }[]; metadata?: { author?: string; creationDate?: string; creator?: string; keywords?: string \| string[]; language?: string; subject?: string; title?: string; }; }</code> | Validated build payload. |

src: packages/backend/src/resources/pdf/pdf.service.ts:109  
dist: packages/backend/dist/resources/pdf/pdf.service.js:86
<a name="PdfService+extract"></a>

### pdfService.extract() ⇒ <code>Promise&lt;{ format: string; metadata: { author: string; creationDate: string; creator: string; keywords: string; modificationDate: string; producer: string; subject: string; title: string; }; pageCount: number; structure: { pages: { page: number; text: string; }[]; }; text: string; }&gt;</code>
Extracts text from an uploaded document, page by page.

**Kind**: instance method of [<code>PdfService</code>](#PdfService)  
**Returns**: <code>Promise&lt;{ format: string; metadata: { author: string; creationDate: string; creator: string; keywords: string; modificationDate: string; producer: string; subject: string; title: string; }; pageCount: number; structure: { pages: { page: number; text: string; }[]; }; text: string; }&gt;</code> - The parsed metadata plus per-page text.  
src: packages/backend/src/resources/pdf/pdf.service.ts:117  
dist: packages/backend/dist/resources/pdf/pdf.service.js:89
<a name="PdfService+metadata"></a>

### pdfService.metadata() ⇒ <code>Promise&lt;{ author: string; creationDate: string; creator: string; encrypted: boolean; keywords: string; modificationDate: string; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; pageCount: number; pageSize: { height: number; width: number; }; producer: string; subject: string; title: string; format: string; }&gt;</code>
Normalized PDF metadata for an uploaded document.

**Kind**: instance method of [<code>PdfService</code>](#PdfService)  
**Returns**: <code>Promise&lt;{ author: string; creationDate: string; creator: string; encrypted: boolean; keywords: string; modificationDate: string; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; pageCount: number; pageSize: { height: number; width: number; }; producer: string; subject: string; title: string; format: string; }&gt;</code> - Format plus the parsed properties.  
src: packages/backend/src/resources/pdf/pdf.service.ts:160  
dist: packages/backend/dist/resources/pdf/pdf.service.js:128
<a name="MAX_EXTRACT_PAGES"></a>

## MAX\_EXTRACT\_PAGES
Ceiling on extracted pages; plenty for legitimate decks, stops crafted fan-outs.

**Kind**: global constant  
src: packages/backend/src/resources/pdf/pdf.service.ts:87  
dist: packages/backend/dist/resources/pdf/pdf.service.js:75
<a name="readBody"></a>

## readBody(cls) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Opens the uploaded body, bounded by the scanner cap.
The scanner only opens the source when ClamAV is enabled, so the service must too.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The body bytes, capped.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context. |

src: packages/backend/src/resources/pdf/pdf.service.ts:25  
dist: packages/backend/dist/resources/pdf/pdf.service.js:21
<a name="assertPdfSignature"></a>

## assertPdfSignature(buffer) ⇒ <code>Promise&lt;void&gt;</code>
Signature must be %PDF; closes the renamed-image and non-PDF holes.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |

src: packages/backend/src/resources/pdf/pdf.service.ts:42  
dist: packages/backend/dist/resources/pdf/pdf.service.js:33
<a name="isoOrString"></a>

## isoOrString(value) ⇒ <code>string</code>
Normalizes pdf.js info dates to ISO strings (Date objects pass through toISOString).

**Kind**: global function  
**Returns**: <code>string</code> - The ISO string, or the stringified value for non-Date inputs.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string \| Date</code> | The raw info-dict date value. |

src: packages/backend/src/resources/pdf/pdf.service.ts:94  
dist: packages/backend/dist/resources/pdf/pdf.service.js:76
