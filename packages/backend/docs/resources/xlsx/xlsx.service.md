## Members

<dl>
<dt><a href="#XlsxService">XlsxService</a></dt>
<dd><p>XLSX feature service: builds workbooks and parses/metadata-inspects uploads.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#MAX_RECORDS">MAX_RECORDS</a></dt>
<dd><p>Maximum number of row records <code>/xlsx/extract</code> returns (defense-in-depth with the maxCells census).</p>
</dd>
<dt><a href="#XLSX_TOTAL_UNCOMPRESSED">XLSX_TOTAL_UNCOMPRESSED</a></dt>
<dd><p>Total uncompressed byte ceiling for xlsx archives; ~3.5x tighter than the shared cap.</p>
</dd>
<dt><a href="#UNSAFE_FORMULA">UNSAFE_FORMULA</a></dt>
<dd><p>Formulas with DDE or remote-execution payloads are refused; ordinary functions pass through.
Anchored at ^ with optional leading whitespace; <code>!cmd|...</code> style payloads are also refused.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#assertXlsxSignature">assertXlsxSignature(buffer)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>The scanner sees declared content types only; verify the bytes too.
The signature must be the plain spreadsheet OOXML mime, so renamed images and .xlsm are rejected.</p>
</dd>
<dt><a href="#countCells">countCells(parts)</a> ⇒ <code>number</code></dt>
<dd><p>Counts <c> cell tags across worksheets; a cheap pre-parse bomb guard (no XML decoding).</p>
</dd>
<dt><a href="#readBody">readBody(cls, maxCells)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Reads the uploaded workbook into memory, bounded by the scanner cap.
The scanner only opens the source when ClamAV is enabled, so the service must too.
Applies the OOXML zip-bomb caps and a worksheet cell ceiling before SheetJS sees a byte.</p>
</dd>
<dt><a href="#toBadRequest">toBadRequest(error)</a> ⇒ <code>BadRequestException</code></dt>
<dd><p>Maps a SheetJS failure to a 400.</p>
</dd>
<dt><a href="#assertSafeCells">assertSafeCells(sheets)</a></dt>
<dd><p>Walks every cell once and rejects unsafe formulas.</p>
</dd>
<dt><a href="#assertSafeFormula">assertSafeFormula(f)</a></dt>
<dd><p>Rejects a formula string with a code-execution vector.</p>
</dd>
<dt><a href="#assertSafeCell">assertSafeCell(cell)</a></dt>
<dd><p>Rejects cell objects whose formula opens a code-execution vector on file open.</p>
</dd>
<dt><a href="#findSheet">findSheet(sheets)</a> ⇒ <code>(name: string) &#x3D;&gt; undefined | XLSX.WorkSheet</code></dt>
<dd><p>Builds an exact-name worksheet lookup without prototype-index access.
One pass over the sheets map; the returned lookup is O(1).</p>
</dd>
<dt><a href="#sheetIndex">sheetIndex(names, sheet)</a> ⇒ <code>number</code></dt>
<dd><p>Finds the sheet index by name or number; throws 400 when absent.
Exact names win over numeric indices, so a sheet called &quot;2024&quot; is addressable by name.</p>
</dd>
<dt><a href="#buildSheet">buildSheet(sheet)</a> ⇒ <code>XLSX.WorkSheet</code></dt>
<dd><p>Builds one worksheet from the payload&#39;s sheet options.</p>
</dd>
<dt><a href="#values2cells">values2cells(row, columns)</a> ⇒ <code>Record&lt;string, unknown&gt;</code></dt>
<dd><p>Strips prototype-polluting keys from object rows (json_to_sheet does not).</p>
</dd>
<dt><a href="#emptyTypes">emptyTypes()</a> ⇒ <code>Map&lt;string, number&gt;</code></dt>
<dd><p>Zeroed per-type census for a sheet.</p>
</dd>
</dl>

<a name="XlsxService"></a>

## XlsxService
XLSX feature service: builds workbooks and parses/metadata-inspects uploads.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:204  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:133

