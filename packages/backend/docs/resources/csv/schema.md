## Members

<dl>
<dt><a href="#options">options</a></dt>
<dd><p>csv-stringify options (names kept as in the library). <code>escape_formulas</code> defaults to true.</p>
</dd>
<dt><a href="#records">records</a></dt>
<dd><p>Rows to serialize; objects map keys to cells, arrays emit positional cells.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#CsvBuildSchema">CsvBuildSchema</a></dt>
<dd><p>JSON body for <code>POST /csv/build</code>: rows in, CSV bytes out.
Elements may be row objects or arrays of cell values.</p>
</dd>
<dt><a href="#csvParseOptions">csvParseOptions</a></dt>
<dd><p>csv-parse options shared by <code>/csv/extract</code> and <code>/csv/metadata</code> (function-valued options excluded).</p>
</dd>
<dt><a href="#CsvExtractSchema">CsvExtractSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /csv/extract</code>.
The raw CSV travels in the request body; everything here is csv-parse options.</p>
</dd>
<dt><a href="#CsvMetadataSchema">CsvMetadataSchema</a></dt>
<dd><p>Flat query parameters for <code>POST /csv/metadata</code>.
<code>maxRows</code> caps the per-cell type census; row and column counting always scans the whole file.</p>
</dd>
</dl>

<a name="options"></a>

## options
csv-stringify options (names kept as in the library). `escape_formulas` defaults to true.

**Kind**: global variable  
src: packages/backend/src/resources/csv/schema.ts:12  
dist: packages/backend/dist/resources/csv/schema.js:5
<a name="records"></a>

## records
Rows to serialize; objects map keys to cells, arrays emit positional cells.

**Kind**: global variable  
src: packages/backend/src/resources/csv/schema.ts:41  
dist: packages/backend/dist/resources/csv/schema.js:31
<a name="CsvBuildSchema"></a>

## CsvBuildSchema
JSON body for `POST /csv/build`: rows in, CSV bytes out.
Elements may be row objects or arrays of cell values.

**Kind**: global constant  
src: packages/backend/src/resources/csv/schema.ts:9  
dist: packages/backend/dist/resources/csv/schema.js:3
<a name="csvParseOptions"></a>

## csvParseOptions
csv-parse options shared by `/csv/extract` and `/csv/metadata` (function-valued options excluded).

**Kind**: global constant  
src: packages/backend/src/resources/csv/schema.ts:49  
dist: packages/backend/dist/resources/csv/schema.js:34
<a name="CsvExtractSchema"></a>

## CsvExtractSchema
Flat query parameters for `POST /csv/extract`.
The raw CSV travels in the request body; everything here is csv-parse options.

**Kind**: global constant  
src: packages/backend/src/resources/csv/schema.ts:94  
dist: packages/backend/dist/resources/csv/schema.js:74
<a name="CsvMetadataSchema"></a>

## CsvMetadataSchema
Flat query parameters for `POST /csv/metadata`.
`maxRows` caps the per-cell type census; row and column counting always scans the whole file.

**Kind**: global constant  
src: packages/backend/src/resources/csv/schema.ts:121  
dist: packages/backend/dist/resources/csv/schema.js:94
