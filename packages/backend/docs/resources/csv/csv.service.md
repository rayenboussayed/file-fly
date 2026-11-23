## Classes

<dl>
<dt><a href="#RecordCapError">RecordCapError</a></dt>
<dd><p>Error thrown when a record cap is exceeded; maps to 413 at the boundary.</p>
</dd>
</dl>

## Members

<dl>
<dt><a href="#CsvService">CsvService</a></dt>
<dd><p>CSV feature service: builds CSV from rows and parses/metadata-inspects uploads.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#MAX_RECORDS">MAX_RECORDS</a></dt>
<dd><p>Hard cap on parsed records; beyond it the response would exhaust memory.</p>
</dd>
<dt><a href="#toBadRequest">toBadRequest</a> ⇒ <code>BadRequestException</code></dt>
<dd><p>Maps a csv-parse/csv-stringify failure to a 400 with the library&#39;s error code.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#readBody">readBody(cls)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Opens (idempotently) and reads the uploaded CSV body, bounded by the scanner cap.
The scanner opens the source only when ClamAV is enabled, so the service must too.
Only <code>text/csv</code> and <code>application/octet-stream</code> bodies are accepted.</p>
</dd>
<dt><a href="#kindOf">kindOf(value)</a> ⇒ <code>&quot;string&quot; | &quot;number&quot; | &quot;boolean&quot; | &quot;date&quot; | &quot;empty&quot;</code></dt>
<dd><p>Classifies a cast csv-parse value. <code>empty</code> covers null/undefined and empty strings;
exact <code>true</code>/<code>false</code> strings count as boolean (csv-parse does not cast them).</p>
</dd>
</dl>

<a name="RecordCapError"></a>

## RecordCapError
Error thrown when a record cap is exceeded; maps to 413 at the boundary.

**Kind**: global class  
src: packages/backend/src/resources/csv/csv.service.ts:25  
dist: packages/backend/dist/resources/csv/csv.service.js:20
<a name="CsvService"></a>

## CsvService
CSV feature service: builds CSV from rows and parses/metadata-inspects uploads.

**Kind**: global variable  
src: packages/backend/src/resources/csv/csv.service.ts:68  
dist: packages/backend/dist/resources/csv/csv.service.js:44

