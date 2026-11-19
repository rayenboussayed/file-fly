## Classes

<dl>
<dt><a href="#ByteCapTransform">ByteCapTransform</a></dt>
<dd><p>Streams bytes through while counting them; self-destructs with a
<code>PayloadTooLargeException</code> once the running total exceeds <code>maxBytes</code>.</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#FORWARDABLE_HEADERS">FORWARDABLE_HEADERS</a></dt>
<dd><p>Headers safe to forward to the remote origin; everything else is dropped.</p>
</dd>
<dt><a href="#REFUSED_HOSTNAMES">REFUSED_HOSTNAMES</a></dt>
<dd><p>Hostnames always refused, regardless of EGRESS_ALLOWLIST.</p>
</dd>
<dt><a href="#EGRESS_ALLOWLIST">EGRESS_ALLOWLIST</a></dt>
<dd><p>Hostnames from EGRESS_ALLOWLIST, lowercased; empty = allowlist inactive.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#ipv4Octets">ipv4Octets(host)</a> ⇒ <code>[number, number, number, number]</code></dt>
<dd><p>Parses a bare IPv4 literal into its octets, or undefined for anything else.</p>
</dd>
<dt><a href="#isPrivateIpv4">isPrivateIpv4(octets)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether an IPv4 literal sits in a loopback, private, link-local or CGNAT range.</p>
</dd>
<dt><a href="#isPrivateIpv6">isPrivateIpv6(host)</a> ⇒ <code>boolean</code></dt>
<dd><p>Whether a bare IPv6 literal (already bracket-stripped) sits in ::1/::/fc00::/7/fe80::/10.</p>
</dd>
<dt><a href="#assertEgressAllowed">assertEgressAllowed(url)</a></dt>
<dd><p>Enforces the egress rules for a user-supplied source URL:
scheme allowlist (http/https only), private/loopback-literal denial, and
the optional <code>EGRESS_ALLOWLIST</code> (exact host or dotted suffix).</p>
<p>Note: DNS resolution is not interposed, so a public hostname that resolves
to a private address is out of scope; <code>EGRESS_ALLOWLIST</code> is the control for
such deployments.</p>
</dd>
<dt><a href="#openMediaSource">openMediaSource(cls)</a> ⇒ <code>Promise&lt;void&gt;</code></dt>
<dd><p>Opens the media source for the current request: sets the source direction
(<code>upload</code> for POSTs, <code>download</code> otherwise) and the source stream on the
CLS store.</p>
<p>Idempotent: when a source stream is already present on the CLS store the
call is a no-op, so interceptors bound before or after each other can both
rely on it without opening the source twice. Method-less requests (e.g.
synthetic invocations) carry no media and are left untouched.</p>
<p>Egress (GET): the URL scheme is limited to http/https and loopback, private,
link-local and CGNAT literals are refused; <code>EGRESS_ALLOWLIST</code> can further
restrict the fetchable hosts (comma-separated bare hosts, dotted suffixes
allowed). Only <code>accept</code>, <code>accept-language</code> and <code>user-agent</code> are forwarded —
client credentials (authorization, cookie, x-*, ...) are never sent to the
remote origin.</p>
<p>Size cap: both paths are bounded by <code>CLAMAV_MAX_BYTES</code> independently of
whether virus scanning is enabled — a declared <code>content-length</code> over the cap
is rejected 413 before any byte flows, and a byte-counting transform
self-destructs past the cap for unsized uploads and chunked downloads.</p>
</dd>
</dl>

<a name="ByteCapTransform"></a>

## ByteCapTransform
Streams bytes through while counting them; self-destructs with a
`PayloadTooLargeException` once the running total exceeds `maxBytes`.

**Kind**: global class  
src: packages/backend/src/utils/open-source.ts:115  
dist: packages/backend/dist/utils/open-source.js:61
<a name="new_ByteCapTransform_new"></a>

### new ByteCapTransform(maxBytes)

| Param | Type | Description |
| --- | --- | --- |
| maxBytes | <code>number</code> | Maximum bytes to accept before destroying the stream. |

<a name="FORWARDABLE_HEADERS"></a>

## FORWARDABLE\_HEADERS
Headers safe to forward to the remote origin; everything else is dropped.

**Kind**: global constant  
src: packages/backend/src/utils/open-source.ts:12  
dist: packages/backend/dist/utils/open-source.js:7
<a name="REFUSED_HOSTNAMES"></a>

