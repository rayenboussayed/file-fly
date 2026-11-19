## Constants

<dl>
<dt><a href="#NULL_TAG">NULL_TAG</a></dt>
<dd><p>Tag the service mixes into the key when workerData carries no operation/inputFormat.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#drainToString">drainToString(stream)</a> ⇒ <code>Promise&lt;string&gt;</code></dt>
<dd><p>Reads a stream to EOF and returns its decoded contents.</p>
</dd>
</dl>

<a name="NULL_TAG"></a>

## NULL\_TAG
Tag the service mixes into the key when workerData carries no operation/inputFormat.

**Kind**: global constant  
src: packages/backend/src/services/worker.service.spec.ts:17  
<a name="drainToString"></a>

## drainToString(stream) ⇒ <code>Promise&lt;string&gt;</code>
Reads a stream to EOF and returns its decoded contents.

**Kind**: global function  
**Returns**: <code>Promise&lt;string&gt;</code> - The decoded stream contents.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Readable</code> | The stream to consume. |

src: packages/backend/src/services/worker.service.spec.ts:27  
