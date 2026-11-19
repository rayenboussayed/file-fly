<a name="openMediaSource"></a>

## openMediaSource(cls) ⇒ <code>Promise&lt;void&gt;</code>
Opens the media source for the current request: sets the source direction
(`upload` for POSTs, `download` otherwise) and the source stream on the
CLS store.

Idempotent: when a source stream is already present on the CLS store the
call is a no-op, so interceptors bound before or after each other can both
rely on it without opening the source twice. Method-less requests (e.g.
synthetic invocations) carry no media and are left untouched.

**Kind**: global function  
**Returns**: <code>Promise&lt;void&gt;</code> - Resolves once the source has been opened (or skipped).  

| Param | Type | Description |
| --- | --- | --- |
| cls | <code>NormalizedClsService</code> | The normalized CLS service carrying the current request context. |

src: packages/backend/src/utils/open-source.ts:20  
dist: packages/backend/dist/utils/open-source.js:4
