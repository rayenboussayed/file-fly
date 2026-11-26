## Functions

<dl>
<dt><a href="#headerValue">headerValue(headers, name)</a> ⇒ <code>string | string[]</code></dt>
<dd><p>Reads a named header without indexing the headers object with a variable key.</p>
</dd>
<dt><a href="#requestMime">requestMime(cls)</a> ⇒ <code>string</code></dt>
<dd><p>Reads the current request&#39;s media type without parameters.</p>
<p>Returns <code>&#39;&#39;</code> when the request or the header is absent. The header is split
before <code>;</code> and trimmed, matching the expression each document service used
before this helper existed. It stays a pure function over the normalized CLS
context so specs that stub only <code>request()</code> keep working.</p>
</dd>
</dl>

<a name="headerValue"></a>

## headerValue(headers, name) ⇒ <code>string \| string[]</code>
Reads a named header without indexing the headers object with a variable key.

**Kind**: global function  
**Returns**: <code>string \| string[]</code> - The header value, or undefined when absent.  

| Param | Type | Description |
| --- | --- | --- |
| headers | <code>Record&lt;string, string \| string[]&gt;</code> | The request headers. |
| name | <code>string</code> | The header name to look up. |

src: packages/backend/src/utils/http.ts:9  
dist: packages/backend/dist/utils/http.js:1
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

src: packages/backend/src/utils/http.ts:26  
dist: packages/backend/dist/utils/http.js:4