## REFUSED\_HOSTNAMES
Hostnames always refused, regardless of EGRESS_ALLOWLIST.

**Kind**: global constant  
src: packages/backend/src/utils/open-source.ts:15  
dist: packages/backend/dist/utils/open-source.js:8
<a name="EGRESS_ALLOWLIST"></a>

## EGRESS\_ALLOWLIST
Hostnames from EGRESS_ALLOWLIST, lowercased; empty = allowlist inactive.

**Kind**: global constant  
src: packages/backend/src/utils/open-source.ts:57  
dist: packages/backend/dist/utils/open-source.js:28
<a name="ipv4Octets"></a>

## ipv4Octets(host) ⇒ <code>[number, number, number, number]</code>
Parses a bare IPv4 literal into its octets, or undefined for anything else.

**Kind**: global function  
**Returns**: <code>[number, number, number, number]</code> - The four octets, or undefined when not an IPv4 literal.  

| Param | Type | Description |
| --- | --- | --- |
| host | <code>string</code> | Lowercased bare host (no brackets). |

src: packages/backend/src/utils/open-source.ts:22  
dist: packages/backend/dist/utils/open-source.js:9
<a name="isPrivateIpv4"></a>

## isPrivateIpv4(octets) ⇒ <code>boolean</code>
Whether an IPv4 literal sits in a loopback, private, link-local or CGNAT range.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when the literal must not be fetched.  

| Param | Type | Description |
| --- | --- | --- |
| octets | <code>[number, number, number, number]</code> | The four octets of the literal. |

src: packages/backend/src/utils/open-source.ts:34  
dist: packages/backend/dist/utils/open-source.js:16
<a name="isPrivateIpv6"></a>

## isPrivateIpv6(host) ⇒ <code>boolean</code>
Whether a bare IPv6 literal (already bracket-stripped) sits in ::1/::/fc00::/7/fe80::/10.

**Kind**: global function  
**Returns**: <code>boolean</code> - True when the literal must not be fetched.  

| Param | Type | Description |
| --- | --- | --- |
| host | <code>string</code> | Lowercased bare host without brackets. |

src: packages/backend/src/utils/open-source.ts:53  
dist: packages/backend/dist/utils/open-source.js:27
<a name="assertEgressAllowed"></a>

## assertEgressAllowed(url)
Enforces the egress rules for a user-supplied source URL:
scheme allowlist (http/https only), private/loopback-literal denial, and
the optional `EGRESS_ALLOWLIST` (exact host or dotted suffix).

Note: DNS resolution is not interposed, so a public hostname that resolves
to a private address is out of scope; `EGRESS_ALLOWLIST` is the control for
such deployments.

**Kind**: global function  
**Throws**:

- BadRequestException When the URL fails the egress rules.


| Param | Type | Description |
| --- | --- | --- |
| url | <code>URL</code> | The parsed source URL. |

src: packages/backend/src/utils/open-source.ts:72  
dist: packages/backend/dist/utils/open-source.js:29
<a name="openMediaSource"></a>

## openMediaSource(cls) ⇒ <code>Promise&lt;void&gt;</code>
Opens the media source for the current request: sets the source direction
(`upload` for POSTs, `download` otherwise) and the source stream on the
CLS store.

Idempotent: when a source stream is already present on the CLS store the
call is a no-op, so interceptors bound before or after each other can both
rely on it without opening the source twice. Method-less requests (e.g.
synthetic invocations) carry no media and are left untouched.

Egress (GET): the URL scheme is limited to http/https and loopback, private,
link-local and CGNAT literals are refused; `EGRESS_ALLOWLIST` can further
restrict the fetchable hosts (comma-separated bare hosts, dotted suffixes
allowed). Only `accept`, `accept-language` and `user-agent` are forwarded —
client credentials (authorization, cookie, x-*, ...) are never sent to the
remote origin.

Size cap: both paths are bounded by `CLAMAV_MAX_BYTES` independently of
whether virus scanning is enabled — a declared `content-length` over the cap
is rejected 413 before any byte flows, and a byte-counting transform
self-destructs past the cap for unsized uploads and chunked downloads.

**Kind**: global function  
**Returns**: <code>Promise&lt;void&gt;</code> - Resolves once the source has been opened (or skipped).  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | The normalized CLS service carrying the current request context. |

src: packages/backend/src/utils/open-source.ts:159  
dist: packages/backend/dist/utils/open-source.js:77
