## Constants

<dl>
<dt><a href="#EmptyQuerySchema">EmptyQuerySchema</a></dt>
<dd><p>A query schema that accepts only an empty object and rejects any unknown key.</p>
<p>Shared by every document/model endpoint whose query string must be empty
(extract/metadata style routes). Reusing one instance keeps the strict-empty
behaviour identical across all of them.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#trimmed">trimmed(schema)</a> ⇒ <code>z.ZodPipe&lt;z.ZodString, T&gt;</code></dt>
<dd><p>Trim the input string, then validate it with the given schema.</p>
</dd>
</dl>

<a name="EmptyQuerySchema"></a>

## EmptyQuerySchema
A query schema that accepts only an empty object and rejects any unknown key.

Shared by every document/model endpoint whose query string must be empty
(extract/metadata style routes). Reusing one instance keeps the strict-empty
behaviour identical across all of them.

**Kind**: global constant  
src: packages/backend/src/utils/zod.ts:10  
dist: packages/backend/dist/utils/zod.js:2
<a name="trimmed"></a>

## trimmed(schema) ⇒ <code>z.ZodPipe&lt;z.ZodString, T&gt;</code>
Trim the input string, then validate it with the given schema.

**Kind**: global function  
**Returns**: <code>z.ZodPipe&lt;z.ZodString, T&gt;</code> - Zod pipe: string().trim() piped into `schema`.  

| Param | Type | Description |
| --- | --- | --- |
| schema | <code>T</code> | The schema to apply after trimming. |

src: packages/backend/src/utils/zod.ts:17  
dist: packages/backend/dist/utils/zod.js:3
