<a name="guardSignature"></a>

## guardSignature(prefix, isAllowed, message, cls, next) ⇒ <code>import(&quot;rxjs&quot;).Observable&lt;any&gt;</code>
Shared guard used by the media signature interceptors: rejects a request whose
probed signature is not a member of the expected media family.

The check is a no-op for routes whose URL does not start with `prefix`; for
matching routes with a probed signature that fails `isAllowed`, an
[UnsupportedMediaTypeException](UnsupportedMediaTypeException) carrying `message` is thrown. Routes
without a probed signature pass through untouched (the probe happens earlier).

**Kind**: global function  
**Returns**: <code>import(&quot;rxjs&quot;).Observable&lt;any&gt;</code> - The observable produced by continuing the pipeline.  
**Throws**:

- <code>UnsupportedMediaTypeException</code> When the probed signature is not allowed.


| Param | Type | Description |
| --- | --- | --- |
| prefix | <code>string</code> | Route prefix to gate (e.g. `'/audio'`). |
| isAllowed | <code>SignaturePredicate</code> | [FileTypeService](FileTypeService) predicate for the media family. |
| message | <code>string</code> | Exact error message thrown on rejection. |
| cls | <code>NormalizedClsService</code> | Normalized CLS service carrying the current request context. |
| next | <code>CallHandler&lt;any&gt;</code> | Call handler used to continue the pipeline. |

src: packages/backend/src/utils/signature-guard.ts:31  
dist: packages/backend/dist/utils/signature-guard.js:2
