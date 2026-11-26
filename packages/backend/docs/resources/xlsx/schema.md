## Members

<dl>
<dt><a href="#autofilter">autofilter</a></dt>
<dd><p>Auto filter range, e.g. A1:C10.</p>
</dd>
<dt><a href="#cellDates">cellDates</a></dt>
<dd><p>Write Date cells (type <code>d</code>) instead of numeric serials when true.</p>
</dd>
<dt><a href="#cols">cols</a></dt>
<dd><p>Column properties written to <code>!cols</code> (width wpx/wch, hidden, outline level).</p>
</dd>
<dt><a href="#columns">columns</a></dt>
<dd><p>Object rows only: lock the column order (default: first-appearance order).</p>
</dd>
<dt><a href="#merges">merges</a></dt>
<dd><p>Merge ranges, e.g. A1:C2.</p>
</dd>
<dt><a href="#name">name</a></dt>
<dd><p>Sheet name (1-31 chars, Excel charset); duplicates auto-uniquify. <code>date1904</code> workbooks are refused on write (SheetJS serializes 1904-flagged Date cells with the 1900 epoch).</p>
</dd>
<dt><a href="#rows">rows</a></dt>
<dd><p>Rows: objects map keys to cells; arrays emit positional cells. At least one row.</p>
</dd>
<dt><a href="#sheetVisibility">sheetVisibility</a></dt>
<dd><p>0 visible, 1 hidden, 2 very hidden.</p>
</dd>
<dt><a href="#Names">Names</a></dt>
<dd><p>Workbook-global defined names (<code>x</code> in expressions, scoped via <code>Sheet</code>).</p>
</dd>
<dt><a href="#header">header</a></dt>
<dd><p>1 = AOA rows, <code>A</code> = column-letter keys, or comma-separated custom headers.</p>
</dd>
<dt><a href="#maxCells">maxCells</a></dt>
<dd><p>Reject packages whose worksheets carry more cells than this; bounds parse cost.</p>
</dd>
<dt><a href="#sheet">sheet</a></dt>
<dd><p>Sheet name or 0-based index.</p>
</dd>
<dt><a href="#maxCells">maxCells</a></dt>
<dd><p>Reject archives whose cells exceed this count (checked before SheetJS parses).</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#SPREADSHEET_MIME">SPREADSHEET_MIME</a></dt>
<dd><p>Only the plain OOXML spreadsheet mime; templates, macros and other packages are rejected.</p>
</dd>
<dt><a href="#cellSchema">cellSchema</a></dt>
<dd><p>One cell in a build payload: primitive or a SheetJS <code>CellObject</code>.</p>
</dd>
<dt><a href="#XlsxBuildSchema">XlsxBuildSchema</a></dt>
<dd><p>Body of <code>POST /xlsx/build</code>.</p>
</dd>
<dt><a href="#XlsxExtractSchema">XlsxExtractSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /xlsx/extract</code>.
The raw .xlsx travels in the body; everything here is a reader option.</p>
</dd>
<dt><a href="#XlsxMetadataSchema">XlsxMetadataSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /xlsx/metadata</code>.</p>
</dd>
</dl>

<a name="autofilter"></a>

## autofilter
Auto filter range, e.g. A1:C10.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:65  
dist: packages/backend/dist/resources/xlsx/schema.js:39
<a name="cellDates"></a>

## cellDates
Write Date cells (type `d`) instead of numeric serials when true.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:69  
dist: packages/backend/dist/resources/xlsx/schema.js:40
<a name="cols"></a>

## cols
Column properties written to `!cols` (width wpx/wch, hidden, outline level).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:73  
dist: packages/backend/dist/resources/xlsx/schema.js:41
<a name="columns"></a>

## columns
Object rows only: lock the column order (default: first-appearance order).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:77  
dist: packages/backend/dist/resources/xlsx/schema.js:42
<a name="merges"></a>

## merges
Merge ranges, e.g. A1:C2.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:81  
dist: packages/backend/dist/resources/xlsx/schema.js:43
<a name="name"></a>

## name
Sheet name (1-31 chars, Excel charset); duplicates auto-uniquify. `date1904` workbooks are refused on write (SheetJS serializes 1904-flagged Date cells with the 1900 epoch).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:85  
dist: packages/backend/dist/resources/xlsx/schema.js:44
<a name="rows"></a>

## rows
Rows: objects map keys to cells; arrays emit positional cells. At least one row.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:96  
dist: packages/backend/dist/resources/xlsx/schema.js:49
<a name="sheetVisibility"></a>

## sheetVisibility
0 visible, 1 hidden, 2 very hidden.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:100  
dist: packages/backend/dist/resources/xlsx/schema.js:50
<a name="Names"></a>

## Names
Workbook-global defined names (`x` in expressions, scoped via `Sheet`).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:151  
dist: packages/backend/dist/resources/xlsx/schema.js:87
<a name="header"></a>

## header
1 = AOA rows, `A` = column-letter keys, or comma-separated custom headers.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:174  
dist: packages/backend/dist/resources/xlsx/schema.js:98
<a name="maxCells"></a>

## maxCells
Reject packages whose worksheets carry more cells than this; bounds parse cost.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:178  
dist: packages/backend/dist/resources/xlsx/schema.js:99
<a name="sheet"></a>

## sheet
Sheet name or 0-based index.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:183  
dist: packages/backend/dist/resources/xlsx/schema.js:101
<a name="maxCells"></a>

## maxCells
Reject archives whose cells exceed this count (checked before SheetJS parses).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:198  
dist: packages/backend/dist/resources/xlsx/schema.js:105
<a name="SPREADSHEET_MIME"></a>

## SPREADSHEET\_MIME
Only the plain OOXML spreadsheet mime; templates, macros and other packages are rejected.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:8  
dist: packages/backend/dist/resources/xlsx/schema.js:3
<a name="cellSchema"></a>

## cellSchema
One cell in a build payload: primitive or a SheetJS `CellObject`.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:23  
dist: packages/backend/dist/resources/xlsx/schema.js:9
<a name="XlsxBuildSchema"></a>

## XlsxBuildSchema
Body of `POST /xlsx/build`.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:143  
dist: packages/backend/dist/resources/xlsx/schema.js:82
<a name="XlsxExtractSchema"></a>

## XlsxExtractSchema
Flat query parameters for `POST /xlsx/extract`.
The raw .xlsx travels in the body; everything here is a reader option.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:168  
dist: packages/backend/dist/resources/xlsx/schema.js:95
<a name="XlsxMetadataSchema"></a>

## XlsxMetadataSchema
Flat query parameters for `POST /xlsx/metadata`.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:194  
dist: packages/backend/dist/resources/xlsx/schema.js:104
