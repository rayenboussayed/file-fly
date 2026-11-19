## Functions

<dl>
<dt><a href="#bootstrap">bootstrap()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Boots the Nest application: pino logging, metrics shutdown hooks, CORS/security headers in production, Swagger, and the listener.</p>
</dd>
<dt><a href="#fastify">fastify(instance)</a></dt>
<dd><p>Registers the media content-type parsers that accept uploads as raw streams.</p>
</dd>
<dt><a href="#swagger">swagger(app)</a></dt>
<dd><p>Mounts Swagger/OpenAPI docs at <code>/api</code> with a zod-to-OpenAPI schema converter.</p>
</dd>
</dl>

<a name="bootstrap"></a>

## bootstrap() ⇒ <code>Promise&lt;void&gt;</code>
Boots the Nest application: pino logging, metrics shutdown hooks, CORS/security headers in production, Swagger, and the listener.

**Kind**: global function  
src: packages/backend/src/main.ts:41  
dist: packages/backend/dist/main.js:21
<a name="fastify"></a>

## fastify(instance)
Registers the media content-type parsers that accept uploads as raw streams.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;</code> | The Fastify instance to configure. |

src: packages/backend/src/main.ts:76  
dist: packages/backend/dist/main.js:38
<a name="swagger"></a>

## swagger(app)
Mounts Swagger/OpenAPI docs at `/api` with a zod-to-OpenAPI schema converter.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>NestFastifyApplication&lt;import(&quot;fastify&quot;).RawServerDefault&gt;</code> | The Nest application instance. |

src: packages/backend/src/main.ts:99  
dist: packages/backend/dist/main.js:48
