<a name="XlsxController"></a>

## XlsxController
Spreadsheet routes. `/xlsx/build` consumes JSON (no media interceptors);
`/xlsx/extract` and `/xlsx/metadata` take the binary upload and are
ClamAV-scanned like any other binary payload.

**Kind**: global variable  
src: packages/backend/src/resources/xlsx/xlsx.controller.ts:36  
dist: packages/backend/dist/resources/xlsx/xlsx.controller.js:21

* [XlsxController](#XlsxController)
    * [.build(response, body)](#XlsxController+build) ⇒ <code>Promise&lt;void&gt;</code>
    * [.extract(query)](#XlsxController+extract) ⇒ <code>Promise&lt;{ records: unknown[]; sheet: string; truncated: boolean; } \| { records: unknown[]; sheet: string; truncated?: undefined; }&gt;</code>
    * [.metadata(query)](#XlsxController+metadata) ⇒ <code>Promise&lt;{ custprops: object; definedNames: { name: string; ref: string; sheet: number; }[]; props: import(&quot;xlsx&quot;).FullProperties; sheets: { autofilter: boolean; cells: number; cols: number; formulas: number; hidden: boolean; merges: number; name: string; ref: string; rows: number; types: { [k: string]: number; }; }[]; totalCells: number; }&gt;</code>

<a name="XlsxController+build"></a>

### xlsxController.build(response, body) ⇒ <code>Promise&lt;void&gt;</code>
Builds a workbook from JSON rows and cell objects.

**Kind**: instance method of [<code>XlsxController</code>](#XlsxController)  
**Returns**: <code>Promise&lt;void&gt;</code> - The workbook bytes (201).  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | Raw reply, streamed as `.xlsx`. |
| body | <code>{ sheets: { [x: string]: any; rows: (Record&lt;string, string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; }&gt; \| (string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; })[])[]; cellDates?: boolean; cols?: { [x: string]: unknown; hidden?: boolean; level?: number; wch?: number; width?: number; wpx?: number; }[]; columns?: string[]; merges?: any[]; sheetVisibility?: 0 \| 1 \| 2; }[]; workbook?: { [x: string]: unknown; Names?: { [x: string]: unknown; Name: string; Ref: string; Sheet?: number; }[]; Props?: { [x: string]: unknown; Author?: string; Category?: string; Comments?: string; Company?: string; CreatedDate?: Date; Keywords?: string; Manager?: string; ModifiedBy?: string; ModifiedDate?: Date; Subject?: string; Title?: string; }; WBProps?: { [x: string]: unknown; CodeName?: string; date1904?: boolean; filterPrivacy?: boolean; }; }; }</code> | Sheets, workbook properties, defined names. |

src: packages/backend/src/resources/xlsx/xlsx.controller.ts:49  
dist: packages/backend/dist/resources/xlsx/xlsx.controller.js:28
<a name="XlsxController+extract"></a>

### xlsxController.extract(query) ⇒ <code>Promise&lt;{ records: unknown[]; sheet: string; truncated: boolean; } \| { records: unknown[]; sheet: string; truncated?: undefined; }&gt;</code>
Extracts one sheet as typed JSON.

**Kind**: instance method of [<code>XlsxController</code>](#XlsxController)  
**Returns**: <code>Promise&lt;{ records: unknown[]; sheet: string; truncated: boolean; } \| { records: unknown[]; sheet: string; truncated?: undefined; }&gt;</code> - The records and sheet name (201).  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ [x: string]: any; maxCells: number; raw: boolean; blankrows?: boolean; skipHidden?: boolean; }</code> | Flat reader options. |

src: packages/backend/src/resources/xlsx/xlsx.controller.ts:66  
dist: packages/backend/dist/resources/xlsx/xlsx.controller.js:34
<a name="XlsxController+metadata"></a>

### xlsxController.metadata(query) ⇒ <code>Promise&lt;{ custprops: object; definedNames: { name: string; ref: string; sheet: number; }[]; props: import(&quot;xlsx&quot;).FullProperties; sheets: { autofilter: boolean; cells: number; cols: number; formulas: number; hidden: boolean; merges: number; name: string; ref: string; rows: number; types: { [k: string]: number; }; }[]; totalCells: number; }&gt;</code>
Structural workbook metadata: dims, counts, props, names, formula inventory, cell census.

**Kind**: instance method of [<code>XlsxController</code>](#XlsxController)  
**Returns**: <code>Promise&lt;{ custprops: object; definedNames: { name: string; ref: string; sheet: number; }[]; props: import(&quot;xlsx&quot;).FullProperties; sheets: { autofilter: boolean; cells: number; cols: number; formulas: number; hidden: boolean; merges: number; name: string; ref: string; rows: number; types: { [k: string]: number; }; }[]; totalCells: number; }&gt;</code> - The metadata document (201).  

| Param | Type | Description |
| --- | --- | --- |
| query | <code>{ maxCells: number; }</code> | Flat metadata options. |

src: packages/backend/src/resources/xlsx/xlsx.controller.ts:79  
dist: packages/backend/dist/resources/xlsx/xlsx.controller.js:37
