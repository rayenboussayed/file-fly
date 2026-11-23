<a name="requestContentType"></a>

## requestContentType(cls) ⇒ <code>string</code>
Reads the current request's `content-type` header as a string.

Returns `''` when the request or the header is absent, mirroring
`String(cls.request()?.headers?.['content-type'] ?? '')`. Kept as a pure
function over the normalized CLS context so specs that stub only `request()`
keep working without changes (no method is added to
[NormalizedClsService](NormalizedClsService)).

**Kind**: global function  
**Returns**: <code>string</code> - The raw content-type header value, or `''` when missing.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context carrying the current request. |

src: packages/backend/src/utils/http.ts:14  
dist: packages/backend/dist/utils/http.js:1
