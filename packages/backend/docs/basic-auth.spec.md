## Functions

<dl>
<dt><a href="#boot">boot(module_)</a> ⇒ <code>Promise&lt;import(&quot;fastify&quot;).FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage &amp; { originalUrl?: string; }, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;&gt;</code></dt>
<dd><p>Creates a Fastify instance with the perimeter installed and two probe routes.</p>
</dd>
<dt><a href="#loadEnabled">loadEnabled()</a> ⇒ <code>Promise&lt;typeof import(&quot;./basic-auth.js&quot;)&gt;</code></dt>
<dd><p>Loads the adapter after stubbing both-or-neither credentials.</p>
</dd>
<dt><a href="#rejectWithChallenge">rejectWithChallenge()</a></dt>
<dd><p>Makes the mocked guard reject with the package&#39;s challenge.</p>
</dd>
</dl>

<a name="boot"></a>

## boot(module_) ⇒ <code>Promise&lt;import(&quot;fastify&quot;).FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage &amp; { originalUrl?: string; }, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;&gt;</code>
Creates a Fastify instance with the perimeter installed and two probe routes.

**Kind**: global function  
**Returns**: <code>Promise&lt;import(&quot;fastify&quot;).FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage &amp; { originalUrl?: string; }, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;&gt;</code> - The Fastify instance from the Nest adapter.  

| Param | Type | Description |
| --- | --- | --- |
| module_ | <code>typeof import(&quot;./basic-auth.js&quot;)</code> | The freshly imported adapter module. |

src: packages/backend/src/basic-auth.spec.ts:27  
<a name="loadEnabled"></a>

## loadEnabled() ⇒ <code>Promise&lt;typeof import(&quot;./basic-auth.js&quot;)&gt;</code>
Loads the adapter after stubbing both-or-neither credentials.

**Kind**: global function  
**Returns**: <code>Promise&lt;typeof import(&quot;./basic-auth.js&quot;)&gt;</code> - The freshly imported adapter module.  
src: packages/backend/src/basic-auth.spec.ts:39  
<a name="rejectWithChallenge"></a>

## rejectWithChallenge()
Makes the mocked guard reject with the package's challenge.

**Kind**: global function  
src: packages/backend/src/basic-auth.spec.ts:49  
