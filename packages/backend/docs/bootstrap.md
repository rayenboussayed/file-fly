<a name="configureFastify"></a>

## configureFastify(instance) ⇒ <code>Promise&lt;void&gt;</code>
Configures the Fastify instance with everything the app needs at the HTTP
edge, shared by the production bootstrap (`main.ts`) and the e2e harness
(`test/helpers.ts`) so the two can never drift:

- the media content-type parsers that accept uploads as raw streams,
- the basic-auth perimeter (a no-op unless both credentials are configured).

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;</code> | The Fastify instance to configure. |

src: packages/backend/src/bootstrap.ts:18  
dist: packages/backend/dist/bootstrap.js:4
