## Members

<dl>
<dt><a href="#WorkerService">WorkerService</a></dt>
<dd><p>Spawns sibling worker threads for CPU-heavy media/document work and serves their output (with a shared stream cache).</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#WORKER_ENV_KEYS">WORKER_ENV_KEYS</a></dt>
<dd><p>Environment for spawned worker threads: only what first-party workers need
(paths, locales, log level, node/tmp dirs). Secrets such as METRICS_TOKEN,
AUTH_* or ClamAV credentials never cross into a worker.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#workerEnv">workerEnv()</a> ⇒ <code>Record&lt;string, string&gt;</code></dt>
<dd><p>Builds the worker environment from WORKER_ENV_KEYS.</p>
</dd>
<dt><a href="#workerPath">workerPath(filename, metaUrl)</a> ⇒ <code>string</code></dt>
<dd><p>Resolves a worker filename relative to the calling module&#39;s location.</p>
<p>Services pass <code>&#39;./name.worker.js&#39;</code> to mean &quot;same folder&quot;; <code>new Worker(path)</code>
would otherwise resolve it against the process cwd and fail in production.</p>
</dd>
</dl>

<a name="WorkerService"></a>

## WorkerService
Spawns sibling worker threads for CPU-heavy media/document work and serves their output (with a shared stream cache).

**Kind**: global variable  
src: packages/backend/src/services/worker.service.ts:68  
dist: packages/backend/dist/services/worker.service.js:86 (approx.)

* [WorkerService](#WorkerService)
    * [.createWorker(filename, options)](#WorkerService+createWorker) ⇒ <code>Promise&lt;Readable&gt;</code>
    * [.acquireWorkerSlot()](#WorkerService+acquireWorkerSlot) ⇒ <code>Promise&lt;void&gt;</code>
    * [.keyFor(baseKey, filename, workerData)](#WorkerService+keyFor) ⇒ <code>string</code>
    * [.persist(key, branch, succeeded)](#WorkerService+persist)
    * [.releaseWorkerSlot()](#WorkerService+releaseWorkerSlot)
    * [.touch(key)](#WorkerService+touch) ⇒ <code>Promise&lt;void&gt;</code>

<a name="WorkerService+createWorker"></a>

### workerService.createWorker(filename, options) ⇒ <code>Promise&lt;Readable&gt;</code>
Returns the processed output. Served from CACHE_DIR when possible,
otherwise produced by a worker thread (and cached while streaming).

**Kind**: instance method of [<code>WorkerService</code>](#WorkerService)  
**Returns**: <code>Promise&lt;Readable&gt;</code> - Processed output stream.  

| Param | Type | Description |
| --- | --- | --- |
| filename | <code>string</code> | Worker entry file to run in a worker thread. |
| options | <code>CreateWorkerOptions</code> | Worker and cache options. |

src: packages/backend/src/services/worker.service.ts:94  
dist: packages/backend/dist/services/worker.service.js:123 (approx.)
<a name="WorkerService+acquireWorkerSlot"></a>

### workerService.acquireWorkerSlot() ⇒ <code>Promise&lt;void&gt;</code>
Waits until a worker slot is free, then takes it.

**Kind**: instance method of [<code>WorkerService</code>](#WorkerService)  
src: packages/backend/src/services/worker.service.ts:127  
dist: packages/backend/dist/services/worker.service.js:151 (approx.)
<a name="WorkerService+keyFor"></a>

### workerService.keyFor(baseKey, filename, workerData) ⇒ <code>string</code>
Builds the cache key: parts joined with NUL so no component can smuggle separators.

**Kind**: instance method of [<code>WorkerService</code>](#WorkerService)  
**Returns**: <code>string</code> - The composite cache key.  

| Param | Type | Description |
| --- | --- | --- |
| baseKey | <code>string</code> | Deterministic base key from the request (file signature + query + hash). |
| filename | <code>string</code> | Worker entry filename mixed into the key. |
| workerData | <code>unknown</code> | Worker payload mixed into the key. |

src: packages/backend/src/services/worker.service.ts:142  
dist: packages/backend/dist/services/worker.service.js:165 (approx.)
<a name="WorkerService+persist"></a>

### workerService.persist(key, branch, succeeded)
Persists the finished branch via StreamCache (atomic tmp+rename, 0o600).
Empties are not servable: read path treats size===0 as a miss, so a 0-byte
entry is simply ignored until the janitor reaps it.
Failures never affect the client: the entry is unlinked once the worker has settled.

**Kind**: instance method of [<code>WorkerService</code>](#WorkerService)  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | Cache key. |
| branch | <code>Readable</code> | Source stream to persist. |
| succeeded | <code>Promise&lt;boolean&gt;</code> | Worker exit status. |

src: packages/backend/src/services/worker.service.ts:163  
dist: packages/backend/dist/services/worker.service.js:185 (approx.)
<a name="WorkerService+releaseWorkerSlot"></a>

### workerService.releaseWorkerSlot()
Releases a worker slot, waking one queued caller if any.

**Kind**: instance method of [<code>WorkerService</code>](#WorkerService)  
src: packages/backend/src/services/worker.service.ts:202  
dist: packages/backend/dist/services/worker.service.js:217 (approx.)
<a name="WorkerService+touch"></a>

### workerService.touch(key) ⇒ <code>Promise&lt;void&gt;</code>
Refreshes the entry's mtime so the janitor's LRU eviction keeps hot entries.

**Kind**: instance method of [<code>WorkerService</code>](#WorkerService)  

| Param | Type | Description |
| --- | --- | --- |
| key | <code>string</code> | Cache key of the entry. |

src: packages/backend/src/services/worker.service.ts:301  
dist: packages/backend/dist/services/worker.service.js:307 (approx.)
<a name="WORKER_ENV_KEYS"></a>

## WORKER\_ENV\_KEYS
Environment for spawned worker threads: only what first-party workers need
(paths, locales, log level, node/tmp dirs). Secrets such as METRICS_TOKEN,
AUTH_* or ClamAV credentials never cross into a worker.

**Kind**: global constant  
src: packages/backend/src/services/worker.service.ts:26  
dist: packages/backend/dist/services/worker.service.js:23
<a name="workerEnv"></a>

## workerEnv() ⇒ <code>Record&lt;string, string&gt;</code>
Builds the worker environment from WORKER_ENV_KEYS.

**Kind**: global function  
**Returns**: <code>Record&lt;string, string&gt;</code> - A fresh env record; FILE_FLY_WORKER is always set to '1'.  
src: packages/backend/src/services/worker.service.ts:48  
dist: packages/backend/dist/services/worker.service.js:40
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

src: packages/backend/src/services/worker.service.ts:316  
dist: packages/backend/dist/services/worker.service.js:324 (approx.)
