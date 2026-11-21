## Functions

<dl>
<dt><a href="#bootstrap">bootstrap()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Boots the Nest application: OpenTelemetry first (when configured), then pino logging, metrics shutdown hooks, CORS/security headers in production, Swagger, and the listener.</p>
</dd>
<dt><a href="#swagger">swagger(app)</a></dt>
<dd><p>Mounts Swagger/OpenAPI docs at <code>/api</code> with a zod-to-OpenAPI schema converter.</p>
</dd>
</dl>

<a name="bootstrap"></a>

## bootstrap() ⇒ <code>Promise&lt;void&gt;</code>
Boots the Nest application: OpenTelemetry first (when configured), then pino logging, metrics shutdown hooks, CORS/security headers in production, Swagger, and the listener.

**Kind**: global function  
src: packages/backend/src/main.ts:37  
dist: packages/backend/dist/main.js:21
<a name="swagger"></a>

## swagger(app)
Mounts Swagger/OpenAPI docs at `/api` with a zod-to-OpenAPI schema converter.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>NestFastifyApplication&lt;import(&quot;fastify&quot;).RawServerDefault&gt;</code> | The Nest application instance. |

src: packages/backend/src/main.ts:76  
dist: packages/backend/dist/main.js:38
