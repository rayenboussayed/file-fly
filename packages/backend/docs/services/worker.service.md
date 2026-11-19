<a name="workerPath"></a>

## workerPath(filename, metaUrl) ⇒ <code>string</code>
Resolves a worker filename relative to the calling module's location.

Services pass `'./name.worker.js'` to mean "same folder"; `new Worker(path)`
would otherwise resolve it against the process cwd and fail in production.

**Kind**: global function  
**Returns**: <code>string</code> - Absolute path to the worker file.  

| Param | Type | Description |
| --- | --- | --- |
| filename | <code>string</code> | Worker filename as declared by the caller (e.g. `'./worker/index.js'`). |
| metaUrl | <code>string</code> | `import.meta.url` of the module that declared the filename. |

src: packages/backend/src/services/worker.service.ts:230  
dist: packages/backend/dist/services/worker.service.js:151
