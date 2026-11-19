## Functions

<dl>
<dt><a href="#bootstrap">bootstrap()</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd></dd>
<dt><a href="#fastify">fastify(instance)</a></dt>
<dd><p>Registers the media content-type parsers that accept uploads as raw streams.</p>
</dd>
<dt><a href="#swagger">swagger(app)</a></dt>
<dd></dd>
</dl>

<a name="bootstrap"></a>

## bootstrap() ⇒ <code>Promise&lt;void&gt;</code>
**Kind**: global function  
src: packages/backend/src/main.ts:43  
dist: packages/backend/dist/main.js:21
<a name="fastify"></a>

## fastify(instance)
Registers the media content-type parsers that accept uploads as raw streams.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;</code> | The Fastify instance to configure. |

src: packages/backend/src/main.ts:77  
dist: packages/backend/dist/main.js:38
<a name="swagger"></a>

## swagger(app)
**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>NestFastifyApplication&lt;import(&quot;fastify&quot;).RawServerDefault&gt;</code> | Description. |

src: packages/backend/src/main.ts:100  
dist: packages/backend/dist/main.js:48
