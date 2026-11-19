## Constants

<dl>
<dt><a href="#SPREADSHEET_MIME">SPREADSHEET_MIME</a></dt>
<dd><p>The only OOXML spreadsheet mime accepted: macro-enabled and template files are rejected.</p>
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
<dt><a href="#findSheet">findSheet(sheets, name)</a> ⇒ <code>XLSX.WorkSheet</code></dt>
<dd><p>Looks up a worksheet by exact name without prototype-index access.</p>
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

<a name="SPREADSHEET_MIME"></a>

## SPREADSHEET\_MIME
The only OOXML spreadsheet mime accepted: macro-enabled and template files are rejected.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:19  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:18
<a name="XLSX_TOTAL_UNCOMPRESSED"></a>

## XLSX\_TOTAL\_UNCOMPRESSED
Total uncompressed byte ceiling for xlsx archives; ~3.5x tighter than the shared cap.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:35  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:25
<a name="UNSAFE_FORMULA"></a>

## UNSAFE\_FORMULA
Formulas with DDE or remote-execution payloads are refused; ordinary functions pass through.
Anchored at ^ with optional leading whitespace; `!cmd|...` style payloads are also refused.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:108  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:66
<a name="assertXlsxSignature"></a>

## assertXlsxSignature(buffer) ⇒ <code>Promise&lt;void&gt;</code>
The scanner sees declared content types only; verify the bytes too.
The signature must be the plain spreadsheet OOXML mime, so renamed images and .xlsm are rejected.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer&lt;ArrayBufferLike&gt;</code> | The buffered upload. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:27  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:19
<a name="countCells"></a>

## countCells(parts) ⇒ <code>number</code>
Counts <c> cell tags across worksheets; a cheap pre-parse bomb guard (no XML decoding).

**Kind**: global function  
**Returns**: <code>number</code> - The total number of cell tags found.  

| Param | Type | Description |
| --- | --- | --- |
| parts | <code>Map&lt;string, Buffer&lt;ArrayBufferLike&gt;&gt;</code> | The validated OOXML parts (worksheet parts only are scanned). |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:42  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:26
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
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:36
<a name="toBadRequest"></a>

## toBadRequest(error) ⇒ <code>BadRequestException</code>
Maps a SheetJS failure to a 400.

**Kind**: global function  
**Returns**: <code>BadRequestException</code> - A 400 exception carrying the message.  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>unknown</code> | The error thrown by SheetJS. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:98  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:62
<a name="assertSafeCells"></a>

## assertSafeCells(sheets)
Walks every cell once and rejects unsafe formulas.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| sheets | <code>{ [x: string]: any; rows: (Record&lt;string, string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; }&gt; \| (string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; })[])[]; cellDates?: boolean; cols?: { [x: string]: unknown; hidden?: boolean; level?: number; wch?: number; width?: number; wpx?: number; }[]; columns?: string[]; merges?: any[]; sheetVisibility?: 0 \| 1 \| 2; }[]</code> | The validated sheet descriptors. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:119  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:72
<a name="assertSafeFormula"></a>

## assertSafeFormula(f)
Rejects a formula string with a code-execution vector.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| f | <code>string</code> | The formula, without a leading equals sign. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:133  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:81
<a name="assertSafeCell"></a>

## assertSafeCell(cell)
Rejects cell objects whose formula opens a code-execution vector on file open.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| cell | <code>unknown</code> | One candidate cell (passed through by the build payload). |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:154  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:97
<a name="findSheet"></a>

## findSheet(sheets, name) ⇒ <code>XLSX.WorkSheet</code>
Looks up a worksheet by exact name without prototype-index access.

**Kind**: global function  
**Returns**: <code>XLSX.WorkSheet</code> - The worksheet, or undefined when absent.  

| Param | Type | Description |
| --- | --- | --- |
| sheets | <code>Record&lt;string, XLSX.WorkSheet&gt;</code> | The workbook's worksheet map. |
| name | <code>string</code> | Exact sheet name to find. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:166  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:104
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

src: packages/backend/src/resources/xlsx/xlsx.service.ts:179  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:105
<a name="buildSheet"></a>

## buildSheet(sheet) ⇒ <code>XLSX.WorkSheet</code>
Builds one worksheet from the payload's sheet options.

**Kind**: global function  
**Returns**: <code>XLSX.WorkSheet</code> - The populated SheetJS worksheet.  

| Param | Type | Description |
| --- | --- | --- |
| sheet | <code>{ [x: string]: any; rows: (Record&lt;string, string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; }&gt; \| (string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; })[])[]; cellDates?: boolean; cols?: { [x: string]: unknown; hidden?: boolean; level?: number; wch?: number; width?: number; wpx?: number; }[]; columns?: string[]; merges?: any[]; sheetVisibility?: 0 \| 1 \| 2; }</code> | The validated sheet descriptor. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:390  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:297
<a name="values2cells"></a>

## values2cells(row, columns) ⇒ <code>Record&lt;string, unknown&gt;</code>
Strips prototype-polluting keys from object rows (json_to_sheet does not).

**Kind**: global function  
**Returns**: <code>Record&lt;string, unknown&gt;</code> - A clean row object safe for json_to_sheet.  

| Param | Type | Description |
| --- | --- | --- |
| row | <code>Record&lt;string, unknown&gt;</code> | The raw object row. |
| columns | <code>string[]</code> | Optional column-order lock; keys not listed are dropped. |

src: packages/backend/src/resources/xlsx/xlsx.service.ts:422  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:326
<a name="emptyTypes"></a>

## emptyTypes() ⇒ <code>Map&lt;string, number&gt;</code>
Zeroed per-type census for a sheet.

**Kind**: global function  
**Returns**: <code>Map&lt;string, number&gt;</code> - A zeroed map from SheetJS cell type tag to count.  
src: packages/backend/src/resources/xlsx/xlsx.service.ts:442  
dist: packages/backend/dist/resources/xlsx/xlsx.service.js:338
