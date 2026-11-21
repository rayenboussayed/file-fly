## Constants

<dl>
<dt><a href="#allowedCorsHeaders">allowedCorsHeaders</a></dt>
<dd><p>Request headers a cross-origin client may send beyond the CORS-safelisted set.
The auth pair is included so a separately hosted client can pass the basic-auth
perimeter; content-type serves the JSON build routes and the file hash the
upload cache hint. The W3C trace headers keep cross-origin telemetry working
as documented in the README.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#buildCorsOptions">buildCorsOptions(origins)</a> ⇒ <code>{ allowedHeaders: any[]; credentials: boolean; exposedHeaders: unknown[]; origin: boolean | string[]; }</code></dt>
<dd><p>Builds the production CORS options.</p>
</dd>
</dl>

<a name="allowedCorsHeaders"></a>

## allowedCorsHeaders
Request headers a cross-origin client may send beyond the CORS-safelisted set.
The auth pair is included so a separately hosted client can pass the basic-auth
perimeter; content-type serves the JSON build routes and the file hash the
upload cache hint. The W3C trace headers keep cross-origin telemetry working
as documented in the README.

**Kind**: global constant  
src: packages/backend/src/cors.ts:10  
dist: packages/backend/dist/cors.js:3
<a name="buildCorsOptions"></a>

## buildCorsOptions(origins) ⇒ <code>{ allowedHeaders: any[]; credentials: boolean; exposedHeaders: unknown[]; origin: boolean \| string[]; }</code>
Builds the production CORS options.

**Kind**: global function  
**Returns**: <code>{ allowedHeaders: any[]; credentials: boolean; exposedHeaders: unknown[]; origin: boolean \| string[]; }</code> - The enableCors options object, with an explicit request-header allowlist.  

| Param | Type | Description |
| --- | --- | --- |
| origins | <code>string[]</code> | Configured CORS_ORIGIN values; undefined disables cross-origin reads. |

src: packages/backend/src/cors.ts:26  
dist: packages/backend/dist/cors.js:13
