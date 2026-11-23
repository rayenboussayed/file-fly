<a name="requestMime"></a>

## requestMime(cls) ⇒ <code>string</code>
Reads the current request's media type without parameters.

Returns `''` when the request or the header is absent. The header is split
before `;` and trimmed, matching the expression each document service used
before this helper existed. It stays a pure function over the normalized CLS
context so specs that stub only `request()` keep working.

**Kind**: global function  
**Returns**: <code>string</code> - The media type without parameters, or `''` when missing.  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | Normalized request context carrying the current request. |

src: packages/backend/src/utils/http.ts:13  
dist: packages/backend/dist/utils/http.js:1
