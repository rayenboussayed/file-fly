## Functions

<dl>
<dt><a href="#zipBytes">zipBytes(sheetData)</a> ⇒ <code>Buffer&lt;ArrayBuffer&gt;</code></dt>
<dd><p>Builds a minimal, valid .xlsx container around the given worksheet XML.</p>
</dd>
<dt><a href="#buildBytes">buildBytes(sheets)</a> ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Builds a workbook from the given sheets and returns the .xlsx bytes.</p>
</dd>
<dt><a href="#q">q(overrides)</a> ⇒ <code>{ [x: string]: any; maxCells: number; raw: boolean; blankrows?: boolean; skipHidden?: boolean; }</code></dt>
<dd><p>Query defaults with overrides, mirroring the schema&#39;s post-validation shape.</p>
</dd>
</dl>

<a name="zipBytes"></a>

## zipBytes(sheetData) ⇒ <code>Buffer&lt;ArrayBuffer&gt;</code>
Builds a minimal, valid .xlsx container around the given worksheet XML.

**Kind**: global function  
**Returns**: <code>Buffer&lt;ArrayBuffer&gt;</code> - The packaged .xlsx bytes.  

| Param | Type | Description |
| --- | --- | --- |
| sheetData | <code>string</code> | The raw XML placed inside <sheetData>. |

src: packages/backend/src/resources/xlsx/xlsx.service.spec.ts:34  
<a name="buildBytes"></a>

## buildBytes(sheets) ⇒ <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code>
Builds a workbook from the given sheets and returns the .xlsx bytes.

**Kind**: global function  
**Returns**: <code>Promise&lt;Buffer&lt;ArrayBufferLike&gt;&gt;</code> - The workbook bytes.  

| Param | Type | Description |
| --- | --- | --- |
| sheets | <code>{ [x: string]: any; rows: (Record&lt;string, string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; }&gt; \| (string \| number \| boolean \| { [x: string]: unknown; c?: { [x: string]: unknown; a: string; t: string; }[]; f?: string; l?: { [x: string]: unknown; Target?: string; Tooltip?: string; }; t?: &quot;b&quot; \| &quot;n&quot; \| &quot;s&quot; \| &quot;d&quot; \| &quot;e&quot; \| &quot;z&quot;; v?: unknown; z?: string; })[])[]; cellDates?: boolean; cols?: { [x: string]: unknown; hidden?: boolean; level?: number; wch?: number; width?: number; wpx?: number; }[]; columns?: string[]; merges?: any[]; sheetVisibility?: 0 \| 1 \| 2; }[]</code> | The sheets to build. |

src: packages/backend/src/resources/xlsx/xlsx.service.spec.ts:52  
<a name="q"></a>

## q(overrides) ⇒ <code>{ [x: string]: any; maxCells: number; raw: boolean; blankrows?: boolean; skipHidden?: boolean; }</code>
Query defaults with overrides, mirroring the schema's post-validation shape.

**Kind**: global function  
**Returns**: <code>{ [x: string]: any; maxCells: number; raw: boolean; blankrows?: boolean; skipHidden?: boolean; }</code> - A full, valid extract query.  

| Param | Type | Description |
| --- | --- | --- |
| overrides | <code>Partial&lt;{ [x: string]: any; maxCells: number; raw: boolean; blankrows?: boolean; skipHidden?: boolean; }&gt;</code> | Query fields to override over the defaults. |

src: packages/backend/src/resources/xlsx/xlsx.service.spec.ts:62  
