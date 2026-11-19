## Members

<dl>
<dt><a href="#FileTypeService">FileTypeService</a></dt>
<dd><p>File-type sniffing helpers shared by the signature gates.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#nonDestructiveWebStream">nonDestructiveWebStream(node)</a> ⇒ <code>ReadableStream&lt;Uint8Array&lt;ArrayBufferLike&gt;&gt;</code></dt>
<dd><p>Wraps a Node readable in a web stream whose <code>cancel</code> only detaches the
pump, without destroying the Node stream.</p>
<p><code>fileTypeFromStream</code> cancels its web stream as soon as the signature is
known; with <code>Readable.toWeb</code> that cancel destroys the Node stream (with an
AbortError), which would kill the probe branch of the shared tee. Here the
pump stops requesting chunks and instead keeps pulling from the same
iterator, discarding everything, so the probe branch of the tee keeps
flowing and the upload is not stalled by the probe being finished.</p>
</dd>
</dl>

<a name="FileTypeService"></a>

## FileTypeService
File-type sniffing helpers shared by the signature gates.

**Kind**: global variable  
src: packages/backend/src/services/file-type.service.ts:10  
dist: packages/backend/dist/services/file-type.service.js:14

* [FileTypeService](#FileTypeService)
    * [.isCsv(mime)](#FileTypeService+isCsv) ⇒ <code>boolean</code>
    * [.isDocument(mime)](#FileTypeService+isDocument) ⇒ <code>boolean</code>
    * [.isSpreadsheet(mime)](#FileTypeService+isSpreadsheet) ⇒ <code>boolean</code>

<a name="FileTypeService+isCsv"></a>

### fileTypeService.isCsv(mime) ⇒ <code>boolean</code>
Whether the mime is csv text. Content-level checks happen in the csv module;
file-type cannot sniff csv, so this matches on the declared mime only.

**Kind**: instance method of [<code>FileTypeService</code>](#FileTypeService)  
**Returns**: <code>boolean</code> - True for text/csv.  

| Param | Type | Description |
| --- | --- | --- |
| mime | <code>string</code> | Detected or declared content type. |

src: packages/backend/src/services/file-type.service.ts:23  
dist: packages/backend/dist/services/file-type.service.js:22
<a name="FileTypeService+isDocument"></a>

### fileTypeService.isDocument(mime) ⇒ <code>boolean</code>
Whether the mime is an office or PDF document the document pipeline accepts.

**Kind**: instance method of [<code>FileTypeService</code>](#FileTypeService)  
**Returns**: <code>boolean</code> - True for docx, pptx and pdf mimes.  

| Param | Type | Description |
| --- | --- | --- |
| mime | <code>string</code> | Detected content type (e.g. from the parser). |

src: packages/backend/src/services/file-type.service.ts:32  
dist: packages/backend/dist/services/file-type.service.js:25
<a name="FileTypeService+isSpreadsheet"></a>

### fileTypeService.isSpreadsheet(mime) ⇒ <code>boolean</code>
Whether the mime is a spreadsheet the xlsx pipeline accepts.

**Kind**: instance method of [<code>FileTypeService</code>](#FileTypeService)  
**Returns**: <code>boolean</code> - True for the OOXML spreadsheet mime.  

| Param | Type | Description |
| --- | --- | --- |
| mime | <code>string</code> | Detected content type (e.g. from the parser). |

src: packages/backend/src/services/file-type.service.ts:51  
dist: packages/backend/dist/services/file-type.service.js:35
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

src: packages/backend/src/services/file-type.service.ts:103  
dist: packages/backend/dist/services/file-type.service.js:66
<a name="nonDestructiveWebStream..drainIterator"></a>

### nonDestructiveWebStream~drainIterator() ⇒ <code>Promise&lt;number&gt;</code>
Reads the remainder of the Node stream with the same iterator, discarding
every chunk, so a paused tee unblocks.

**Kind**: inner method of [<code>nonDestructiveWebStream</code>](#nonDestructiveWebStream)  
**Returns**: <code>Promise&lt;number&gt;</code> - The number of bytes discarded.  
src: packages/backend/src/services/file-type.service.ts:112  
dist: packages/backend/dist/services/file-type.service.js:69
