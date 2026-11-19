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
src: packages/backend/src/resources/xlsx/schema.ts:30  
dist: packages/backend/dist/resources/xlsx/schema.js:24
<a name="cellDates"></a>

## cellDates
Write Date cells (type `d`) instead of numeric serials when true.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:36  
dist: packages/backend/dist/resources/xlsx/schema.js:25
<a name="cols"></a>

## cols
Column properties written to `!cols` (width wpx/wch, hidden, outline level).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:38  
dist: packages/backend/dist/resources/xlsx/schema.js:26
<a name="columns"></a>

## columns
Object rows only: lock the column order (default: first-appearance order).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:53  
dist: packages/backend/dist/resources/xlsx/schema.js:38
<a name="merges"></a>

## merges
Merge ranges, e.g. A1:C2.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:55  
dist: packages/backend/dist/resources/xlsx/schema.js:39
<a name="name"></a>

## name
Sheet name (1-31 chars, Excel charset); duplicates auto-uniquify. `date1904` workbooks are refused on write (SheetJS serializes 1904-flagged Date cells with the 1900 epoch).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:63  
dist: packages/backend/dist/resources/xlsx/schema.js:40
<a name="rows"></a>

## rows
Rows: objects map keys to cells; arrays emit positional cells. At least one row.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:72  
dist: packages/backend/dist/resources/xlsx/schema.js:45
<a name="sheetVisibility"></a>

## sheetVisibility
0 visible, 1 hidden, 2 very hidden.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:76  
dist: packages/backend/dist/resources/xlsx/schema.js:48
<a name="Names"></a>

## Names
Workbook-global defined names (`x` in expressions, scoped via `Sheet`).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:88  
dist: packages/backend/dist/resources/xlsx/schema.js:56
<a name="header"></a>

## header
1 = AOA rows, `A` = column-letter keys, or comma-separated custom headers.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:139  
dist: packages/backend/dist/resources/xlsx/schema.js:98
<a name="maxCells"></a>

## maxCells
Reject packages whose worksheets carry more cells than this; bounds parse cost.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:141  
dist: packages/backend/dist/resources/xlsx/schema.js:99
<a name="sheet"></a>

## sheet
Sheet name or 0-based index.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:144  
dist: packages/backend/dist/resources/xlsx/schema.js:101
<a name="maxCells"></a>

## maxCells
Reject archives whose cells exceed this count (checked before SheetJS parses).

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/schema.ts:152  
dist: packages/backend/dist/resources/xlsx/schema.js:105
<a name="cellSchema"></a>

## cellSchema
One cell in a build payload: primitive or a SheetJS `CellObject`.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:6  
dist: packages/backend/dist/resources/xlsx/schema.js:3
<a name="XlsxBuildSchema"></a>

## XlsxBuildSchema
Body of `POST /xlsx/build`.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:82  
dist: packages/backend/dist/resources/xlsx/schema.js:51
<a name="XlsxExtractSchema"></a>

## XlsxExtractSchema
Flat query parameters for `POST /xlsx/extract`.
The raw .xlsx travels in the body; everything here is a reader option.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:135  
dist: packages/backend/dist/resources/xlsx/schema.js:95
<a name="XlsxMetadataSchema"></a>

## XlsxMetadataSchema
Flat query parameters for `POST /xlsx/metadata`.

**Kind**: global constant  
src: packages/backend/src/resources/xlsx/schema.ts:150  
dist: packages/backend/dist/resources/xlsx/schema.js:104
