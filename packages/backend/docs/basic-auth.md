## Constants

<dl>
<dt><a href="#logger">logger</a></dt>
<dd><p>Logger for the basic-auth perimeter; one boot line, never per-request.</p>
</dd>
<dt><a href="#REALM">REALM</a></dt>
<dd><p>Realm reported in the challenge emitted by the package&#39;s guard.</p>
</dd>
<dt><a href="#STANDARD_HEADER_DISABLED">STANDARD_HEADER_DISABLED</a></dt>
<dd><p>Empty header name. The guard reads <code>options.header ?? &#39;authorization&#39;</code>, so an
empty string makes it look up a header HTTP cannot carry. Standard
<code>Authorization</code> stays ignored, which preserves the x-auth contract and leaves
the <code>/metrics</code> bearer token untouched.</p>
</dd>
<dt><a href="#AUTH_CREDENTIALS">AUTH_CREDENTIALS</a></dt>
<dd><p>Credentials narrowed to required strings once the both-or-neither rule passes.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#isHealthPath">isHealthPath(url)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether the request targets the liveness probe. <code>/health</code> (with or without a
query string or trailing slash) is exempt from the perimeter so Docker
<code>HEALTHCHECK</code> and orchestrator probes keep working without credentials.</p>
</dd>
<dt><a href="#registerBasicAuth">registerBasicAuth(instance)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Installs the package-backed perimeter on the Fastify instance.</p>
<p>The guard runs in an <code>onRequest</code> hook, ahead of body parsing and Nest
interceptors, so it also covers routes Fastify registers outside Nest, such
as static dashboard assets, Swagger and unmatched URLs. <code>/health</code> stays public.
No-op (with a single boot warning) unless both credentials are configured.</p>
</dd>
<dt><a href="#createGuard">createGuard(credentials)</a> ⇒ <code>Promise&lt;import(&quot;nest-basic-auth&quot;).BasicAuthGuard&gt;</code></dt>
<dd><p>Builds the package guard from the configured pair once at boot.</p>
</dd>
<dt><a href="#hasCredentialPair">hasCredentialPair(request)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether the request supplied both x-auth headers. Used only to preserve the
exact 401 body shape for a missing pair.</p>
</dd>
<dt><a href="#isBasicAuthEnabled">isBasicAuthEnabled()</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether the perimeter is active. The environment schema enforces both-or-neither
at boot, so a configured pair is always complete.</p>
</dd>
<dt><a href="#isBasicAuthPairComplete">isBasicAuthPairComplete(username, password)</a> ⇒ <code>boolean</code></dt>
<dd><p>Pure decision for the both-or-neither rule.</p>
</dd>
<dt><a href="#readHeader">readHeader(value)</a> ⇒ <code>string</code></dt>
<dd><p>Reads a header the same way the package guard does, including its fallback to
the first value of a duplicated header.</p>
</dd>
<dt><a href="#rejectRequest">rejectRequest(reply, isMissingPair)</a> ⇒ <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code></dt>
<dd><p>Sends a 401 with the challenge set by the guard and the repo&#39;s existing body.</p>
</dd>
<dt><a href="#scrubHostAuthEnvironment">scrubHostAuthEnvironment()</a></dt>
<dd><p>Removes the host keys the package would append to explicit credentials and use
for its challenge. Pulled out of the module scope so importing this module has no
global side effects; it runs before the package is dynamically imported.</p>
</dd>
</dl>

<a name="logger"></a>

## logger
Logger for the basic-auth perimeter; one boot line, never per-request.

**Kind**: global constant  
src: packages/backend/src/basic-auth.ts:15  
dist: packages/backend/dist/basic-auth.js:6
<a name="REALM"></a>

## REALM
Realm reported in the challenge emitted by the package's guard.

**Kind**: global constant  
src: packages/backend/src/basic-auth.ts:20  
dist: packages/backend/dist/basic-auth.js:7
<a name="STANDARD_HEADER_DISABLED"></a>

## STANDARD\_HEADER\_DISABLED
Empty header name. The guard reads `options.header ?? 'authorization'`, so an
empty string makes it look up a header HTTP cannot carry. Standard
`Authorization` stays ignored, which preserves the x-auth contract and leaves
the `/metrics` bearer token untouched.

**Kind**: global constant  
src: packages/backend/src/basic-auth.ts:28  
dist: packages/backend/dist/basic-auth.js:8
<a name="AUTH_CREDENTIALS"></a>

## AUTH\_CREDENTIALS
Credentials narrowed to required strings once the both-or-neither rule passes.

**Kind**: global constant  
src: packages/backend/src/basic-auth.ts:33  
dist: packages/backend/dist/basic-auth.js:9
<a name="isHealthPath"></a>

## isHealthPath(url) ⇒ <code>boolean</code>
Whether the request targets the liveness probe. `/health` (with or without a
query string or trailing slash) is exempt from the perimeter so Docker
`HEALTHCHECK` and orchestrator probes keep working without credentials.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when the path is exactly `/health`.  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The raw request URL, if available. |

