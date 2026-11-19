<a name="nonDestructiveWebStream"></a>

## nonDestructiveWebStream(node) ⇒ <code>ReadableStream&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code>
Wraps a Node readable in a web stream whose `cancel` only detaches the
pump, without destroying the Node stream.

`fileTypeFromStream` cancels its web stream as soon as the signature is
known; with `Readable.toWeb` that cancel destroys the Node stream (with an
AbortError), which would kill the probe branch of the shared tee. Here the
pump stops requesting chunks and instead keeps pulling from the same
iterator, discarding everything, so the probe branch of the tee keeps
flowing and the upload is not stalled by the probe being finished.

**Kind**: global function  
**Returns**: <code>ReadableStream&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code> - A web ReadableStream serving the same bytes.  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>Readable</code> | The Node readable to wrap (e.g. a probe branch of a tee). |

src: packages/backend/src/services/file-type.service.ts:102  
dist: packages/backend/dist/services/file-type.service.js:66
<a name="nonDestructiveWebStream..drainIterator"></a>

### nonDestructiveWebStream~drainIterator() ⇒ <code>Promise&lt;number&gt;</code>
Reads the remainder of the Node stream with the same iterator, discarding
every chunk, so a paused tee unblocks.

**Kind**: inner method of [<code>nonDestructiveWebStream</code>](#nonDestructiveWebStream)  
**Returns**: <code>Promise&lt;number&gt;</code> - The number of bytes discarded.  
src: packages/backend/src/services/file-type.service.ts:111  
dist: packages/backend/dist/services/file-type.service.js:69
