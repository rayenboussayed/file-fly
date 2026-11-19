<a name="trimmed"></a>

## trimmed(schema) ⇒ <code>z.ZodPipe&lt;z.ZodString, T&gt;</code>
Trim the input string, then validate it with the given schema.

**Kind**: global function  
**Returns**: <code>z.ZodPipe&lt;z.ZodString, T&gt;</code> - Zod pipe: string().trim() piped into `schema`.  

| Param | Type | Description |
| --- | --- | --- |
| schema | <code>T</code> | The schema to apply after trimming. |

src: packages/backend/src/utils/zod.ts:8  
dist: packages/backend/dist/utils/zod.js:2