src: packages/backend/src/basic-auth.ts:48  
dist: packages/backend/dist/basic-auth.js:16
<a name="registerBasicAuth"></a>

## registerBasicAuth(instance) ⇒ <code>Promise&lt;void&gt;</code>
Installs the package-backed perimeter on the Fastify instance.

The guard runs in an `onRequest` hook, ahead of body parsing and Nest
interceptors, so it also covers routes Fastify registers outside Nest, such
as static dashboard assets, Swagger and unmatched URLs. `/health` stays public.
No-op (with a single boot warning) unless both credentials are configured.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;</code> | The Fastify instance to decorate, passed by the bootstrap. |

src: packages/backend/src/basic-auth.ts:63  
dist: packages/backend/dist/basic-auth.js:22
<a name="createGuard"></a>

## createGuard(credentials) ⇒ <code>Promise&lt;import(&quot;nest-basic-auth&quot;).BasicAuthGuard&gt;</code>
Builds the package guard from the configured pair once at boot.

**Kind**: global function  
**Returns**: <code>Promise&lt;import(&quot;nest-basic-auth&quot;).BasicAuthGuard&gt;</code> - The configured `BasicAuthGuard` instance.  

| Param | Type | Description |
| --- | --- | --- |
| credentials | <code>{ name: string; pass: string; }</code> | The validated username and password pair. |
| credentials.name |  | The configured username. |
| credentials.pass |  | The configured password. |

src: packages/backend/src/basic-auth.ts:100  
dist: packages/backend/dist/basic-auth.js:53
<a name="hasCredentialPair"></a>

## hasCredentialPair(request) ⇒ <code>boolean</code>
Whether the request supplied both x-auth headers. Used only to preserve the
exact 401 body shape for a missing pair.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when both header values are non-empty strings.  

| Param | Type | Description |
| --- | --- | --- |
| request | <code>FastifyRequest&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify/types/type-provider.js&quot;).ResolveFastifyRequestType&lt;import(&quot;fastify&quot;).FastifyTypeProviderDefault, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).RouteGenericInterface&gt;&gt;</code> | The incoming Fastify request. |

src: packages/backend/src/basic-auth.ts:119  
dist: packages/backend/dist/basic-auth.js:65
<a name="isBasicAuthEnabled"></a>

## isBasicAuthEnabled() ⇒ <code>boolean</code>
Whether the perimeter is active. The environment schema enforces both-or-neither
at boot, so a configured pair is always complete.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when `AUTH_USERNAME` and `AUTH_PASSWORD` are both set.  
src: packages/backend/src/basic-auth.ts:135  
dist: packages/backend/dist/basic-auth.js:73
<a name="isBasicAuthPairComplete"></a>

## isBasicAuthPairComplete(username, password) ⇒ <code>boolean</code>
Pure decision for the both-or-neither rule.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when both are non-empty; false when both are absent; throws otherwise.  
**Throws**:

- Error Exactly one of the two credentials is set.


| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | The configured `AUTH_USERNAME`, if any. |
| password | <code>string</code> | The configured `AUTH_PASSWORD`, if any. |

src: packages/backend/src/basic-auth.ts:146  
dist: packages/backend/dist/basic-auth.js:76
<a name="readHeader"></a>

## readHeader(value) ⇒ <code>string</code>
Reads a header the same way the package guard does, including its fallback to
the first value of a duplicated header.

**Kind**: global function  
**Returns**: <code>string</code> - A string value, or undefined when absent.  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>string \| string[]</code> | The header value from Fastify. |

src: packages/backend/src/basic-auth.ts:166  
dist: packages/backend/dist/basic-auth.js:84
<a name="rejectRequest"></a>

## rejectRequest(reply, isMissingPair) ⇒ <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code>
Sends a 401 with the challenge set by the guard and the repo's existing body.

**Kind**: global function  
**Returns**: <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> - The sent reply.  

| Param | Type | Description |
| --- | --- | --- |
| reply | <code>FastifyReply&lt;import(&quot;fastify&quot;).RouteGenericInterface, import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, unknown, import(&quot;fastify&quot;).FastifySchema, import(&quot;fastify&quot;).FastifyTypeProviderDefault, unknown&gt;</code> | The Fastify reply to complete. |
| isMissingPair | <code>boolean</code> | Whether the request had no complete x-auth pair. |

src: packages/backend/src/basic-auth.ts:176  
dist: packages/backend/dist/basic-auth.js:87
<a name="scrubHostAuthEnvironment"></a>

## scrubHostAuthEnvironment()
Removes the host keys the package would append to explicit credentials and use
for its challenge. Pulled out of the module scope so importing this module has no
global side effects; it runs before the package is dynamically imported.

**Kind**: global function  
src: packages/backend/src/basic-auth.ts:192  
dist: packages/backend/dist/basic-auth.js:97
