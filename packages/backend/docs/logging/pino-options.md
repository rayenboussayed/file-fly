## Constants

<dl>
<dt><a href="#redactPaths">redactPaths</a></dt>
<dd><p>Paths censored from any nested request/response object pino sees.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#stripQuery">stripQuery(url)</a> ⇒ <code>string</code></dt>
<dd><p>Removes the query string from a URL.
Media <code>source</code> parameters may embed signed remote URLs, so the query must never reach the logs.</p>
</dd>
<dt><a href="#serializeRequest">serializeRequest(request)</a> ⇒ <code>{ id: string | number; method: string; url: string; }</code></dt>
<dd><p>Request serializer: id, method and path only. Headers and query strings are dropped by design.</p>
</dd>
<dt><a href="#serializeResponse">serializeResponse(response)</a> ⇒ <code>{ statusCode: number; }</code></dt>
<dd><p>Response serializer: status code only.</p>
</dd>
<dt><a href="#buildPinoHttpOptions">buildPinoHttpOptions(environment)</a> ⇒ <code>PinoHttpOptions&lt;IncomingMessage, ServerResponse&lt;IncomingMessage&gt;, never&gt;</code></dt>
<dd><p>Builds the pino-http options used by nestjs-pino. Adds request auto-logging
(excluding <code>/health</code>) and pretty output in development.</p>
</dd>
<dt><a href="#buildPinoOptions">buildPinoOptions(environment)</a> ⇒ <code>LoggerOptions&lt;never, boolean&gt;</code></dt>
<dd><p>Builds the base pino options shared by the bootstrap logger and the request logger.</p>
</dd>
</dl>

<a name="redactPaths"></a>

## redactPaths
Paths censored from any nested request/response object pino sees.

**Kind**: global constant  
src: packages/backend/src/logging/pino-options.ts:40  
dist: packages/backend/dist/logging/pino-options.js:9
<a name="stripQuery"></a>

## stripQuery(url) ⇒ <code>string</code>
Removes the query string from a URL.
Media `source` parameters may embed signed remote URLs, so the query must never reach the logs.

**Kind**: global function  
**Returns**: <code>string</code> - The path portion, or `undefined` when the URL was missing.  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The raw request URL. |

src: packages/backend/src/logging/pino-options.ts:29  
dist: packages/backend/dist/logging/pino-options.js:2
<a name="serializeRequest"></a>

## serializeRequest(request) ⇒ <code>{ id: string \| number; method: string; url: string; }</code>
Request serializer: id, method and path only. Headers and query strings are dropped by design.

**Kind**: global function  
**Returns**: <code>{ id: string \| number; method: string; url: string; }</code> - A minimal log object with id, method and path only.  

| Param | Type | Description |
| --- | --- | --- |
| request | <code>IncomingMessage &amp; { id?: number \| string; }</code> | The raw Node request. |

src: packages/backend/src/logging/pino-options.ts:53  
dist: packages/backend/dist/logging/pino-options.js:16
<a name="serializeResponse"></a>

## serializeResponse(response) ⇒ <code>{ statusCode: number; }</code>
Response serializer: status code only.

**Kind**: global function  
**Returns**: <code>{ statusCode: number; }</code> - A minimal log object with the status code only.  

| Param | Type | Description |
| --- | --- | --- |
| response | <code>ServerResponse&lt;IncomingMessage&gt;</code> | The raw Node response. |

src: packages/backend/src/logging/pino-options.ts:66  
dist: packages/backend/dist/logging/pino-options.js:21
<a name="buildPinoHttpOptions"></a>

## buildPinoHttpOptions(environment) ⇒ <code>PinoHttpOptions&lt;IncomingMessage, ServerResponse&lt;IncomingMessage&gt;, never&gt;</code>
Builds the pino-http options used by nestjs-pino. Adds request auto-logging
(excluding `/health`) and pretty output in development.

**Kind**: global function  
**Returns**: <code>PinoHttpOptions&lt;IncomingMessage, ServerResponse&lt;IncomingMessage&gt;, never&gt;</code> - Options passed to `LoggerModule.forRoot()` as `pinoHttp`.  

| Param | Type | Description |
| --- | --- | --- |
| environment | <code>PinoEnvironment</code> | Runtime inputs; see [PinoEnvironment](PinoEnvironment). |

src: packages/backend/src/logging/pino-options.ts:79  
dist: packages/backend/dist/logging/pino-options.js:25
<a name="buildPinoOptions"></a>

## buildPinoOptions(environment) ⇒ <code>LoggerOptions&lt;never, boolean&gt;</code>
Builds the base pino options shared by the bootstrap logger and the request logger.

**Kind**: global function  
**Returns**: <code>LoggerOptions&lt;never, boolean&gt;</code> - Options passed straight to `pino()`.  

| Param | Type | Description |
| --- | --- | --- |
| environment | <code>PinoEnvironment</code> | Runtime inputs; see [PinoEnvironment](PinoEnvironment). |

src: packages/backend/src/logging/pino-options.ts:95  
dist: packages/backend/dist/logging/pino-options.js:33
