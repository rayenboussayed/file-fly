## Classes

<dl>
<dt><a href="#ApiError">ApiError</a></dt>
<dd><p>Error carrying the HTTP status returned by the backend.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#metricsToken">metricsToken()</a> ⇒ <code>string</code></dt>
<dd><p>Reads the session token, when one was stored for this tab.</p>
</dd>
<dt><a href="#setMetricsToken">setMetricsToken(token)</a></dt>
<dd><p>Stores or clears the session token.</p>
</dd>
<dt><a href="#fetchMetrics">fetchMetrics()</a> ⇒ <code>Promise&lt;MetricsSnapshot&gt;</code></dt>
<dd><p>Fetches the current metrics snapshot.</p>
<p>The dashboard polls, so there is deliberately no retry wrapper: the next
poll is the retry. Failures surface as <code>ApiError</code> for 401/503 and render
the token gate / disabled banner.</p>
</dd>
</dl>

<a name="ApiError"></a>

## ApiError
Error carrying the HTTP status returned by the backend.

**Kind**: global class  
src: packages/dashboard/src/lib/api.ts:70  

* [ApiError](#ApiError)
    * [new ApiError(status)](#new_ApiError_new)
    * [.status](#ApiError+status)

<a name="new_ApiError_new"></a>

### new ApiError(status)
Creates an ApiError.


| Param | Type | Description |
| --- | --- | --- |
| status | <code>number</code> | HTTP status code returned by the server. |

<a name="ApiError+status"></a>

### apiError.status
HTTP status code returned by the server.

**Kind**: instance property of [<code>ApiError</code>](#ApiError)  
src: packages/dashboard/src/lib/api.ts:72  
<a name="metricsToken"></a>

## metricsToken() ⇒ <code>string</code>
Reads the session token, when one was stored for this tab.

**Kind**: global function  
**Returns**: <code>string</code> - The stored token, or undefined.  
src: packages/dashboard/src/lib/api.ts:92  
<a name="setMetricsToken"></a>

## setMetricsToken(token)
Stores or clears the session token.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| token | <code>string</code> | Token to store, or undefined/empty to clear it. |

src: packages/dashboard/src/lib/api.ts:100  
<a name="fetchMetrics"></a>

## fetchMetrics() ⇒ <code>Promise&lt;MetricsSnapshot&gt;</code>
Fetches the current metrics snapshot.

The dashboard polls, so there is deliberately no retry wrapper: the next
poll is the retry. Failures surface as `ApiError` for 401/503 and render
the token gate / disabled banner.

**Kind**: global function  
**Returns**: <code>Promise&lt;MetricsSnapshot&gt;</code> - The aggregated metrics snapshot.  
**Throws**:

- ApiError When the backend answers with a non-2xx status.

src: packages/dashboard/src/lib/api.ts:128  
