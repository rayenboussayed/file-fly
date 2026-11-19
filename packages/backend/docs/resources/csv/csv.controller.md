<a name="CsvController"></a>

## CsvController
CSV routes. Unlike the media modules this controller binds interceptors
per route: `/csv/build` consumes a JSON body (the media parser never sees it),
while `/csv/extract` and `/csv/metadata` take the binary upload and are
ClamAV-scanned like any other binary payload.

**Kind**: global variable  
src: packages/backend/src/resources/csv/csv.controller.ts:36  
dist: packages/backend/dist/resources/csv/csv.controller.js:20

* [CsvController](#CsvController)
    * [.build(response, body)](#CsvController+build) ⇒ <code>Promise&lt;void&gt;</code>
    * [.extract(query)](#CsvController+extract) ⇒ <code>Promise&lt;{ records: unknown[]; }&gt;</code>
    * [.metadata(query)](#CsvController+metadata) ⇒ <code>Promise&lt;{ bom: boolean; columns: number; delimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; maxRows: number; perColumn: { index: number; types: Record&lt;&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;, number&gt;; }[]; recordDelimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; rows: number; truncatedTypes: boolean; }&gt;</code>

<a name="CsvController+build"></a>

### csvController.build(response, body) ⇒ <code>Promise&lt;void&gt;</code>
Serializes JSON rows to CSV. POST-only: there is no meaningful GET shape.

**Kind**: instance method of [<code>CsvController</code>](#CsvController)  
**Returns**: <code>Promise&lt;void&gt;</code> - CSV bytes.  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Raw reply, streamed with `text/csv`. |
| body | <code>{ records: (Record&lt;string, unknown&gt; \| unknown[])[]; options?: { [x: string]: any; bom?: boolean; columns?: (string \| { key: string; header?: string; })[]; eof?: boolean; escape?: string; escape\_formulas?: boolean; header?: boolean; header\_as\_comment?: boolean; quote?: string \| false; quote\_record\_delimiter?: boolean; quoted?: boolean; quoted\_empty?: boolean; quoted\_string?: boolean; }; }</code> | Rows and csv-stringify options. |

src: packages/backend/src/resources/csv/csv.controller.ts:49  
dist: packages/backend/dist/resources/csv/csv.controller.js:27
<a name="CsvController+extract"></a>

### csvController.extract(query) ⇒ <code>Promise&lt;{ records: unknown[]; }&gt;</code>
Parses an uploaded CSV into typed JSON records.

**Kind**: instance method of [<code>CsvController</code>](#CsvController)  
**Returns**: <code>Promise&lt;{ records: unknown[]; }&gt;</code> - The parsed records (201).  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; bom?: boolean; cast?: boolean; cast\_date?: boolean; columns?: boolean \| string[] \| any[]; comment?: string; comment\_no\_infix?: boolean; delimiter\_auto?: boolean; encoding?: &quot;ascii&quot; \| &quot;utf8&quot; \| &quot;utf16le&quot; \| &quot;ucs2&quot; \| &quot;base64&quot; \| &quot;latin1&quot; \| &quot;binary&quot; \| &quot;hex&quot;; escape?: string; from?: number; from\_line?: number; group\_columns\_by\_name?: boolean; ignore\_last\_delimiters?: boolean; ltrim?: boolean; max\_record\_size?: number; quote?: string \| false; relax\_column\_count?: boolean; relax\_column\_count\_less?: boolean; relax\_column\_count\_more?: boolean; relax\_quotes?: boolean; rtrim?: boolean; skip\_empty\_lines?: boolean; skip\_records\_with\_empty\_values?: boolean; skip\_records\_with\_error?: boolean; to?: number; to\_line?: number; trim?: boolean; }</code> | Flat csv-parse options. |

src: packages/backend/src/resources/csv/csv.controller.ts:65  
dist: packages/backend/dist/resources/csv/csv.controller.js:32
<a name="CsvController+metadata"></a>

### csvController.metadata(query) ⇒ <code>Promise&lt;{ bom: boolean; columns: number; delimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; maxRows: number; perColumn: { index: number; types: Record&lt;&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;, number&gt;; }[]; recordDelimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; rows: number; truncatedTypes: boolean; }&gt;</code>
Structural CSV metadata: rows, columns, delimiter, per-column type census.

**Kind**: instance method of [<code>CsvController</code>](#CsvController)  
**Returns**: <code>Promise&lt;{ bom: boolean; columns: number; delimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; maxRows: number; perColumn: { index: number; types: Record&lt;&quot;string&quot; \| &quot;number&quot; \| &quot;boolean&quot; \| &quot;date&quot; \| &quot;empty&quot;, number&gt;; }[]; recordDelimiter: string \| string[] \| Buffer&lt;ArrayBufferLike&gt; \| Buffer&lt;ArrayBufferLike&gt;[]; rows: number; truncatedTypes: boolean; }&gt;</code> - The metadata document (201).  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; maxRows: number; trim?: boolean; bom?: boolean; escape?: string; quote?: string \| false; cast\_date?: boolean; comment?: string; comment\_no\_infix?: boolean; delimiter\_auto?: boolean; encoding?: &quot;ascii&quot; \| &quot;utf8&quot; \| &quot;utf16le&quot; \| &quot;ucs2&quot; \| &quot;base64&quot; \| &quot;latin1&quot; \| &quot;binary&quot; \| &quot;hex&quot;; max\_record\_size?: number; relax\_column\_count?: boolean; relax\_column\_count\_less?: boolean; relax\_column\_count\_more?: boolean; relax\_quotes?: boolean; skip\_empty\_lines?: boolean; }</code> | Flat csv-parse options plus `maxRows` for the type census. |

src: packages/backend/src/resources/csv/csv.controller.ts:78  
dist: packages/backend/dist/resources/csv/csv.controller.js:35
