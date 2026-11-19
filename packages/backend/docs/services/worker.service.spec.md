## Functions

<dl>
<dt><a href="#binPath">binPath(keyParts)</a> ⇒ <code>string</code></dt>
<dd><p>Bin entry path for the given key parts, mirroring the service&#39;s <code>keyFor</code>
and StreamCache&#39;s internal sha256 naming.</p>
</dd>
<dt><a href="#drainToString">drainToString(stream)</a> ⇒ <code>Promise&lt;string&gt;</code></dt>
<dd><p>Reads a stream to EOF and returns its decoded contents.</p>
</dd>
</dl>

<a name="binPath"></a>

## binPath(keyParts) ⇒ <code>string</code>
Bin entry path for the given key parts, mirroring the service's `keyFor`
and StreamCache's internal sha256 naming.

**Kind**: global function  
**Returns**: <code>string</code> - The absolute cache file path for those key parts.  

| Param | Type | Description |
| --- | --- | --- |
| keyParts | <code>readonly string[]</code> | Key parts to join with NUL and hash, as the service's `keyFor` would. |

src: packages/backend/src/services/worker.service.spec.ts:16  
<a name="drainToString"></a>

## drainToString(stream) ⇒ <code>Promise&lt;string&gt;</code>
Reads a stream to EOF and returns its decoded contents.

**Kind**: global function  
**Returns**: <code>Promise&lt;string&gt;</code> - The decoded stream contents.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | The stream to consume. |

src: packages/backend/src/services/worker.service.spec.ts:24  