* [CsvService](#CsvService)
    * [.buildCsv(body)](#CsvService+buildCsv) ⇒ <code>Readable</code>
    * [.extract(query)](#CsvService+extract) ⇒ <code>Promise&lt;{ records: unknown[]; }&gt;</code>
    * [.metadata(query)](#CsvService+metadata) ⇒ <code>Promise&lt;{ bom: boolean; columns: number; delimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; maxRows: number; perColumn: { index: number; types: Record&lt;&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;, number&gt;; }[]; recordDelimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; rows: number; truncatedTypes: boolean; }&gt;</code>

<a name="CsvService+buildCsv"></a>

### csvService.buildCsv(body) ⇒ <code>Readable</code>
Builds the CSV response stream for `POST /csv/build`.
`escape_formulas` defaults to true: cells starting with `= + - @ TAB CR` are prefixed with `'`.

**Kind**: instance method of [<code>CsvService</code>](#CsvService)  
**Returns**: <code>Readable</code> - The readable CSV byte stream (201 by POST convention).  

| Param | Type | Description |
| --- | --- | --- |
| body | <code>{ records: (Record&lt;string, unknown&gt; \| unknown[])[]; options?: { [x: string]: any; bom?: boolean; columns?: (string \| { key: string; header?: string; })[]; eof?: boolean; escape?: string; escape\_formulas?: boolean; header?: boolean; header\_as\_comment?: boolean; quote?: string \| false; quote\_record\_delimiter?: boolean; quoted?: boolean; quoted\_empty?: boolean; quoted\_string?: boolean; }; }</code> | Validated build payload (rows plus csv-stringify options). |

src: packages/backend/src/resources/csv/csv.service.ts:77  
dist: packages/backend/dist/resources/csv/csv.service.js:49
<a name="CsvService+extract"></a>

### csvService.extract(query) ⇒ <code>Promise&lt;{ records: unknown[]; }&gt;</code>
Parses the uploaded CSV into typed JSON records.
Function-valued csv-parse options are not exposed over HTTP. At most
[MAX_RECORDS](#MAX_RECORDS) records are materialized; larger files answer 413.
The first record is treated as data (no header semantics here).

**Kind**: instance method of [<code>CsvService</code>](#CsvService)  
**Returns**: <code>Promise&lt;{ records: unknown[]; }&gt;</code> - The parsed records.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; bom?: boolean; cast?: boolean; cast\_date?: boolean; columns?: boolean \| string[] \| any[]; comment?: string; comment\_no\_infix?: boolean; delimiter\_auto?: boolean; encoding?: &quot;ascii&quot; \| &quot;utf8&quot; \| &quot;utf16le&quot; \| &quot;ucs2&quot; \| &quot;base64&quot; \| &quot;latin1&quot; \| &quot;binary&quot; \| &quot;hex&quot;; escape?: string; from?: number; from\_line?: number; group\_columns\_by\_name?: boolean; ignore\_last\_delimiters?: boolean; ltrim?: boolean; max\_record\_size?: number; quote?: string \| false; relax\_column\_count?: boolean; relax\_column\_count\_less?: boolean; relax\_column\_count\_more?: boolean; relax\_quotes?: boolean; rtrim?: boolean; skip\_empty\_lines?: boolean; skip\_records\_with\_empty\_values?: boolean; skip\_records\_with\_error?: boolean; to?: number; to\_line?: number; trim?: boolean; }</code> | Validated, flat csv-parse options (file travels in the body). |

src: packages/backend/src/resources/csv/csv.service.ts:90  
dist: packages/backend/dist/resources/csv/csv.service.js:52
<a name="CsvService+metadata"></a>

### csvService.metadata(query) ⇒ <code>Promise&lt;{ bom: boolean; columns: number; delimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; maxRows: number; perColumn: { index: number; types: Record&lt;&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;, number&gt;; }[]; recordDelimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; rows: number; truncatedTypes: boolean; }&gt;</code>
Computes structural metadata for an uploaded CSV. One streaming pass.
`maxRows` limits the per-column type census; row/column counting always scans everything.
The first record counts as a data row (header or not). `delimiter_auto`
defaults on unless `delimiter` is given; the reported delimiter is the
supplied value, or `auto` when none was (csv-parse does not hand the
winning value back).

**Kind**: instance method of [<code>CsvService</code>](#CsvService)  
**Returns**: <code>Promise&lt;{ bom: boolean; columns: number; delimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; maxRows: number; perColumn: { index: number; types: Record&lt;&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;, number&gt;; }[]; recordDelimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; rows: number; truncatedTypes: boolean; }&gt;</code> - Rows, columns, delimiter handed over (`auto` unless given), and per-column type counts.  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; maxRows: number; trim?: boolean; bom?: boolean; escape?: string; quote?: string \| false; cast\_date?: boolean; comment?: string; comment\_no\_infix?: boolean; delimiter\_auto?: boolean; encoding?: &quot;ascii&quot; \| &quot;utf8&quot; \| &quot;utf16le&quot; \| &quot;ucs2&quot; \| &quot;base64&quot; \| &quot;latin1&quot; \| &quot;binary&quot; \| &quot;hex&quot;; max\_record\_size?: number; relax\_column\_count?: boolean; relax\_column\_count\_less?: boolean; relax\_column\_count\_more?: boolean; relax\_quotes?: boolean; skip\_empty\_lines?: boolean; }</code> | Validated, flat csv-parse options plus `maxRows`. |

src: packages/backend/src/resources/csv/csv.service.ts:118  
dist: packages/backend/dist/resources/csv/csv.service.js:70
<a name="MAX_RECORDS"></a>

## MAX\_RECORDS
Hard cap on parsed records; beyond it the response would exhaust memory.

**Kind**: global constant  
src: packages/backend/src/resources/csv/csv.service.ts:22  
dist: packages/backend/dist/resources/csv/csv.service.js:19
<a name="toBadRequest"></a>

## toBadRequest ⇒ <code>BadRequestException</code>
Maps a csv-parse/csv-stringify failure to a 400 with the library's error code.

**Kind**: global constant  
**Returns**: <code>BadRequestException</code> - A 400 exception carrying the library's code and message.  

| Param | Type | Description |
| --- | --- | --- |
| error | <code>unknown</code> | The library error (carries `code` and `message`). |

src: packages/backend/src/resources/csv/csv.service.ts:32  
dist: packages/backend/dist/resources/csv/csv.service.js:22
<a name="readBody"></a>

## readBody(cls) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Opens (idempotently) and reads the uploaded CSV body, bounded by the scanner cap.
The scanner opens the source only when ClamAV is enabled, so the service must too.
Only `text/csv` and `application/octet-stream` bodies are accepted.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The body bytes, capped.  
**Throws**:

- <code>UnsupportedMediaTypeException</code> For any other content type.


| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | The normalized request context (source stream accessors). |

src: packages/backend/src/resources/csv/csv.service.ts:52  
dist: packages/backend/dist/resources/csv/csv.service.js:32
<a name="kindOf"></a>

## kindOf(value) ⇒ <code>&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;</code>
Classifies a cast csv-parse value. `empty` covers null/undefined and empty strings;
exact `true`/`false` strings count as boolean (csv-parse does not cast them).

**Kind**: global function  
**Returns**: <code>&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;</code> - The census key for the value.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>unknown</code> | One cast field value. |

src: packages/backend/src/resources/csv/csv.service.ts:172  
dist: packages/backend/dist/resources/csv/csv.service.js:121
