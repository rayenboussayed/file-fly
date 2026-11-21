## Constants

<dl>
<dt><a href="#logger">logger</a></dt>
<dd><p>Logger for the basic-auth perimeter; one boot line, never per-request.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#basicAuthEnabled">basicAuthEnabled()</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether the perimeter is active. Implemented by both-or-neither: the
environment schema enforces pair-ness at boot; this pure helper mirrors it
(and throws on a half-configured pair) so it can be unit-tested in isolation.</p>
</dd>
<dt><a href="#isHealthPath">isHealthPath(url)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether the request targets the liveness probe. <code>/health</code> (with or without a
query string or trailing slash) is exempt from the perimeter so Docker
<code>HEALTHCHECK</code> and orchestrator probes keep working without credentials.</p>
</dd>
<dt><a href="#registerBasicAuth">registerBasicAuth(instance)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Installs the basic-auth perimeter on the Fastify instance.</p>
<p>Every route except <code>/health</code> requires the <code>x-auth-username</code> and
<code>x-auth-password</code> headers, re-sent on every request. <code>@fastify/basic-auth</code>
performs parsing and the 401; a <code>validate</code> closure enforces the configured
pair in constant time. A client-sent <code>Authorization</code> header is never
honored — a shim rewrites the x-auth pair into <code>Authorization</code> for the
plugin (or removes an attacker&#39;s own <code>Authorization</code>), so the x-auth pair is
the only credential transport.</p>
<p>No-op (with a single boot warning) unless both <code>AUTH_USERNAME</code> and
<code>AUTH_PASSWORD</code> are set.</p>
</dd>
<dt><a href="#resolveBasicAuthEnabled">resolveBasicAuthEnabled(username, password)</a> ⇒ <code>boolean</code></dt>
<dd><p>Pure decision for the both-or-neither rule.</p>
</dd>
<dt><a href="#synthAuthorizationHeader">synthAuthorizationHeader(username, password)</a> ⇒ <code>string</code></dt>
<dd><p>Builds the <code>Authorization</code> header value for the plugin from the custom
<code>x-auth-*</code> pair, or <code>undefined</code> when the pair is incomplete.</p>
</dd>
<dt><a href="#credentialsMatch">credentialsMatch(provided, expected)</a> ⇒ <code>boolean</code></dt>
<dd><p>Compares two credential strings in constant time (via SHA-256 digests of equal length).</p>
</dd>
</dl>

<a name="logger"></a>

## logger
Logger for the basic-auth perimeter; one boot line, never per-request.

**Kind**: global constant  
src: packages/backend/src/basic-auth.ts:11  
dist: packages/backend/dist/basic-auth.js:5
<a name="basicAuthEnabled"></a>

## basicAuthEnabled() ⇒ <code>boolean</code>
Whether the perimeter is active. Implemented by both-or-neither: the
environment schema enforces pair-ness at boot; this pure helper mirrors it
(and throws on a half-configured pair) so it can be unit-tested in isolation.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when `AUTH_USERNAME` and `AUTH_PASSWORD` are both non-empty.  
src: packages/backend/src/basic-auth.ts:19  
dist: packages/backend/dist/basic-auth.js:6
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

src: packages/backend/src/basic-auth.ts:30  
dist: packages/backend/dist/basic-auth.js:9
<a name="registerBasicAuth"></a>

## registerBasicAuth(instance) ⇒ <code>Promise&lt;void&gt;</code>
Installs the basic-auth perimeter on the Fastify instance.

Every route except `/health` requires the `x-auth-username` and
`x-auth-password` headers, re-sent on every request. `@fastify/basic-auth`
performs parsing and the 401; a `validate` closure enforces the configured
pair in constant time. A client-sent `Authorization` header is never
honored — a shim rewrites the x-auth pair into `Authorization` for the
plugin (or removes an attacker's own `Authorization`), so the x-auth pair is
the only credential transport.

No-op (with a single boot warning) unless both `AUTH_USERNAME` and
`AUTH_PASSWORD` are set.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| instance | <code>FastifyInstance&lt;import(&quot;fastify&quot;).RawServerDefault, import(&quot;http&quot;).IncomingMessage, import(&quot;http&quot;).ServerResponse&lt;import(&quot;http&quot;).IncomingMessage&gt;, import(&quot;fastify&quot;).FastifyBaseLogger, import(&quot;fastify&quot;).FastifyTypeProviderDefault&gt;</code> | The Fastify instance to decorate, passed by the bootstrap. |

src: packages/backend/src/basic-auth.ts:51  
dist: packages/backend/dist/basic-auth.js:15
<a name="resolveBasicAuthEnabled"></a>

## resolveBasicAuthEnabled(username, password) ⇒ <code>boolean</code>
Pure decision for the both-or-neither rule.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when both are non-empty; false when both are absent; throws otherwise.  
**Throws**:

- Error Exactly one of the two credentials is set.


| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | The configured `AUTH_USERNAME`, if any. |
| password | <code>string</code> | The configured `AUTH_PASSWORD`, if any. |

src: packages/backend/src/basic-auth.ts:110  
dist: packages/backend/dist/basic-auth.js:49
<a name="synthAuthorizationHeader"></a>

## synthAuthorizationHeader(username, password) ⇒ <code>string</code>
Builds the `Authorization` header value for the plugin from the custom
`x-auth-*` pair, or `undefined` when the pair is incomplete.

**Kind**: global function  
**Returns**: <code>string</code> - A `Basic <base64(user:pass)>` header value, or undefined.  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | The `x-auth-username` header value, if any. |
| password | <code>string</code> | The `x-auth-password` header value, if any. |

src: packages/backend/src/basic-auth.ts:131  
dist: packages/backend/dist/basic-auth.js:57
<a name="credentialsMatch"></a>

## credentialsMatch(provided, expected) ⇒ <code>boolean</code>
Compares two credential strings in constant time (via SHA-256 digests of equal length).

**Kind**: global function  
**Returns**: <code>boolean</code> - True when both digests match exactly.  

| Param | Type | Description |
| --- | --- | --- |
| provided | <code>string</code> | The credential supplied by the client. |
| expected | <code>string</code> | The configured credential. |

src: packages/backend/src/basic-auth.ts:153  
dist: packages/backend/dist/basic-auth.js:67