* [XlsxService](#XlsxService)
    * [.build(body)](#XlsxService+build) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
    * [.extract(query)](#XlsxService+extract) ⇒ <code>Promise&lt;{ records: unknown[]; sheet: string; truncated: boolean; } \| { records: unknown[]; sheet: string; truncated?: undefined; }&gt;</code>
    * [.metadata(query)](#XlsxService+metadata) ⇒ <code>Promise&lt;{ custprops: object; definedNames: { name: string; ref: string; sheet: number; }[]; props: XLSX.FullProperties; sheets: { autofilter: boolean; cells: number; cols: number; formulas: number; hidden: boolean; merges: number; name: string; ref: string; rows: number; types: { [k: string]: number; }; }[]; totalCells: number; }&gt;</code>

<a name="XlsxService+build"></a>

### xlsxService.build(body) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Builds a workbook from the payload and returns the .xlsx bytes.
Cell objects pass through to SheetJS (formulas, number formats, links, comments).
Styles, images, charts and panes are SheetJS Pro-only and not supported.

**Kind**: instance method of [<code>XlsxService</code>](#XlsxService)  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The workbook bytes.  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>{ sheets: { [x: string]: any; rows: (Record&lt;string, string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; }&gt; \| (string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; })[])[]; cellDates?: boolean; cols?: { [x: string]: unknown; hidden?: boolean; level?: number; wch?: number; width?: number; wpx?: number; }[]; columns?: string[]; merges?: any[]; sheetVisibility?: 0 \| 1 \| 2; }[]; workbook?: { [x: string]: unknown; Names?: { [x: string]: unknown; Name: string; Ref: string; Sheet?: number; }[]; Props?: { [x: string]: unknown; Author?: string; Category?: string; Comments?: string; Company?: string; CreatedDate?: Date; Keywords?: string; Manager?: string; ModifiedBy?: string; ModifiedDate?: Date; Subject?: string; Title?: string; }; WBProps?: { [x: string]: unknown; CodeName?: string; date1904?: boolean; filterPrivacy?: boolean; }; }; }</code> | Validated build payload. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:214  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:138
<a name="XlsxService+extract"></a>

### xlsxService.extract(query) ⇒ <code>Promise&lt;{ records: unknown[]; sheet: string; truncated: boolean; } \| { records: unknown[]; sheet: string; truncated?: undefined; }&gt;</code>
Extracts one sheet as typed JSON. Object rows need a header: pass
`header=1` (AOA) for raw rows, `header=A` for column letters, or a
comma-separated header list; omit `header` to use the first row as keys.

**Kind**: instance method of [<code>XlsxService</code>](#XlsxService)  
**Returns**: <code>Promise&lt;{ records: unknown[]; sheet: string; truncated: boolean; } \| { records: unknown[]; sheet: string; truncated?: undefined; }&gt;</code> - The sheet name plus the records.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; maxCells: number; raw: boolean; blankrows?: boolean; skipHidden?: boolean; }</code> | Validated flat reader options. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:262  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:178
<a name="XlsxService+metadata"></a>

### xlsxService.metadata(query) ⇒ <code>Promise&lt;{ custprops: object; definedNames: { name: string; ref: string; sheet: number; }[]; props: XLSX.FullProperties; sheets: { autofilter: boolean; cells: number; cols: number; formulas: number; hidden: boolean; merges: number; name: string; ref: string; rows: number; types: { [k: string]: number; }; }[]; totalCells: number; }&gt;</code>
Structural metadata for an uploaded workbook: dims, counts, props, names,
formula inventory and a per-type cell census, capped at `maxCells`.

**Kind**: instance method of [<code>XlsxService</code>](#XlsxService)  
**Returns**: <code>Promise&lt;{ custprops: object; definedNames: { name: string; ref: string; sheet: number; }[]; props: XLSX.FullProperties; sheets: { autofilter: boolean; cells: number; cols: number; formulas: number; hidden: boolean; merges: number; name: string; ref: string; rows: number; types: { [k: string]: number; }; }[]; totalCells: number; }&gt;</code> - The metadata document.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ maxCells: number; }</code> | Validated flat metadata options. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:320  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:230
<a name="MAX_RECORDS"></a>

## MAX\_RECORDS
Maximum number of row records `/xlsx/extract` returns (defense-in-depth with the maxCells census).

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:20  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:20
<a name="XLSX_TOTAL_UNCOMPRESSED"></a>

## XLSX\_TOTAL\_UNCOMPRESSED
Total uncompressed byte ceiling for xlsx archives; ~3.5x tighter than the shared cap.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:35  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:27
<a name="UNSAFE_FORMULA"></a>

## UNSAFE\_FORMULA
Formulas with DDE or remote-execution payloads are refused; ordinary functions pass through.
Anchored at ^ with optional leading whitespace; `!cmd|...` style payloads are also refused.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:108  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:68
<a name="assertXlsxSignature"></a>

## assertXlsxSignature(buffer) ⇒ <code>Promise&lt;void&gt;</code>
The scanner sees declared content types only; verify the bytes too.
The signature must be the plain spreadsheet OOXML mime, so renamed images and .xlsm are rejected.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:27  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:21
<a name="countCells"></a>

## countCells(parts) ⇒ <code>number</code>
Counts <c> cell tags across worksheets; a cheap pre-parse bomb guard (no XML decoding).

**Kind**: global function  
**Returns**: <code>number</code> - The total number of cell tags found.  

| Param | Type | Description |
| --- | --- | --- |
| parts | <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code> | The validated OOXML parts (worksheet parts only are scanned). |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:42  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:28
<a name="readBody"></a>

## readBody(cls, maxCells) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Reads the uploaded workbook into memory, bounded by the scanner cap.
The scanner only opens the source when ClamAV is enabled, so the service must too.
Applies the OOXML zip-bomb caps and a worksheet cell ceiling before SheetJS sees a byte.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The workbook bytes, capped.  
**Throws**:

- <code>UnsupportedMediaTypeException</code> For over-broad mimes or wrong signatures.
- <code>BadRequestException</code> For zip structures exceeding the OOXML caps.
- <code>PayloadTooLargeException</code> For archives with too many cells.


| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context (source stream accessors). |
| maxCells | <code>number</code> | Reject archives whose worksheets carry more cells than this. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:63  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:38
<a name="toBadRequest"></a>

## toBadRequest(error) ⇒ <code>BadRequestException</code>
Maps a SheetJS failure to a 400.

**Kind**: global function  
**Returns**: <code>BadRequestException</code> - A 400 exception carrying the message.  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>unknown</code> | The error thrown by SheetJS. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:98  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:64
<a name="assertSafeCells"></a>

## assertSafeCells(sheets)
Walks every cell once and rejects unsafe formulas.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| sheets | <code>{ [x: string]: any; rows: (Record&lt;string, string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; }&gt; \| (string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; })[])[]; cellDates?: boolean; cols?: { [x: string]: unknown; hidden?: boolean; level?: number; wch?: number; width?: number; wpx?: number; }[]; columns?: string[]; merges?: any[]; sheetVisibility?: 0 \| 1 \| 2; }[]</code> | The validated sheet descriptors. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:120  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:74
<a name="assertSafeFormula"></a>

## assertSafeFormula(f)
Rejects a formula string with a code-execution vector.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| f | <code>string</code> | The formula, without a leading equals sign. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:134  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:83
<a name="assertSafeCell"></a>

## assertSafeCell(cell)
Rejects cell objects whose formula opens a code-execution vector on file open.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>unknown</code> | One candidate cell (passed through by the build payload). |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:155  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:99
<a name="findSheet"></a>

## findSheet(sheets) ⇒ <code>(name: string) &#x3D;&gt; undefined \| XLSX.WorkSheet</code>
Builds an exact-name worksheet lookup without prototype-index access.
One pass over the sheets map; the returned lookup is O(1).

**Kind**: global function  
**Returns**: <code>(name: string) &#x3D;&gt; undefined \| XLSX.WorkSheet</code> - A name-keyed worksheet lookup.  

| Param | Type | Description |
| --- | --- | --- |
| sheets | <code>Record&lt;string, XLSX.WorkSheet&gt;</code> | The workbook's worksheet map. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:167  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:106
<a name="sheetIndex"></a>

## sheetIndex(names, sheet) ⇒ <code>number</code>
Finds the sheet index by name or number; throws 400 when absent.
Exact names win over numeric indices, so a sheet called "2024" is addressable by name.

**Kind**: global function  
**Returns**: <code>number</code> - The resolved index.  

| Param | Type | Description |
| --- | --- | --- |
| names | <code>string[]</code> | The workbook's ordered sheet names. |
| sheet | <code>string</code> | Name or 0-based index; undefined means the first sheet. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:182  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:112
<a name="buildSheet"></a>

## buildSheet(sheet) ⇒ <code>XLSX.WorkSheet</code>
Builds one worksheet from the payload's sheet options.

**Kind**: global function  
**Returns**: <code>XLSX.WorkSheet</code> - The populated SheetJS worksheet.  

| Param | Type | Description |
| --- | --- | --- |
| sheet | <code>{ [x: string]: any; rows: (Record&lt;string, string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; }&gt; \| (string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; })[])[]; cellDates?: boolean; cols?: { [x: string]: unknown; hidden?: boolean; level?: number; wch?: number; width?: number; wpx?: number; }[]; columns?: string[]; merges?: any[]; sheetVisibility?: 0 \| 1 \| 2; }</code> | The validated sheet descriptor. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:401  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:309
<a name="values2cells"></a>

## values2cells(row, columns) ⇒ <code>Record&lt;string, unknown&gt;</code>
Strips prototype-polluting keys from object rows (json_to_sheet does not).

**Kind**: global function  
**Returns**: <code>Record&lt;string, unknown&gt;</code> - A clean row object safe for json_to_sheet.  

| Param | Type | Description |
| --- | --- | --- |
| row | <code>Record&lt;string, unknown&gt;</code> | The raw object row. |
| columns | <code>string[]</code> | Optional column-order lock; keys not listed are dropped. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:433  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:338
<a name="emptyTypes"></a>

## emptyTypes() ⇒ <code>Map&lt;string, number&gt;</code>
Zeroed per-type census for a sheet.

**Kind**: global function  
**Returns**: <code>Map&lt;string, number&gt;</code> - A zeroed map from SheetJS cell type tag to count.  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:453  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:350
