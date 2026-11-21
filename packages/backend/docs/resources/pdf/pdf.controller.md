<a name="PdfController"></a>

## PdfController
PDF routes. `/pdf/build` consumes JSON and bypasses the media
interceptors by design (JSON bodies are never virus-scanned or signature-probed);
`/pdf/extract` and `/pdf/metadata` take the binary upload and are ClamAV-scanned.

**Kind**: global variable  
src: packages/backend/src/resources/pdf/pdf.controller.ts:28  
dist: packages/backend/dist/resources/pdf/pdf.controller.js:21

* [PdfController](#PdfController)
    * [.build(response, body)](#PdfController+build) ⇒ <code>Promise&lt;void&gt;</code>
    * [.extract(_query)](#PdfController+extract) ⇒ <code>Promise&lt;{ format: string; metadata: { author: string; creationDate: string; creator: string; keywords: string; modificationDate: string; producer: string; subject: string; title: string; }; pageCount: number; structure: { pages: { page: number; text: string; }[]; }; text: string; }&gt;</code>
    * [.metadata(_query)](#PdfController+metadata) ⇒ <code>Promise&lt;{ author: string; creationDate: string; creator: string; encrypted: boolean; keywords: string; modificationDate: string; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; pageCount: number; pageSize: { height: number; width: number; }; producer: string; subject: string; title: string; format: string; }&gt;</code>

<a name="PdfController+build"></a>

### pdfController.build(response, body) ⇒ <code>Promise&lt;void&gt;</code>
Builds a PDF from the JSON payload (201).

**Kind**: instance method of [<code>PdfController</code>](#PdfController)  
**Returns**: <code>Promise&lt;void&gt;</code> - The document bytes (201).  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Raw reply, streamed as application/pdf. |
| body | <code>{ pages: { elements: ({ [x: string]: any; text: string; type: &quot;text&quot;; x: number; y: number; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; font?: string; size?: number; w?: number; } \| { [x: string]: any; h: number; type: &quot;rect&quot;; w: number; x: number; y: number; dash?: boolean; strokeWidth?: number; } \| { [x: string]: any; h: number; type: &quot;ellipse&quot;; w: number; x: number; y: number; strokeWidth?: number; } \| { [x: string]: any; type: &quot;line&quot;; x1: number; x2: number; y1: number; y2: number; dash?: boolean; thickness?: number; } \| { data: string; h: number; imageType: &quot;png&quot; \| &quot;jpg&quot;; type: &quot;image&quot;; w: number; x: number; y: number; opacity?: number; } \| { rows: (string \| { [x: string]: any; text: string; align?: &quot;left&quot; \| &quot;center&quot; \| &quot;right&quot;; colSpan?: number; size?: number; })[][]; type: &quot;table&quot;; w: number; x: number; y: number; colWidths?: number[]; header?: boolean; } \| { [x: string]: any; fieldType: &quot;text&quot; \| &quot;checkbox&quot;; type: &quot;field&quot;; x: number; y: number; h?: number; value?: string; w?: number; } \| { [x: string]: any; format: string; type: &quot;pageNumber&quot;; x: number; y: number; font?: string; size?: number; } \| { type: &quot;pageBreak&quot;; })[]; margin: { bottom: number; left: number; right: number; top: number; }; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; size: &quot;a4&quot; \| &quot;a3&quot; \| &quot;a5&quot; \| &quot;letter&quot; \| &quot;legal&quot; \| &quot;tabloid&quot;; }[]; embeddedFonts?: { [x: string]: any; data: string; }[]; metadata?: { author?: string; creationDate?: string; creator?: string; keywords?: string \| string[]; language?: string; subject?: string; title?: string; }; }</code> | Pages, elements, embedded fonts and metadata. |

src: packages/backend/src/resources/pdf/pdf.controller.ts:41  
dist: packages/backend/dist/resources/pdf/pdf.controller.js:28
<a name="PdfController+extract"></a>

### pdfController.extract(_query) ⇒ <code>Promise&lt;{ format: string; metadata: { author: string; creationDate: string; creator: string; keywords: string; modificationDate: string; producer: string; subject: string; title: string; }; pageCount: number; structure: { pages: { page: number; text: string; }[]; }; text: string; }&gt;</code>
Extracts text page by page (201).

**Kind**: instance method of [<code>PdfController</code>](#PdfController)  
**Returns**: <code>Promise&lt;{ format: string; metadata: { author: string; creationDate: string; creator: string; keywords: string; modificationDate: string; producer: string; subject: string; title: string; }; pageCount: number; structure: { pages: { page: number; text: string; }[]; }; text: string; }&gt;</code> - The extracted metadata, page count and per-page text.  

| Param | Type | Description |
| --- | --- | --- |
| _query | <code>unknown</code> | Empty query object; junk parameters are rejected with 400. |

src: packages/backend/src/resources/pdf/pdf.controller.ts:60  
dist: packages/backend/dist/resources/pdf/pdf.controller.js:34
<a name="PdfController+metadata"></a>

### pdfController.metadata(_query) ⇒ <code>Promise&lt;{ author: string; creationDate: string; creator: string; encrypted: boolean; keywords: string; modificationDate: string; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; pageCount: number; pageSize: { height: number; width: number; }; producer: string; subject: string; title: string; format: string; }&gt;</code>
Normalized PDF metadata (201).

**Kind**: instance method of [<code>PdfController</code>](#PdfController)  
**Returns**: <code>Promise&lt;{ author: string; creationDate: string; creator: string; encrypted: boolean; keywords: string; modificationDate: string; orientation: &quot;portrait&quot; \| &quot;landscape&quot;; pageCount: number; pageSize: { height: number; width: number; }; producer: string; subject: string; title: string; format: string; }&gt;</code> - The metadata document.  

| Param | Type | Description |
| --- | --- | --- |
| _query | <code>unknown</code> | Empty query object; junk parameters are rejected with 400. |

src: packages/backend/src/resources/pdf/pdf.controller.ts:73  
dist: packages/backend/dist/resources/pdf/pdf.controller.js:37
